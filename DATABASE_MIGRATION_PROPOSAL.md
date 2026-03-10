# Database Migration Proposal
## FieldSync QA Operations & Analytics Platform

**Status:** Draft
**Scope:** Survey, Site Visit, Site, Scans tables
**Purpose:** Support QA workflow tracking, assignment paper trail, analytics surfacing, and site compliance status

---

## ClickUp Integration Architecture

### Decision

Assignment, due dates, and status will be tracked in **both ClickUp and the FieldSync database**. The database is the analytics source of truth — all Claude/MCP queries run against it. ClickUp is the workflow source of truth — field technicians continue using it without disruption.

The DB columns added by this migration are not redundant with ClickUp. They are a **synchronized cache** that makes the data queryable, reportable, and available independently of ClickUp uptime.

---

### How ClickUp Tasks Are Created (Survey Submission Flow)

Understanding the normal task-creation path is essential for the sync architecture:

**Normal path — Power Automate:**
1. A survey is submitted in FieldSync
2. Power Automate detects the submission event and automatically creates a corresponding task in the designated ClickUp list
3. The task lands in ClickUp at roughly the same time the survey row is created in the DB
4. `clickup_task_id` must be populated by storing the ClickUp task ID returned from this Power Automate flow back into the DB survey row

**Exception — Guy Facilities surveys:**
- Power Automate does not have access to Guy Facilities survey submissions
- ClickUp tasks for these surveys are created **manually** by team members
- The timing of task creation relative to the DB row is variable — the task may exist before the DB row is linked to it, or the DB row may exist for a period with `clickup_task_id IS NULL`

**Both paths result in:** a ClickUp task and a DB survey row that need to be linked via `clickup_task_id`. The mechanism differs, the outcome is the same.

**Implication for `clickup_task_id` population:**
- For Power Automate surveys: the Power Automate flow should write the ClickUp task ID back to the DB survey row immediately on task creation. This gives full sync coverage from day one.
- For Guy Facilities surveys (or any manual case): `clickup_task_id` starts as NULL. The first time a PM takes an action on the survey in the web app (assign, set due date), the server checks for NULL and creates a new ClickUp task in the same list before proceeding. The returned task ID is stored and all future actions sync normally.

---

### What ClickUp Sends to the Database (Inbound)

These fields are written to the DB when ClickUp fires a webhook. The webhook payload is matched to a DB row via `clickup_task_id`.

| ClickUp Event | Webhook Payload Field | Written to DB | DB Column |
|---|---|---|---|
| Assignee added/changed | `history_items[].after` — new assignee user object | Yes | `survey.assignee` |
| Assignee added/changed | `history_items[].user` — **who performed the assignment** | Yes | `survey.assigned_by` |
| Assignee added/changed | `history_items[].date` — Unix ms timestamp of the action | Yes | `survey.assigned_at` |
| Due date set/changed | `history_items[].after` — new due date (Unix ms) | Yes | `survey.due_date` |
| Status changed | `history_items[].after` — new status string | Yes | `survey.qa_status` |
| Task created (if linked) | `task.id` | Yes | `survey.clickup_task_id` (on initial link) |

> **`history_items` note:** ClickUp webhooks include a `history_items` array on every task update. Each item has: `type` (e.g. `assignee_add`, `due_date_updated`, `status_updated`), `user` (the person who made the change — the "assigned by"), `date` (when it happened), and `before`/`after` values. This means `assigned_by` **is available from ClickUp** via the webhook — it is not exclusively a DB-tracked field. The activity log visible in the ClickUp UI (screenshot) confirms this data is recorded per-event.

> **User identity note:** `history_items[].user` and `history_items[].after` (for assignee changes) return ClickUp user objects with `id` and `username`. A lookup against ClickUp's `/team/{team_id}/member` endpoint (or a local user mapping table) may be needed to resolve to a display name. See Q10.

> **Fields ClickUp does NOT send:** `allocated_at/by` on scans, `site_visit.processing_status`, `site_visit.inspected_at`, `site.audit_status`, `scans.transfer_status`. These remain DB-only.

---

### What the Web App Sends to ClickUp (Outbound)

These actions in the web app trigger an API call to ClickUp. Outbound sync only fires when `clickup_task_id IS NOT NULL`.

| Web App Action | ClickUp API Call | Condition |
|---|---|---|
| PM assigns a survey | `PUT /task/{clickup_task_id}` — set assignees | `clickup_task_id` exists |
| PM reassigns a survey | `PUT /task/{clickup_task_id}` — replace assignees | `clickup_task_id` exists |
| PM sets a due date | `PUT /task/{clickup_task_id}` — set due_date | `clickup_task_id` exists |
| PM marks survey complete | `PUT /task/{clickup_task_id}` — set status to mapped "complete" value | `clickup_task_id` exists |
| Survey has no ClickUp task (Guy Facilities or PA miss) | `POST /list/{list_id}/task` — create task, store returned ID, then sync the triggering action | `clickup_task_id` IS NULL — fires on first PM action (assign, due date, etc.) |

