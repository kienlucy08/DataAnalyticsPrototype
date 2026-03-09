# Database Migration Proposal
## FieldSync QA Operations & Analytics Platform

**Status:** Draft
**Scope:** Survey, Site Visit, Site, Scans tables
**Purpose:** Support QA workflow tracking, assignment paper trail, analytics surfacing, and site compliance status

---

## Overview

This proposal outlines the schema additions and changes required to support:
1. Full QA workflow tracking on surveys (assignment, status, due dates)
2. Site visit processing lifecycle (processed by, processed at, contributors)
3. Site compliance status derived from structure type and inspection history
4. Scan table enhancements (TBD — see Scans section)

Existing columns that have been identified as present but unpopulated or unsurfaced are also addressed.

---

## Table 1 — Survey

### Current State

The `survey` table has a `qaCompletedAt` column that exists but is never populated, and a `qaStatus` column that exists but is not surfaced in the UI. There is no assignee tracking, no assigned-by audit trail, and no due date for QA completion.

### Proposed Additions

```sql
ALTER TABLE survey
  -- Assignment tracking
  ADD COLUMN assignee          VARCHAR(255),           -- user assigned to complete this survey
  ADD COLUMN assigned_by       VARCHAR(255),           -- user who made the assignment
  ADD COLUMN assigned_at       TIMESTAMPTZ,            -- when the assignment was made

  -- Workflow status
  ADD COLUMN status            survey_status_enum      NOT NULL DEFAULT 'not_started',

  -- QA due date
  ADD COLUMN due_date          DATE,                   -- expected QA completion date

  -- qaCompletedAt already exists — needs population trigger (see below)
  -- qaStatus already exists — needs UI surfacing (no schema change required)
  ;
```

### New Enum Type

```sql
CREATE TYPE survey_status_enum AS ENUM (
  'not_started',
  'in_progress',
  'completed'
);
```

> **Note on status vs progress tracker:** The existing progress tracker component tracks field-level completion percentage. This `status` column is a higher-level workflow state — it answers "has this survey been started / finished?" independently of how many individual fields are checked. They serve different purposes and both are needed. Status transitions should be:
> - Assignment → `not_started`
> - First field checked or survey opened for editing → `in_progress` (triggered by app)
> - Mark as Complete action → `completed` (triggers population of `qaCompletedAt`)

### Backfill Strategy for Existing Records

```sql
-- Populate qaCompletedAt for records where qaStatus indicates completion
UPDATE survey
SET    qa_completed_at = updated_at   -- best available approximation for historical records
WHERE  qa_status IN ('approved', 'complete', 'qa_complete')  -- adjust to match actual enum values
AND    qa_completed_at IS NULL;

-- Set status based on existing data
UPDATE survey SET status = 'completed'  WHERE qa_completed_at IS NOT NULL;
UPDATE survey SET status = 'in_progress' WHERE qa_completed_at IS NULL AND progress > 0;
UPDATE survey SET status = 'not_started' WHERE qa_completed_at IS NULL AND (progress = 0 OR progress IS NULL);
```

### Indexes

```sql
CREATE INDEX idx_survey_assignee    ON survey(assignee);
CREATE INDEX idx_survey_status      ON survey(status);
CREATE INDEX idx_survey_due_date    ON survey(due_date);
CREATE INDEX idx_survey_assigned_by ON survey(assigned_by);
```

### qaStatus UI Surfacing

No schema change required. `qaStatus` is already a column — it needs to be included in the survey query and mapped to a display label in the frontend. Recommended display values:

| qaStatus value (DB) | UI display |
|---|---|
| `pending` | Pending Review |
| `approved` | QA Approved |
| `rejected` | Returned for Revision |
| `not_required` | QA Not Required |

*(Adjust to match actual enum values in your database.)*

---

## Table 2 — Site Visit

### Current State

The `site_visit` table has basic linkage to sites and surveys but lacks lifecycle tracking — there is no record of when processing occurred, who processed it, what its current processing status is, or when it was due. There is also no way to surface the full list of contributors (survey assignees, processors) associated with a site visit.

### Proposed Additions

