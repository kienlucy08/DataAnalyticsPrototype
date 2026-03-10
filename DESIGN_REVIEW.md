# Design Review
## FieldSync — Custom Data Analytics & QA Operations Dashboard

**Review Type:** Solution Approach Selection + Design Risk Assessment
**Status:** Awaiting Decision
**Decision Options:** Proceed with recommended approach / Proceed with alternate approach / Do not build / Needs more discovery

---

## Feature 1 — Custom Data Analytics

### Problem Statement

Field operations teams cannot self-serve data questions. Every insight requires a backend developer query, a manual export, or a BI team report request. This creates a multi-day lag between a question arising in the field and an answer reaching the person who needs it. Decisions get made without data, or data arrives too late to matter.

**Validation Evidence**
- Data questions are currently routed through engineering as ad-hoc database queries — no self-service path exists for operations staff
- Existing Power BI embed surfaces pre-built reports but cannot answer one-off questions or respond to new data needs without BI team involvement
- Role-based access requirements are currently enforced at the report level only — there is no mechanism preventing a logged-in user from navigating to a report scoped to a different role
- The analytics questions most commonly requested by PMs and org owners (overdue counts, completion rates by org, technician workload) are not in any existing report

---

### Solution Options

#### Option A — AI Natural Language Interface with MCP Bridge *(prototyped)*

Users type a question in plain English. Claude queries the live PostgreSQL database through a secure MCP server bridge and returns a formatted answer — metric card, bar chart, line chart, or table depending on the answer type. Results can be saved to a personal drag-and-resize dashboard. Role enforcement is two-layer: frontend pre-check blocks obvious violations before an API call is made; server-side Claude system prompt blocks anything that passes the frontend.

**Tradeoffs**

| | |
|---|---|
| **For** | Any question answerable from the database is answerable immediately — no new report requests needed |
| **For** | Role enforcement is dynamic, not report-scoped — it follows the user regardless of what they ask |
| **For** | Personal dashboards mean each user builds the view that reflects their actual workflow |
| **Against** | Dependent on Claude API availability and MCP server uptime — if either is down, the feature is unavailable |
| **Against** | Answer quality depends on prompt quality — poorly worded questions return less useful answers |
| **Against** | MCP server requires its own infrastructure, deployment, and maintenance separate from the main app |
| **Against** | AI responses are not deterministic — the same question can return slightly different phrasing or formatting |

**Risks**
- **Data accuracy risk (Medium):** Claude interprets questions and constructs queries. Edge cases or ambiguous questions may return plausible-looking but incorrect results. Mitigation: display a "this is AI-generated" disclaimer on all results; allow users to flag incorrect answers.
- **Cost risk (Low-Medium):** Every query consumes API tokens. Heavy usage by many simultaneous users could generate meaningful API costs. Mitigation: rate limiting per user/role; cache common query results.
- **Trust risk (Medium):** Field operations staff may distrust AI-generated numbers, especially for compliance-critical data. Mitigation: show the underlying query or data source alongside results; link to the raw table.

---

#### Option B — Pre-Built Self-Service Report Library

A curated catalog of parameterized reports built and maintained by the BI team. Users browse a library, select a report, filter by date/org/technician, and view results. New report requests go through a lightweight intake process rather than direct engineering requests.

**Tradeoffs**

| | |
|---|---|
| **For** | Results are deterministic and validated — no AI interpretation layer |
| **For** | Lower infrastructure complexity — no MCP server, no AI dependency |
| **Against** | Only covers questions that were anticipated when reports were built — novel questions still require BI team |
| **Against** | Report backlog will grow faster than it can be addressed; the core bottleneck is not eliminated, only formalized |
| **Against** | Personalization is limited — reports are shared, not per-user |

---

#### Option C — Expanded Power BI Embed

Extend the existing Power BI integration to include more reports with deeper row-level security, more filter surfaces, and a drill-through capability so users can move from summary to detail within Power BI.

**Tradeoffs**

| | |
|---|---|
| **For** | Leverages existing infrastructure and BI tooling investment |
| **For** | Power BI handles rendering, filtering, and mobile responsiveness |
| **Against** | Still dependent on a BI team to create and maintain reports — self-service ceiling remains |
| **Against** | Row-level security configuration in Power BI is complex and brittle at scale |
| **Against** | Embed tokens require a backend token vending service — meaningful auth infrastructure required |

---

### Recommendation — Option A

The core problem is that data questions require a human intermediary to answer. Option B and C reduce the friction slightly but preserve the bottleneck. Option A eliminates it for the majority of questions operations staff actually ask.

The prototype demonstrates this working against a live database. The infrastructure (MCP server, Express bridge, Claude API) is already operational. The primary risks — accuracy and trust — are addressable through UI transparency (showing data source, flagging AI generation) rather than architectural changes.

**If CS concerns exist about AI accuracy for compliance-sensitive data:** scope Option A to exclude compliance-critical queries (e.g. "is this site compliant?") and surface those through a validated report instead. The natural language interface handles everything else.

---

### CS Concerns to Assess

- Is AI-generated data acceptable for operational decisions, or does any data displayed in the platform need to be provably correct?
- What is the acceptable latency for a data query response? (Current prototype: 3–8 seconds on average)
- Should there be an audit log of what data questions were asked and by whom?

---

---

## Feature 2 — QA Operations Dashboard

### Problem Statement

Survey assignment, QA tracking, and completion verification happen through disconnected channels — email, Slack, spreadsheets, and verbal communication. There is no system of record for who is assigned to what, when it was assigned, what the current status is, or whether it is overdue. When something slips, there is no trail to understand why or who was responsible.