> **ClickUp API failure handling:** The DB write always happens first. If the ClickUp API call fails (timeout, rate limit, ClickUp downtime), the DB is correct and the web app continues to function. The outbound call should be retried asynchronously — log the failure and queue a retry rather than blocking the user or rolling back the DB write.

---

### Fields That Are DB-Only (No ClickUp Sync)

These fields have no ClickUp equivalent and are never synced in either direction:

| Column | Reason |
|---|---|
| `survey.assigned_by` | Available from ClickUp `history_items[].user` on inbound webhooks; for web-app assignments it is set from the logged-in PM. Tracked in DB for analytics — not a pure DB-only field. |
| `survey.assigned_at` | Set from `history_items[].date` on inbound webhooks; set from server clock on web-app assignments. Stored in DB for analytics and conflict guard. |
| `site_visit.processing_status` | Internal data processing pipeline — not a PM/tech workflow item |
| `site_visit.inspected_at` | Field inspection date — recorded during processing, not via task management |
| `site.audit_status` / `audit_due_date` | Computed from inspection history — no ClickUp concept |
| `scans.transfer_status` | Scan digital twin pipeline — managed separately |
| `scans.allocated_at/by` | Internal scan allocation — not a ClickUp task concept |

---

### Assignment Scenarios

#### Scenario 1 — Survey exists in ClickUp, already assigned there
1. ClickUp webhook fires on assignment → DB receives `assignee`, sets `assigned_at = NOW()`
2. Web app displays the assigned person pulled from DB
3. No outbound call needed — ClickUp is already correct
4. `assigned_by` is NULL (assignment happened in ClickUp, not tracked there)

#### Scenario 2 — Survey exists in ClickUp, unassigned
1. PM opens web app → sees survey in Needs Assignment queue
2. PM assigns via web app modal → DB writes `assignee`, `assigned_by`, `assigned_at`
3. Server fires outbound API call: `PUT /task/{clickup_task_id}` with new assignee
4. ClickUp task is now assigned — tech sees it in their ClickUp queue
5. If API call fails: DB is correct, ClickUp is stale — retry queue picks it up

#### Scenario 3 — Survey has no ClickUp task (`clickup_task_id IS NULL`)

This applies to **Guy Facilities surveys** where Power Automate cannot create the task automatically, or to any survey where Power Automate ran but the task ID was not written back to the DB row.

1. PM opens web app → sees survey in queue; UI may indicate "No ClickUp task linked" or show no indicator (both acceptable)
2. PM assigns via web app → DB writes `assignee`, `assigned_by`, `assigned_at`
3. Server checks: `clickup_task_id IS NULL` → calls `POST /list/{list_id}/task` to create a task in the designated ClickUp list
4. ClickUp returns new task ID → server writes `clickup_task_id` to the DB survey row **in the same request** (treat task creation + ID storage as atomic)
5. Server continues with normal outbound sync: `PUT /task/{clickup_task_id}` to set the assignee on the newly created task
6. Future changes to this survey now sync bidirectionally — the gap is closed
7. If task creation fails: DB assignment is retained, `clickup_task_id` stays NULL, outbound sync not attempted — web app remains fully functional; retry on next PM action

#### Scenario 4 — Survey assigned in web app, then reassigned in ClickUp
1. DB has `assignee = 'Matt Edrich'`, `assigned_by = 'Susan Smith'`
2. Tech lead opens ClickUp and reassigns to 'John Smith'
3. ClickUp fires webhook → DB overwrites `assignee = 'John Smith'`, updates `assigned_at`
4. `assigned_by` is NOT overwritten — it retains the last web-app assignment attribution
5. Web app reflects the updated assignee on next load

#### Scenario 5 — Survey assigned in ClickUp, then reassigned in web app
1. DB has `assignee = 'John Smith'` (from prior ClickUp webhook)
2. PM opens web app and reassigns to 'Matt Edrich'
3. DB writes `assignee = 'Matt Edrich'`, `assigned_by = 'Susan Smith'`, `assigned_at = NOW()`
4. Outbound API call: `PUT /task/{clickup_task_id}` — ClickUp task updated
5. ClickUp reflects the reassignment — tech sees updated task

#### Scenario 6 — Simultaneous assignment (race condition)
1. PM assigns in web app at the same moment a ClickUp webhook arrives
2. Both writes target the same `assignee` column
3. Resolution: last DB write wins — whichever transaction commits last is the final value
4. Risk is low (sub-second window) but can result in a brief inconsistency
5. Mitigation: add a `sync_updated_at` timestamp to the webhook handler; only apply the inbound webhook if `sync_updated_at` in payload is newer than `assigned_at` in DB