```sql
ALTER TABLE site_visit
  -- Processing lifecycle
  ADD COLUMN processing_status  site_visit_status_enum  NOT NULL DEFAULT 'unprocessed',
  ADD COLUMN processed_at       TIMESTAMPTZ,            -- when processing was completed
  ADD COLUMN processed_by       VARCHAR(255),           -- user who completed processing

  -- Due date
  ADD COLUMN due_date           DATE,                   -- expected processing completion date

  -- Contributors list (all users who touched this site visit's work)
  -- Option A: JSONB array (simpler, good for read-heavy queries)
  ADD COLUMN contributors       JSONB DEFAULT '[]',     -- [{ "name": "Matt Edrich", "role": "surveyor" }, ...]

  -- Option B: separate junction table (see below — recommended for querying by person)
  ;
```

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
  contribution     VARCHAR(50) NOT NULL,   -- 'surveyor' | 'processor' | 'qa_reviewer'
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
CREATE INDEX idx_site_visit_processing_status ON site_visit(processing_status);
CREATE INDEX idx_site_visit_processed_by      ON site_visit(processed_by);
CREATE INDEX idx_site_visit_due_date          ON site_visit(due_date);
CREATE INDEX idx_site_visit_processed_at      ON site_visit(processed_at);
```

---

## Table 3 — Site

### Current State

The `site` table stores the output of a processed site visit. It currently lacks a record of processing history, who last processed it, and — critically — a compliance status that reflects whether the site is overdue for inspection based on its structure type and last inspection date.

### Proposed Additions

```sql
ALTER TABLE site
  -- Processing history
  ADD COLUMN last_processed_at    TIMESTAMPTZ,          -- most recent site visit processed_at
  ADD COLUMN last_processed_by    VARCHAR(255),         -- who processed the most recent site visit

  -- Compliance status
  ADD COLUMN compliance_status    site_compliance_enum  NOT NULL DEFAULT 'compliant',
  ADD COLUMN compliance_due_date  DATE,                 -- next required inspection date (computed)
  ADD COLUMN last_inspected_at    DATE,                 -- date of last qualifying inspection
  ;
```

> **Note on site visit history:** The full list of site visit datetimes is available via `SELECT processed_at FROM site_visit WHERE site_id = :id ORDER BY processed_at DESC`. This does not need to be stored as a denormalized column — it can be queried directly. If read performance becomes a concern, a materialized view is preferable to a stored array.

### Compliance Status Enum

```sql
CREATE TYPE site_compliance_enum AS ENUM (
  'compliant',              -- within inspection window
  'inspection_needed_soon', -- within 6 months of deadline
  'inspection_needed',      -- past inspection deadline
  'unknown'                 -- no inspection date on record
);
```

### Compliance Rules

Inspection frequency by structure type:

| Structure Type | Inspection Interval | "Needed Soon" Threshold |
|---|---|---|
| Guyed | Every **3 years** | Within 6 months of 3-year mark |
| Monopole | Every **5 years** | Within 6 months of 5-year mark |
| Self-Support | Every **5 years** | Within 6 months of 5-year mark |
| Other / Unknown | Every **5 years** (default) | Within 6 months of 5-year mark |

### Compliance Status Computation (PostgreSQL function)

```sql
CREATE OR REPLACE FUNCTION compute_compliance_status(
  structure_type    VARCHAR,
  last_inspected    DATE
) RETURNS site_compliance_enum AS $$
DECLARE
  interval_years    INTEGER;
  deadline          DATE;
  soon_threshold    DATE;
BEGIN
  IF last_inspected IS NULL THEN
    RETURN 'unknown';
  END IF;

  -- Determine inspection interval by structure type
  interval_years := CASE
    WHEN LOWER(structure_type) LIKE '%guyed%' THEN 3
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

### Trigger — Keep Compliance Status Current