**Validation Evidence**
- Surveys are currently assigned verbally or via Slack messages — no assignment record exists in the database (`assignee` and `assigned_by` columns do not exist on the survey table)
- `qaCompletedAt` exists as a column but is never populated — the system has the intent but no mechanism to record it
- Overdue surveys are identified reactively (someone notices) rather than proactively (the system surfaces them)
- Multiple roles (PM, technician, org owner, admin) need different views of the same underlying data — there is no role-differentiated operations view today

---

### Solution Options

#### Option A — Role-Differentiated Operations Dashboard *(prototyped)*

A dedicated QA operations page with a role-aware view system. Admin sees everything across all orgs. Org Owner sees per-org health summaries. PM sees an assignment workflow with a Needs Assignment queue and an Assigned Surveys tracker. Technicians see a personal priority-ordered work queue with a priority lock system. All roles share a common data model — actions in one role view are immediately reflected in others.

**Tradeoffs**

| | |
|---|---|
| **For** | Each role sees exactly what they need — no information overload, no missing context |
| **For** | Assignment creates a database record (assignee, assigned_by, assigned_at) — the paper trail is the feature |
| **For** | The priority lock system enforces field safety rules at the UI level without requiring manual enforcement |
| **Against** | Five distinct role views is significant UI surface area to build, test, and maintain |
| **Against** | Requires schema additions (assignee, assigned_by, status, due_date on survey) before the feature is production-ready |
| **Against** | Priority lock logic is opinionated — field teams may resist automated enforcement of work order |

**Risks**
- **Adoption risk (Medium):** If the assignment workflow adds steps compared to current Slack-based assignment, field staff may avoid it. Mitigation: make assignment as fast as possible (single click, not a multi-step form); show immediate confirmation.
- **Data migration risk (Medium):** Existing surveys have no assignee data — a bulk migration or a "fresh start" policy is required. Mitigation: document in the migration proposal; existing surveys can be imported as unassigned and assigned retroactively.
- **Role resistance risk (Low):** Technicians operating under a priority lock may push back on the system overriding their judgment. Mitigation: the Unblock feature provides an explicit override path — it is documented friction, not a hard block.

---

#### Option B — Kanban Task Board

A drag-and-drop board where survey cards move across status columns (Unassigned → Not Started → In Progress → Complete → Overdue). Any user with access to the board can drag a card to reassign or update status. No role-differentiated views — one view for all.

**Tradeoffs**

| | |
|---|---|
| **For** | Familiar UX pattern — most operations staff have used a kanban board |
| **For** | Simpler to build than five distinct role views |
| **Against** | A PM assigning work and a technician completing work look the same on a kanban board — the distinction between coordination and execution is lost |
| **Against** | No enforcement of who can do what — any user can move any card |
| **Against** | Does not scale well with hundreds of surveys — kanban boards become unmanageable at volume |

---

#### Option C — Enhanced Existing Survey List

Extend the existing survey table view with new columns (assignee dropdown, status filter, due date), inline editing, and a filter sidebar. No new page or role-differentiated view — one table for all roles with different default filters.

**Tradeoffs**

| | |
|---|---|
| **For** | Lowest build effort — adds to existing infrastructure |
| **For** | No new navigation — users stay in a familiar context |
| **Against** | A single table cannot show an admin's org-wide view and a technician's personal priority queue simultaneously — role-specific UX is lost |
| **Against** | Inline editing in a shared table creates permission complexity — who can edit whose survey? |
| **Against** | The paper trail (assigned_by, assigned_at) is harder to surface naturally in a table row |

---

### Recommendation — Option A

Option A is the only approach that closes the full loop: assignment creates a record, status changes propagate across roles, and both the PM and technician have a purpose-built view of their specific responsibilities. Options B and C solve the surface problem (visibility) without solving the structural problem (accountability and role clarity).

The prototype is fully functional. The primary remaining work is the schema migration (assignee, assigned_by, status, due_date on the survey table) and wiring the prototype's mock data to live database queries.

**If build scope is a concern:** the minimum viable version is Admin view + PM Assign Work view + Technician view only. The priority lock, survey detail page, Org Owner view, and KPI customization are all additive and can ship in a subsequent iteration.

---

### CS Concerns to Assess

- Who has permission to assign a survey? PM only, or can admins and org owners also assign?
- Should a technician be able to reassign their own survey, or is reassignment a PM-only action?
- Is the priority lock rule (high-priority surveys block lower ones) a hard requirement or a default-on preference?
- What happens to existing surveys with no assignee — should they appear in the PM's Needs Assignment queue, or be handled separately?

---

---

## Design Risk Assessment (Complete if Proceeding)

*To be completed collectively during the review session. Rate each dimension 1 (low) – 3 (high).*

| Risk Dimension | Feature 1: Analytics | Feature 2: QA Dashboard | Notes |
|---|---|---|---|
| **User impact if wrong** — how bad is the outcome if this design fails in the field? | | | |
| **Reversibility** — how hard is it to roll back or change after shipping? | | | |
| **Novelty** — how new is this interaction pattern to our users? | | | |
| **Dependency risk** — how many external systems or teams does this depend on? | | | |
| **Validation gap** — how much user research backs the approach chosen? | | | |
| **Schema risk** — how significant are the database changes required? | | | |

**Total risk score (sum):** ___/18 per feature

*Scores above 12 warrant an additional discovery sprint before proceeding.*

---

## Decision

| | Feature 1: Analytics | Feature 2: QA Dashboard |
|---|---|---|
| ☐ Proceed — recommended approach | | |
| ☐ Proceed — alternate approach (specify) | | |
| ☐ Do not build | | |
| ☐ Needs more discovery | | |

**Notes / Conditions:**