#### Scenario 7 — Reassignment when ClickUp has multiple assignees
1. ClickUp supports multiple assignees per task; FieldSync DB stores one `assignee` field
2. If a ClickUp task has 2+ assignees, the webhook payload may include a list
3. Resolution strategy: take the first assignee in the list, or the most recently added
4. This is an open question — see Q10 and consider whether `assignee` should become an array or a separate junction table for multi-assignee support

---

### Conflict Prevention Rules

These rules should be enforced at the server layer to prevent bugs:

| Rule | Enforcement |
|---|---|
| Never write to ClickUp before writing to DB | DB write is always step 1; ClickUp call is always step 2 |
| Never block a DB write on ClickUp API response | ClickUp call is async/fire-and-forget with retry |
| Never apply an inbound webhook if the record's `assigned_at` is newer | Check timestamp before overwriting: `WHERE assigned_at < :webhook_timestamp OR assigned_at IS NULL` |
| Never create a ClickUp task without storing the returned `clickup_task_id` | The task creation and the DB update must be in the same transaction/unit |
| Never attempt outbound sync when `clickup_task_id IS NULL` | Guard clause in the outbound handler: `if (!clickup_task_id) return` |
| Log every inbound webhook and outbound API call | Required for debugging sync issues; include payload, timestamp, matched row ID, success/failure |

---

### `clickup_task_id` Column

Added to `survey` and `site_visit` to maintain the link between a DB row and its ClickUp task.

```sql
ALTER TABLE survey     ADD COLUMN clickup_task_id VARCHAR(50);
ALTER TABLE site_visit ADD COLUMN clickup_task_id VARCHAR(50);

CREATE INDEX idx_survey_clickup_task     ON survey(clickup_task_id);
CREATE INDEX idx_site_visit_clickup_task ON site_visit(clickup_task_id);
```

**Normal population (going forward):**
- Power Automate surveys: the Power Automate flow writes the ClickUp task ID back to `survey.clickup_task_id` at the time it creates the task. This should be implemented in the Power Automate workflow itself.
- Guy Facilities / manual surveys: `clickup_task_id` starts NULL. The server auto-creates a ClickUp task on the first PM action and stores the returned ID immediately.

**Population strategy for existing rows:** Requires a one-time matching pass — find the ClickUp task whose name or custom field matches the survey ID or name, and write the task ID to the DB row. This cannot be automated without either a naming convention or a custom field in ClickUp. See Open Question 9.

**NULL meaning:** `clickup_task_id IS NULL` means this record has no linked ClickUp task yet — expected for Guy Facilities surveys before first PM action. The web app functions fully without it; ClickUp sync is activated automatically on the first action that triggers task creation.

---

### Sync Direction Summary

| Field | ClickUp → DB | DB → ClickUp | DB Only |
|---|---|---|---|
| `survey.assignee` | ✓ via webhook | ✓ on web app assign/reassign | — |
| `survey.due_date` | ✓ via webhook | ✓ on web app due date set | — |
| `survey.qa_status` | ✓ via webhook | ✓ on web app status change | — |
| `survey.assigned_by` | ✓ via webhook `history_items[].user` | ✓ set from logged-in PM on web app assign | — |
| `survey.assigned_at` | ✓ via webhook `history_items[].date` | ✓ set from server clock on web app assign | — |
| `survey.clickup_task_id` | ✓ set on task creation | — | — |
| `site_visit.due_date` | ✓ via webhook | ✓ on web app update | — |
| `site_visit.processing_status` | — | — | ✓ |
| `site_visit.inspected_at` | — | — | ✓ |
| `site.audit_status` | — | — | ✓ computed |
| `scans.transfer_status` | — | — | ✓ |

---

## Overview

This proposal outlines the schema additions and changes required to support:
1. Full QA workflow tracking on surveys (assignment, status, due dates) — **synced bidirectionally with ClickUp**
2. Site visit processing lifecycle (processed by, processed at, contributors)
3. Site compliance status derived from structure type and inspection history
4. Scan table enhancements
5. ClickUp task linkage on survey and site_visit tables

Existing columns that have been identified as present but unpopulated or unsurfaced are also addressed.

---

## Table 1 — Survey

### Current State

The `survey` table has a `qaCompletedAt` column that exists but is never populated, and a `qaStatus` column that exists but is not surfaced in the UI. `qaStatus` already carries the workflow states `not_started`, `in_progress`, and `completed` — these cover the full lifecycle. There is no assignee tracking, no assigned-by audit trail, and no due date for QA completion. Survey is linked to a site visit via `siteVisitId`.

### Decision: No Separate `status` Column Needed