```sql
-- Recompute compliance status whenever last_inspected_at or structure_type changes
CREATE OR REPLACE FUNCTION trigger_update_compliance()
RETURNS TRIGGER AS $$
BEGIN
  NEW.compliance_status    := compute_compliance_status(NEW.structure_type, NEW.last_inspected_at);
  NEW.compliance_due_date  := CASE
    WHEN NEW.last_inspected_at IS NULL THEN NULL
    WHEN LOWER(NEW.structure_type) LIKE '%guyed%'
      THEN NEW.last_inspected_at + INTERVAL '3 years'
    ELSE NEW.last_inspected_at + INTERVAL '5 years'
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER site_compliance_trigger
BEFORE INSERT OR UPDATE OF last_inspected_at, structure_type
ON site
FOR EACH ROW EXECUTE FUNCTION trigger_update_compliance();
```

### Backfill Strategy

```sql
-- Set last_processed_at and last_processed_by from most recent site visit
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

-- Recompute compliance for all sites
UPDATE site
SET compliance_status   = compute_compliance_status(structure_type, last_inspected_at),
    compliance_due_date = CASE
      WHEN last_inspected_at IS NULL THEN NULL
      WHEN LOWER(structure_type) LIKE '%guyed%'
        THEN last_inspected_at + INTERVAL '3 years'
      ELSE last_inspected_at + INTERVAL '5 years'
    END;
```

### Indexes

```sql
CREATE INDEX idx_site_compliance_status   ON site(compliance_status);
CREATE INDEX idx_site_compliance_due_date ON site(compliance_due_date);
CREATE INDEX idx_site_last_processed_at   ON site(last_processed_at);
CREATE INDEX idx_site_last_processed_by   ON site(last_processed_by);
```

---

## Table 4 — Scans

> **Status:** In progress — additions TBD. The following are placeholder notes based on the current prototype data model. To be finalized with the full requirements.

### Current State (from prototype)

The scans table currently captures: technician, site linkage, organization, file count, and site visit linkage (or "unallocated" if not yet linked to a site visit).

### Likely Additions (to be confirmed)

| Column | Type | Purpose |
|---|---|---|
| `uploaded_at` | `TIMESTAMPTZ` | When the scan files were uploaded |
| `processed_at` | `TIMESTAMPTZ` | When the scan was processed into the site visit |
| `status` | enum | `unallocated`, `allocated`, `processed` |
| `reviewed_by` | `VARCHAR(255)` | Who reviewed/approved the scan |
| `notes` | `TEXT` | Free-text notes on the scan |

*This section will be completed once scan workflow requirements are fully defined.*

---

## Migration Execution Order

Run in this sequence to avoid foreign key / type dependency errors:

```sql
-- 1. Create all enum types first
CREATE TYPE survey_status_enum ...;
CREATE TYPE site_visit_status_enum ...;
CREATE TYPE site_compliance_enum ...;

-- 2. Alter survey table
ALTER TABLE survey ADD COLUMN ...;

-- 3. Alter site_visit table
ALTER TABLE site_visit ADD COLUMN ...;

-- 4. Create site_visit_contributor junction table (if using Option B)
CREATE TABLE site_visit_contributor ...;

-- 5. Alter site table
ALTER TABLE site ADD COLUMN ...;

-- 6. Create compliance function and trigger
CREATE FUNCTION compute_compliance_status ...;
CREATE TRIGGER site_compliance_trigger ...;

-- 7. Run backfills (survey, then site_visit, then site)
-- 8. Run index creation
```

---

## Open Questions

| # | Question | Impact |
|---|---|---|
| 1 | What are the actual `qaStatus` enum values in the current DB? | Affects UI label mapping and backfill query |
| 2 | Is `structure_type` a free-text column or an enum? | Affects compliance function — guyed matching via LIKE vs exact enum value |
| 3 | What column links `survey` to `site_visit`? (`site_visit_id` assumed) | Affects contributor population query |
| 4 | Should `due_date` on survey be set manually by PM at assignment, or auto-calculated from some SLA? | Affects assignment workflow logic |
| 5 | Is `last_inspected_at` on site the same as the most recent `processed_at` on site_visit, or is it a separate inspection record? | Critical for compliance calculation accuracy |
| 6 | Full scans table requirements? | Scans section incomplete |
| 7 | Should contributors on site_visit include QA reviewers in addition to surveyors and processors? | Affects junction table `contribution` enum values |