`qaStatus` already carries the values `not_started`, `in_progress`, and `completed` — these cover the full workflow lifecycle. Adding a separate `status` column would duplicate this. The proposal drops the `survey_status_enum` addition. The work here is:
1. Populate `qaCompletedAt` when `qaStatus` transitions to `completed` (application-level trigger)
2. Surface `qaStatus` in the UI with mapped display labels
3. Add the assignment + due date columns

### Proposed Additions

```sql
ALTER TABLE survey
  -- Assignment tracking (synced bidirectionally with ClickUp)
  ADD COLUMN assignee          VARCHAR(255),           -- synced: ClickUp assignee ↔ web app assignment
  ADD COLUMN assigned_by       VARCHAR(255),           -- web app only: who made the assignment in FieldSync
  ADD COLUMN assigned_at       TIMESTAMPTZ,            -- when the assignment was last written (either source)

  -- QA due date (synced bidirectionally with ClickUp)
  ADD COLUMN due_date          DATE,                   -- synced: ClickUp due date ↔ web app stepper

  -- ClickUp task linkage
  ADD COLUMN clickup_task_id   VARCHAR(50),            -- ClickUp task ID; NULL if no linked task

  -- qaCompletedAt already exists — needs population trigger (see below)
  -- qaStatus already exists — needs UI surfacing + ClickUp status sync (no schema change required)
  ;
```

> **Due date UX note:** Due date is optional — default is no due date. The PM sets it during the assignment flow. Recommended implementation: after a PM clicks "Assign" on a survey, a stepper advances to a second step where they can optionally set a due date (with a suggested default of +7 or +14 days from today). This keeps assignment fast while making due dates easy to add.

> **ClickUp sync note:** `assignee` and `due_date` are written from two sources — the web app and ClickUp webhooks. `assigned_by` is web-app-only (ClickUp does not expose who made an assignment change in a webhook payload in a queryable way). If `clickup_task_id` is NULL, no outbound ClickUp sync is attempted for this row.

### qaCompletedAt Population

No new column needed. Application logic should set `qaCompletedAt = NOW()` when `qaStatus` is updated to `completed`. For the backfill of existing records:

```sql
-- Backfill qaCompletedAt for already-completed surveys
UPDATE survey
SET    qa_completed_at = updated_at   -- best available approximation for historical records
WHERE  qa_status = 'completed'
AND    qa_completed_at IS NULL;
```

### Backfill Strategy for Assignment Columns

Existing surveys have no assignee data. Recommended approach: treat all pre-migration surveys as unassigned (`assignee IS NULL`, `assigned_by IS NULL`, `assigned_at IS NULL`, `due_date IS NULL`). They will appear in the PM's Needs Assignment queue and can be assigned retroactively.

```sql
-- No backfill needed for assignment columns — NULL is the correct initial state.
-- Existing surveys will surface in the PM Needs Assignment queue as unassigned.
```

### Indexes

```sql
CREATE INDEX idx_survey_assignee        ON survey(assignee);
CREATE INDEX idx_survey_due_date        ON survey(due_date);
CREATE INDEX idx_survey_assigned_by     ON survey(assigned_by);
CREATE INDEX idx_survey_qa_status       ON survey(qa_status);
CREATE INDEX idx_survey_clickup_task_id ON survey(clickup_task_id);
```

### qaStatus UI Surfacing

No schema change required. `qaStatus` confirmed enum values are `not_started`, `in_progress`, and `completed`. Recommended display labels:

| qaStatus value (DB) | UI display |
|---|---|
| `not_started` | Not Started |
| `in_progress` | In Progress |
| `completed` | Completed |

---

## Table 2 — Site Visit

### Current State

The `site_visit` table has basic linkage to sites and surveys but lacks lifecycle tracking — there is no record of when processing occurred, who processed it, what its current processing status is, or when it was due. There is also no way to surface the full list of contributors (survey assignees, processors) associated with a site visit.

### Proposed Additions

```sql
ALTER TABLE site_visit
  -- Field inspection date (distinct from processed_at — see note below)
  ADD COLUMN inspected_at       DATE,                   -- actual date tech was physically on-site

  -- Processing lifecycle (DB-only, no ClickUp equivalent)
  ADD COLUMN processing_status  site_visit_status_enum  NOT NULL DEFAULT 'unprocessed',
  ADD COLUMN processed_at       TIMESTAMPTZ,            -- when office processing was completed (≠ inspected_at)
  ADD COLUMN processed_by       VARCHAR(255),           -- user who completed processing

  -- Due date (synced bidirectionally with ClickUp if clickup_task_id is set)
  ADD COLUMN due_date           DATE,

  -- ClickUp task linkage
  ADD COLUMN clickup_task_id    VARCHAR(50),            -- ClickUp task ID for this site visit; NULL if no linked task

  -- Contributors list (all users who touched this site visit's work)
  -- Option A: JSONB array (simpler, good for read-heavy queries)
  ADD COLUMN contributors       JSONB DEFAULT '[]',     -- [{ "name": "Matt Edrich", "role": "surveyor" }, ...]

  -- Option B: separate junction table (see below — recommended for querying by person)
  ;
```

> **`inspected_at` vs `processed_at`:** These are distinct events. `inspected_at` is the date the technician was physically at the tower — this is the field event used for compliance/audit calculation. `processed_at` is when office staff finished processing the scans — this can be days or weeks later. Conflating them causes `audit_due_date` to be computed from the processing date rather than the actual inspection date, making a site appear more recently inspected than it was. `site.last_inspected_at` is sourced from `site_visit.inspected_at`, not `processed_at`.

### New Enum Type

```sql
CREATE TYPE site_visit_status_enum AS ENUM (
  'unprocessed',
  'in_progress',
  'processed',
  'on_hold'
);
```

### Option B — Contributors Junction Table (Recommended)

Use this instead of the JSONB `contributors` column if you need to query "all site visits a specific person contributed to" efficiently.

```sql
CREATE TABLE site_visit_contributor (
  id               SERIAL PRIMARY KEY,
  site_visit_id    INTEGER NOT NULL REFERENCES site_visit(id) ON DELETE CASCADE,
  user_name        VARCHAR(255) NOT NULL,
  contribution     VARCHAR(50) NOT NULL,   -- 'surveyor' | 'processor' | 'qa_reviewer' | 'reviewer'
  contributed_at   TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (site_visit_id, user_name, contribution)
);

CREATE INDEX idx_svc_site_visit ON site_visit_contributor(site_visit_id);
CREATE INDEX idx_svc_user       ON site_visit_contributor(user_name);
```

> **Recommendation:** Use the junction table (Option B). It allows you to answer "who contributed to this site visit and in what capacity?" and "what site visits has this person worked on?" without parsing JSONB. Populate it by pulling survey assignees when a site visit is created, and by recording the processor on completion.

### Population Logic for Contributors

When a site visit is created or finalized, run:
```sql
-- Pull in all survey assignees for this site visit
INSERT INTO site_visit_contributor (site_visit_id, user_name, contribution)
SELECT sv.id, s.assignee, 'surveyor'
FROM   site_visit sv
JOIN   survey s ON s.site_visit_id = sv.id
WHERE  sv.id = :site_visit_id
AND    s.assignee IS NOT NULL
ON CONFLICT DO NOTHING;

-- Record the processor
INSERT INTO site_visit_contributor (site_visit_id, user_name, contribution)
VALUES (:site_visit_id, :processed_by_user, 'processor')
ON CONFLICT DO NOTHING;
```

### Backfill Strategy for Existing Records

```sql
-- Mark existing processed site visits
UPDATE site_visit
SET    processing_status = 'processed',
       processed_at = updated_at    -- best available approximation
WHERE  processed = true             -- adjust to match actual column name
AND    processed_at IS NULL;

UPDATE site_visit
SET    processing_status = 'unprocessed'
WHERE  processed = false OR processed IS NULL;
```

### Indexes

```sql
CREATE INDEX idx_site_visit_inspected_at      ON site_visit(inspected_at);
CREATE INDEX idx_site_visit_processing_status ON site_visit(processing_status);
CREATE INDEX idx_site_visit_processed_by      ON site_visit(processed_by);
CREATE INDEX idx_site_visit_processed_at      ON site_visit(processed_at);
CREATE INDEX idx_site_visit_due_date          ON site_visit(due_date);
CREATE INDEX idx_site_visit_clickup_task_id   ON site_visit(clickup_task_id);
```

---

## Table 3 — Site

### Current State

The `site` table stores the output of a processed site visit. It currently lacks a record of processing history, who last processed it, and — critically — an audit status. Structure type data lives in a separate `structure` table linked to `site` via `site_id`, with a free-text `name` column (typical values: `Guyed`, `Self-support`, `Monopole`).

### Proposed Additions

```sql
ALTER TABLE site
  -- Processing history (sourced from site_visit.processed_at — office event)
  ADD COLUMN last_processed_at    TIMESTAMPTZ,          -- when most recent site visit was processed
  ADD COLUMN last_processed_by    VARCHAR(255),         -- who processed the most recent site visit

  -- Field inspection date (sourced from site_visit.inspected_at — field event)
  -- DISTINCT from last_processed_at — see note below
  ADD COLUMN last_inspected_at    DATE,                 -- when tech was last physically on-site

  -- Audit status (computed from structure.name + last_inspected_at)
  ADD COLUMN audit_status         site_audit_enum  NOT NULL DEFAULT 'unknown',
  ADD COLUMN audit_due_date       DATE,                 -- next required inspection date (computed)
  ;
```

> **`last_inspected_at` vs `last_processed_at`:** These are two distinct dates sourced from two distinct fields on `site_visit`. `last_inspected_at` comes from `site_visit.inspected_at` — the actual date the technician was on-site. `last_processed_at` comes from `site_visit.processed_at` — when the scans were processed in the office. These can differ by days or weeks. `audit_due_date` is calculated from `last_inspected_at` (the field date), not `last_processed_at`, to avoid a site appearing more recently inspected than it actually was.

> **Full site visit history** is always available via `SELECT * FROM site_visit WHERE site_id = :id ORDER BY processed_at DESC`. These summary columns on `site` are a read-performance cache only — no separate history table is needed.

### Compliance Status Enum

```sql
CREATE TYPE site_audit_enum AS ENUM (
  'compliant',              -- within inspection window
  'inspection_needed_soon', -- within 6 months of deadline
  'inspection_needed',      -- past inspection deadline
  'unknown'                 -- no inspection date on record
);
```

### Audit Compliance Rules

Structure type is sourced from `structure.name` (free-text, joined via `site_id`). The function uses `ILIKE` matching to handle case variation.

| Structure Type (structure.name) | Inspection Interval | "Needed Soon" Threshold |
|---|---|---|
| Guyed (contains "guyed") | Every **3 years** | Within 6 months of 3-year mark |
| Monopole (contains "monopole") | Every **5 years** | Within 6 months of 5-year mark |
| Self-support (contains "self") | Every **5 years** | Within 6 months of 5-year mark |
| Other / Unknown | Every **5 years** (default) | Within 6 months of 5-year mark |

### Audit Compliance Status Computation (PostgreSQL function)

The function is called with the structure name resolved from the `structure` table at query time. It is not a trigger on `site` directly — compliance is recomputed when `last_inspected_at` is updated (on site visit processing).

```sql
CREATE OR REPLACE FUNCTION compute_audit_status(
  structure_name    VARCHAR,
  last_inspected    DATE
) RETURNS site_audit_enum AS $$
DECLARE
  interval_years    INTEGER;
  deadline          DATE;
  soon_threshold    DATE;
BEGIN
  IF last_inspected IS NULL THEN
    RETURN 'unknown';
  END IF;

  -- Determine inspection interval by structure name (free-text, ILIKE matching)
  interval_years := CASE
    WHEN LOWER(structure_name) LIKE '%guyed%' THEN 3
    ELSE 5   -- monopole, self-support, default
  END;

  deadline       := last_inspected + (interval_years || ' years')::INTERVAL;
  soon_threshold := deadline - INTERVAL '6 months';

  IF CURRENT_DATE > deadline THEN
    RETURN 'inspection_needed';
  ELSIF CURRENT_DATE >= soon_threshold THEN
    RETURN 'inspection_needed_soon';
  ELSE
    RETURN 'compliant';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

### Trigger — Keep Audit Compliance Status Current on `site`

Fires when `last_inspected_at` is updated. Joins to `structure` to resolve the structure name.

```sql
CREATE OR REPLACE FUNCTION trigger_update_audit()
RETURNS TRIGGER AS $$
DECLARE
  struct_name VARCHAR;
BEGIN
  -- Resolve structure type from the structure table
  SELECT name INTO struct_name
  FROM   structure
  WHERE  site_id = NEW.id
  LIMIT  1;

  NEW.audit_status    := compute_audit_status(struct_name, NEW.last_inspected_at);
  NEW.audit_due_date  := CASE
    WHEN NEW.last_inspected_at IS NULL THEN NULL
    WHEN LOWER(struct_name) LIKE '%guyed%'
      THEN NEW.last_inspected_at + INTERVAL '3 years'
    ELSE NEW.last_inspected_at + INTERVAL '5 years'
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER site_audit_trigger
BEFORE INSERT OR UPDATE OF last_inspected_at
ON site
FOR EACH ROW EXECUTE FUNCTION trigger_update_audit();
```

### Backfill Strategy

```sql
-- Set last_processed_at/by from most recent site visit (office processing event)
UPDATE site s
SET    last_processed_at = sv.processed_at,
       last_processed_by = sv.processed_by
FROM (
  SELECT DISTINCT ON (site_id)
         site_id, processed_at, processed_by
  FROM   site_visit
  WHERE  processed_at IS NOT NULL
  ORDER BY site_id, processed_at DESC
) sv
WHERE s.id = sv.site_id;

-- Set last_inspected_at from most recent site visit inspected_at (field event)
-- For existing records where inspected_at is NULL, fall back to scheduled_date
UPDATE site s
SET    last_inspected_at = sv.inspected_at
FROM (
  SELECT DISTINCT ON (site_id)
         site_id,
         COALESCE(inspected_at, scheduled_date::DATE) AS inspected_at
  FROM   site_visit
  WHERE  COALESCE(inspected_at, scheduled_date) IS NOT NULL
  ORDER BY site_id, COALESCE(inspected_at, scheduled_date::DATE) DESC
) sv
WHERE s.id = sv.site_id;

-- Recompute compliance for all sites using structure table join
UPDATE site s
SET audit_status   = compute_audit_status(st.name, s.last_inspected_at),
    audit_due_date = CASE
      WHEN s.last_inspected_at IS NULL THEN NULL
      WHEN LOWER(st.name) LIKE '%guyed%'
        THEN s.last_inspected_at + INTERVAL '3 years'
      ELSE s.last_inspected_at + INTERVAL '5 years'
    END
FROM structure st
WHERE st.site_id = s.id;
```

### Indexes

```sql
CREATE INDEX idx_site_audit_status      ON site(audit_status);
CREATE INDEX idx_site_audit_due_date    ON site(audit_due_date);
CREATE INDEX idx_site_last_inspected_at ON site(last_inspected_at);
CREATE INDEX idx_site_last_processed_at ON site(last_processed_at);
CREATE INDEX idx_site_last_processed_by ON site(last_processed_by);
```

---

## Table 4 — Scans

### Current State

The scans table currently captures: `creatorId`, site linkage (`site_id`), organization, file count, and site visit linkage (`siteVisitId` — or unallocated if not yet linked to a site visit). Scans are not assigned to individuals; they are created by a technician (`creatorId`). A `transfer_status` column exists to track the scan's position in the digital twin processing pipeline. No `status` column is needed — `transfer_status` covers the lifecycle.

### Paper Trail Assessment

Scans currently have a creator and a site/site visit link. The main gap is tracking **when** the scan was uploaded, **when** it was linked to a site visit, and **who made that link** — the `transfer_status` already tracks where the scan is in the digital twin pipeline.

### Proposed Additions

```sql
ALTER TABLE scans
  -- Lifecycle timestamps
  ADD COLUMN uploaded_at      TIMESTAMPTZ,            -- when scan files were uploaded (or = created_at if not captured)
  ADD COLUMN allocated_at     TIMESTAMPTZ,            -- when siteVisitId was first assigned
  ADD COLUMN allocated_by     VARCHAR(255),           -- who linked the scan to a site visit

  -- Optional: free-text notes
  ADD COLUMN notes            TEXT
  ;

-- transfer_status already exists — backfill only (see below)
-- No status column — transfer_status covers the full lifecycle
```

### `transfer_status` Enum (existing column — confirm values)

```sql
-- Confirm these are the actual current enum values in the DB:
CREATE TYPE scan_transfer_status_enum AS ENUM (
  'initial',      -- scan is in the web app, not yet transferred
  'sending',      -- actively being transferred
  'transferred',  -- transferred for digital twin processing
  'processing',   -- digital twin creation in progress
  'processed'     -- digital twin available
);
```

> **Transfer status transition logic:**
> - Scan uploaded → `initial`
> - Transfer initiated → `sending`
> - Transfer complete → `transferred`
> - Digital twin processing begun → `processing`
> - Digital twin complete → `processed`

> **Note:** `transfer_status` tracks the digital twin pipeline, not site visit allocation. A scan can have `siteVisitId` set (allocated to a visit) while still being `initial` in the transfer pipeline — these are independent states.

### What Is Deliberately Omitted

- **No `status` column** — `transfer_status` covers the full scan lifecycle. A separate generic `status` would duplicate it.
- **No assignment column** — scans are not assigned to individuals; `creatorId` is sufficient for provenance.
- **No `reviewed_by`** — scan review occurs at the site visit level via `site_visit_contributor`. Revisit if scan-level review becomes a distinct workflow step.

### Backfill Strategy

```sql
-- transfer_status: backfill existing records based on available data
-- Scans with a siteVisitId and known processing history → 'transferred' or 'processed'
-- Scans with no further data → leave as 'initial' (already the column default)
UPDATE scans
SET transfer_status = 'transferred'
WHERE site_visit_id IS NOT NULL
AND   transfer_status = 'initial';   -- adjust condition to match actual data signals

-- uploaded_at: use created_at as best available approximation
UPDATE scans SET uploaded_at = created_at WHERE uploaded_at IS NULL;
```

### Indexes

```sql
CREATE INDEX idx_scans_transfer_status ON scans(transfer_status);
CREATE INDEX idx_scans_creator_id      ON scans(creator_id);
CREATE INDEX idx_scans_site_id         ON scans(site_id);
CREATE INDEX idx_scans_site_visit_id   ON scans(site_visit_id);
```

### Open Question — Scan Paper Trail Scope

> **TBD:** Should there be an audit trail of `transfer_status` transitions as a separate log table? The current proposal records `allocated_by` and `allocated_at` inline for site visit linkage, but does not log each transfer status change. A log table would be warranted if the full history of transfer state transitions (who triggered each step, when) needs to be preserved for compliance or debugging purposes.

---

## Migration Execution Order

Run in this sequence to avoid foreign key / type dependency errors:

```sql
-- 1. Create all enum types first
CREATE TYPE site_visit_status_enum ...;
CREATE TYPE site_audit_enum ...;
-- Note: survey_status_enum is NOT needed — qaStatus already covers workflow state
-- Note: scan_transfer_status_enum already exists — confirm values match, no CREATE needed

-- 2. Alter survey table (assignment + due_date + clickup_task_id)
ALTER TABLE survey ADD COLUMN ...;

-- 3. Alter site_visit table (processing lifecycle + due_date + clickup_task_id)
ALTER TABLE site_visit ADD COLUMN ...;

-- 4. Create site_visit_contributor junction table
CREATE TABLE site_visit_contributor ...;

-- 5. Alter site table
ALTER TABLE site ADD COLUMN ...;

-- 6. Alter scans table (transfer_status already exists — add allocated_at, allocated_by, uploaded_at, notes only)
ALTER TABLE scans ADD COLUMN ...;

-- 7. Create compliance function and trigger
CREATE FUNCTION compute_audit_status ...;
CREATE TRIGGER site_audit_trigger ...;

-- 8. Run backfills (survey → site_visit → site → scans)
-- 9. Run index creation (including clickup_task_id indexes)
-- 10. Populate clickup_task_id on existing rows by matching ClickUp tasks to survey/site_visit records
```

---

## Open Questions

| # | Question | Status | Resolution |
|---|---|---|---|
| 1 | What are the actual `qaStatus` enum values in the current DB? | **Resolved** | `not_started`, `in_progress`, `completed` — no separate `status` column needed |
| 2 | Is `structure_type` a free-text column or an enum? | **Resolved** | Free-text `name` column in the `structure` table, linked to `site` via `site_id`. ILIKE matching used in compliance function |
| 3 | What column links `survey` to `site_visit`? | **Resolved** | `siteVisitId` |
| 4 | Should `due_date` on survey be set manually by PM at assignment, or auto-calculated? | **Resolved** | Set by PM in web app stepper (default +7/+14 days) OR synced from ClickUp — whichever updates last wins |
| 5 | Is `last_inspected_at` on site the same as the most recent `processed_at` on site_visit? | **Resolved** | Yes — `last_inspected_at` = `processed_at` of the most recent site visit at that site |
| 6 | Full scans table requirements? | **Resolved** | Scans are not assigned; have `creatorId`; linked to `siteVisitId` and `site_id`. Additions: `status` enum, `allocated_at`, `allocated_by`, `uploaded_at`, `notes` |
| 7 | Should contributors on site_visit include QA reviewers? | **Resolved** | Yes — `contribution` values: `surveyor`, `processor`, `reviewer` |
| 8 | Should there be a `transfer_status` transition log table? | **Open** | Needed if full history of transfer state changes (who triggered each, when) must be preserved |
| 13 | What are the actual current `transfer_status` enum values in the DB? | **Open** | Required to confirm the enum values match the proposal before running backfill |
| 9 | How are existing surveys matched to ClickUp tasks for the initial `clickup_task_id` population? | **Open** | Needs a matching strategy — by name, by custom field in ClickUp, or manual linking. Required before ClickUp sync can go live |
| 10 | Does ClickUp's webhook payload include the assignee's name or only their ClickUp user ID? | **Open** | Affects whether `survey.assignee` stores a name or a ClickUp user ID — and whether a user lookup is needed on inbound webhooks |
| 11 | Should a web-app-only assignment (no ClickUp task yet) automatically create a new ClickUp task, or only update an existing one? | **Resolved** | YES — create a new task on first PM action when `clickup_task_id IS NULL`. Applies to Guy Facilities surveys and any Power Automate miss. Requires the ClickUp list ID to be configured per survey type. |
| 12 | Which ClickUp status values map to `qaStatus` `not_started`, `in_progress`, `completed`? | **Open** | ClickUp status names are list-specific and configurable. Requires a mapping table or config per ClickUp list |
| 14 | Can the Power Automate flow be updated to write the ClickUp task ID back to the DB survey row immediately after task creation? | **Open** | If yes, this eliminates the `clickup_task_id IS NULL` gap for all non-Guy-Facilities surveys from day one. Requires PA to call a FieldSync API endpoint or write directly to the DB. |
| 15 | What is the ClickUp list ID (and is it the same list for all survey types, or per-org/per-type)? | **Open** | Required for `POST /list/{list_id}/task` calls. Guy Facilities may use a different list than standard surveys. |
