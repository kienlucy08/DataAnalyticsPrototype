# FieldSync Prototype

A dual-purpose prototype demonstrating two interconnected tools under one roof: a **Custom Data Analytics Dashboard** and a **Customizable QA Operations Dashboard**. Built with React, TypeScript, Tailwind CSS, and a Claude-powered MCP bridge for natural-language data queries.

---

## Two Prototypes in One

This project intentionally combines two separate tools to explore how field operations teams can move fluidly between ad-hoc data investigation and structured QA workflow management — without switching between disconnected systems.

### Tool 1 — Custom Data Analytics (`/custom-data-analytics` + `/custom-dashboard`)

An AI-powered analytics workspace where users ask questions about their data in plain English. Claude processes the query against available data and returns a written answer alongside an auto-generated chart. Results can be saved to a personal drag-and-resize dashboard, and individual metric cards can be imported directly into the QA Dashboard KPI rows (see below).

**Use this for:** one-off questions, ad-hoc deep-dives, custom reporting, and surfacing patterns not covered by pre-built reports.

### Tool 2 — QA Operations Dashboard (`/qa-dashboard`)

A structured operations view that provides a clear paper trail for every survey, scan, site visit, and site in the system. The central question it answers is: *what is the current status of this work item, who owns it, and what needs to happen next?*

**Use this for:** daily operations management, survey assignment, tracking QC technician workloads, and auditing completion history.

---

## Demo Guide

**Route:** `/demo`

The Demo Guide is a step-by-step interactive walkthrough of the full prototype. It guides you through every feature in a structured sequence so you can understand what each part does, how to interact with it, and how the two tools connect to each other.

### What It Covers

19 steps organized into five acts, covering the complete feature set in a logical order:

| Act | Title | Steps | What It Covers |
|---|---|---|---|
| **1** | The Problem Today | 1 | Orientation — what FieldSync already does and where the new tools fit in |
| **2** | Custom Data Analytics | 6 | Asking questions, viewing inline charts, saving to dashboard, role access enforcement |
| **3** | The Bridge | 1 | Pinning an analytics metric directly into a QA Dashboard KPI row |
| **4** | QA Operations Dashboard | 8 | Assignment workflow, technician views, priority locking, survey detail page, completing a survey |
| **5** | The Full Picture | 3 | Org Owner view, KPI customization, overview of how it all connects |

### How to Use It

**From the Demo Guide page:**
- Click **Start Full Demo** to begin from Step 1
- Expand any step card to read the full instructions and see what that step demonstrates
- Click **Start Demo from Step N** on any card to jump directly to that step

**The floating overlay:**
Once a walkthrough is started, a floating panel appears in the bottom-right corner and stays there as you navigate between pages. Each step in the overlay shows:
- **Act badge** — color-coded to show which act you're in
- **Role** — which persona to switch to in the top-right role switcher before performing this step
- **Do This** — the exact action to take (what to click, where to navigate)
- **Key Insight** — what this step is demonstrating and why it matters

Use **Prev / Next** to move between steps. The progress bar and step dots show where you are across all 19 steps. Click the **minimize** button to collapse the overlay to a slim strip when you need the full screen — click it again to restore.

### Jumping to a Specific Section

Use the act filter tabs on the Demo Guide page to show only the steps from a particular act. This is useful for revisiting a specific feature without going through the full walkthrough from the beginning — for example, jumping straight to Act 4 to walk through the survey assignment and completion flow.

---

## Role Switcher

Use the role switcher in the top navigation bar to switch between all five user personas. This is intentional for prototype demonstration — it lets stakeholders explore every perspective in a single session without authentication.

| Role | Persona | Data Scope |
|---|---|---|
| **Admin** | Lucy Kien | Full access — all organizations, all surveys, all scans, all sites |
| **Org Owner** | — | Scoped to managed organizations (FieldSync Org + Test Org) |
| **Project Manager** | Susan Smith | Scoped to FieldSync Org + Test Org; survey assignment and technician tracking |
| **QC Technician** | Matt Edrich | Personal surveys, scans, and site visits only |
| **QC Technician 2** | John Smith | Personal surveys, scans, and site visits only |

Switching roles reloads all dashboard state — each persona has a separate saved dashboard and separate KPI configuration in localStorage.

---

## Pages

### PowerBI Dashboard

**Route:** `/powerbi-dashboard`

Embeds a Power BI report scoped to the current role. Each role sees a different report configured in `src/config/powerbi.config.ts`. Best for pre-built executive reporting — visualizations published by a BI team with consistent branding and layout.

**Power BI embed modes:**

*Option 1 — Publish to web (no auth, suitable for prototyping):*
1. Open your report in Power BI Service (app.powerbi.com)
2. **File → Embed report → Publish to web (public)**
3. Copy the iframe `src` URL into `iframeUrl` for the relevant role in `src/config/powerbi.config.ts`

> Note: Publish to web is public — anyone with the link can view the report. Not suitable for sensitive data.

*Option 2 — Azure AD authenticated embed (production):*
Fill in `reportId`, `embedUrl`, and `accessToken` in `powerbi.config.ts`. Requires an Azure AD App Registration with Power BI API permissions and a backend that vends embed tokens with Row-Level Security.

---

### QA Operations Dashboard

**Route:** `/qa-dashboard`

A workflow-oriented survey management view showing the live operational status of surveys, scans, site visits, and sites. The view adapts entirely based on the current role.

#### The Paper Trail

Every item in the system carries enough metadata to answer: *who is responsible, what stage is it at, and is it on time?*

- **Surveys** — status (`Unassigned → Not Started → In Progress → Completed / Overdue`), assigned technician, priority (`High / Medium / Low`, auto-elevated to High when overdue), progress percentage, created date, due date, completed date
- **Scans** — technician, site, organization, file count, site visit linkage (or "unallocated" if not yet linked)
- **Site Visits** — assignee, scheduled date, processing status, processed-by name, and processing date
- **Sites** — last visit date, last processing timestamp, overdue flag

This creates a clear audit trail across the full lifecycle of field work — from creating a survey and assigning it, through active inspection, to final processing and sign-off.

#### Role Views

**Admin** — Full org-wide view. All surveys, scans, site visits, and sites across every organization. Includes an overall completion rate progress bar to surface systemic bottlenecks.

**Org Owner** — Per-organization health cards showing each org's total surveys, completed, in-progress, overdue, and completion rate. Clean overview by default — no KPI cards at the top so the page doesn't feel cluttered. Users can add KPI cards if they want (see Customizable KPI Cards below).

**Project Manager** — Two modes toggled by a pill switcher in the header:
- *Assign Work* (default) — Two focused tables: *Needs Assignment* (unassigned surveys sorted by priority, with inline technician assignment dropdown) and *Assigned Surveys* (active work with progress bars and status badges). KPI cards reflect the full assigned-work picture.
- *My Work* — Switches to the same priority-card layout used by technicians, scoped to surveys assigned to Susan Smith. KPI cards recalculate for Susan's personal workload only. A badge on the "My Work" tab shows how many active surveys she has. This separates the "managing others" and "doing your own work" contexts so neither view pollutes the other.

**QC Technician (Matt)** — Personal view only. Active surveys shown as priority-ordered cards with a priority-lock system: high-priority surveys must be addressed before lower-priority ones are accessible. Completed surveys shown in a history table.

**QC Technician 2 (John)** — Same technician view with priority-lock. Scoped to John's own surveys, scans, and site visits.

#### PM Assignment Workflow

The Project Manager view is split into two distinct modes, toggled by the pill switcher at the top of the view.

**Assign Work mode (default)**

This is the coordination layer. Two tables sit side by side:

1. *Needs Assignment* — all surveys with no assigned technician, sorted by priority (High / Overdue first). Each row has an **Assign** button that opens a modal with a technician dropdown. The PM can assign to any available technician or to themselves.
2. *Assigned Surveys* — all surveys that have been assigned, showing their current status, progress bar, assigned technician, and due date.

To walk through the full assignment flow:
1. Switch the role to **Project Manager (Susan Smith)**
2. In the *Needs Assignment* table, find any unassigned survey and click **Assign**
3. Select a technician from the dropdown and click **Assign** to confirm
4. A toast notification confirms the assignment — the survey moves from *Needs Assignment* into *Assigned Surveys*
5. Switch to **QC Technician (Matt)** or **QC Technician 2 (John)** — the newly assigned survey appears immediately in their active work queue

Status changes on assignment:
- `Unassigned` → `Not Started` when first assigned to anyone
- Already-assigned surveys retain their current status when reassigned to a different technician

**My Work mode**

Toggled by clicking the **My Work** pill. This switches the entire view to show only surveys assigned to Susan Smith, using the same priority-card layout that technicians see. KPI cards recalculate to reflect Susan's personal workload rather than the full team's.

The badge on the My Work tab shows how many active surveys Susan currently has. Surveys can be clicked to open the detail page, marked as complete, and tracked the same way a technician would use their own view. This separates the management context from the personal work context — Susan can coordinate the team in Assign Work mode and then focus on her own queue in My Work mode without the two views mixing.

#### Priority Lock & Unblock

Technician survey cards are sorted by effective priority. When a technician has any **High** priority or **Overdue** surveys, all lower-priority surveys are shown as locked (grayed out, not clickable). This enforces the rule that critical work gets addressed first.

If field conditions genuinely require working out of sequence, technicians can click **Unblock** on any locked card. A confirmation modal explains which higher-priority surveys are currently blocking it and asks for explicit confirmation. The unblock is session-only — it doesn't persist and doesn't modify the underlying priority data. This makes the override a documented, intentional decision rather than an invisible workaround.

#### Survey Detail Page

Clicking any survey name (in any role view — PM tables, technician cards, completed history rows) opens a full-screen survey detail overlay. This simulates the actual inspection workflow:

- **Header** — survey name, scope type, progress bar ("N of M fields marked"), Save button, Mark as Complete button
- **Site info card** — site name, organization, due date, assigned technician, status badge, map placeholder
- **AI Analysis** — collapsible toggle that would surface Claude-generated analysis for this survey's data
- **Accordion sections** — scope-specific sections (e.g. Facilities inspections have *Guy Compounds*, *Guy Photos*, *Deficiencies*; Tower inspections have *Climbing Protocol*, *Site Photos*). Each section is toggled independently.
- **Field checklists** — check, photo, and measurement fields within each section. Checking a field updates the progress bar in real time.
- **Mark as Complete** — triggers a confirmation modal. On confirm, the survey status becomes `Completed` and a completion date is stamped. The change propagates immediately — switch to the PM or Admin view and the survey appears as Completed.

Survey detail state (which fields are checked, which sections are open) is local to the current session and does not persist.

---

### Customizable KPI Cards

#### What They Are

Each tab in the QA Dashboard (Surveys, Scans, Site Visits, Sites) displays a row of KPI cards directly above the data table. These are at-a-glance metric tiles — counts and computed percentages that surface the most important numbers for that specific table without requiring the user to scan through rows of data.

#### Why They Live Inside Each Tab

KPI cards are scoped to their tab rather than floating above the whole page. This is intentional: survey metrics (overdue count, completion rate) are irrelevant when you're looking at the Scans table, and scan metrics (unallocated scans, total files) are irrelevant when you're in Site Visits. Keeping metrics contextual means the numbers you see are always directly about what you're looking at — no cognitive overhead from translating out-of-context figures.

#### Why Customization Matters

No two people work the same way. Some users want a broad overview; others need a very specific signal front and center. A Project Manager's most important number might be the unassigned queue. A QC Technician might care most about their personal completion rate. An Org Owner might want overdue site counts rather than survey counts.

Forcing everyone into the same fixed metric layout creates noise for some roles and missing context for others. The customization system lets each user shape their own signal-to-noise ratio:

- **Remove** cards that don't matter to their workflow — click the pencil icon in the top-right corner of any KPI row, then click the red × on any card
- **Add** cards from the pre-built metric registry for that table — click "Add Card +" to see all available options with their icons and colors
- **Reset** back to the role-appropriate defaults at any time with the Reset link
- **Import from Analytics Dashboard** — any single-value metric card created via the AI analytics tool can be pinned directly into a QA Dashboard KPI row

Preferences are saved per-role in `localStorage` so they persist across sessions. If the system defaults change (e.g. a new role-specific default is configured), a version check clears stale cached configurations automatically so users always see fresh defaults.

#### Importing Metrics from the Analytics Dashboard

This is the bridge between the two tools. A user might ask Claude "what is our scan-to-completion ratio for Q1?" on the Data Analytics page, get back a metric card, save it to My Dashboard — and then want that number visible while they're working in the QA Dashboard. Rather than having to navigate back and forth, they can pin it directly into any KPI row.

When editing a KPI row, the "Add Card +" dropdown shows a **From Analytics Dashboard** section listing all saved metric-type widgets. Pinned analytics metrics display an "Analytics" badge so it's clear the value is a snapshot from a specific query. If the source widget is later deleted from the analytics dashboard, the pinned card silently disappears from the KPI row.

This design reflects how people actually work — some users will be satisfied with the built-in metrics, some will want to remove half of them, and some will want custom metrics that only make sense for their specific role or organization. The system accommodates all three.

#### Default KPI Cards by Role

Role defaults are tuned to surface the signals most relevant to each person's responsibilities:

| Role | Survey Tab Default | Reasoning |
|---|---|---|
| Admin | Total, Completed, In Progress, Overdue | Org-wide health overview — all four signals matter at this level |
| Org Owner | *(none by default)* | Per-org health cards already surface the key numbers; KPI row would be redundant clutter |
| Project Manager | *(none by default)* | PM's most relevant metrics depend on how they use the tool; let them build their own set |
| QC Technician | *(none by default)* | Personal card layout already communicates workload; add KPIs only if desired |
| QC Technician 2 | *(none by default)* | Same as above |

PM and technician roles intentionally start with no KPI cards. Users can add exactly the metrics they care about from the registry (or from their Analytics Dashboard) — building a signal set that's genuinely useful rather than one that was designed for a different person's workflow. Preferences persist per-role in localStorage.

Scans, Site Visits, and Sites tabs follow the same pattern — Admin gets sensible defaults, all other roles start empty.

#### Available Metrics by Tab

**Surveys**
Total Surveys · Completed · In Progress · Overdue · Unassigned · Not Started · Completion %

**Scans**
Total Scans · Total Files · Unallocated Scans · Unique Sites · Technicians

**Site Visits**
Total Visits · Processed · Unprocessed · In Progress · Scheduled · Completed · Cancelled

**Sites**
Total Sites · Overdue · Never Processed · Processed · Organizations · Has Site Visit

---

### Custom Data Analytics

**Route:** `/custom-data-analytics`

A natural-language query interface powered by Claude and the MCP database bridge. Users type a question in plain English; Claude queries the database through MCP tools and returns a formatted answer — including charts, tables, and KPI cards that can be saved directly to the Custom Dashboard.

**Key features:**
- **Suggested Questions panel** — role-specific prompts organized by category to help users understand what kinds of questions are worth asking
- **Inline chart preview** — bar, line, area, pie, or single-value metric card rendered immediately below the response
- **Add to Dashboard** — saves the current visualization to My Custom Dashboard
- **Save Chat** — downloads the full question and text response as a `.txt` file

**Two-layer access enforcement:**
1. *Frontend pre-check* — obvious violations are caught instantly before the API is called. A Technician asking about org-level data receives an immediate denial banner. No tokens consumed.
2. *Server-side enforcement* — Claude's system prompt includes explicit role-specific rules. Queries that pass the frontend check but still violate access rules are blocked by Claude, which returns the same denial UI.

---

### My Custom Dashboard

**Route:** `/custom-dashboard`

A personal drag-and-resize dashboard where charts and metrics saved from the Custom Data Analytics page are displayed in a free-form grid. Each role has a separate dashboard — Lucy's saved charts are not visible to Susan or Matt.

**Key features:**
- Drag and resize any widget freely on the grid
- **Save Dashboard** — snapshots the current layout and all widgets with a user-defined name
- **Saved Dashboards archive** — collapsible list of named snapshots; restore any saved state or delete old ones
- **Clear All** — removes all widgets from the active grid
- Metric cards saved here can be pinned into QA Dashboard KPI rows (see above)

---

## Getting Started

```bash
# Install dependencies
npm install

# Start both the Vite frontend and Express MCP bridge server
npm run dev:all

# Frontend only (http://localhost:5173)
npm run dev

# Backend only (http://localhost:3001)
npm run server
```

Required environment variables in `.env`:
```
ANTHROPIC_API_KEY=sk-ant-...
MCP_SERVER_PATH=path/to/your/mcp/server
DATABASE_URL=your_postgres_connection_string
SERVER_PORT=3001
```

To enable Power BI embeds, fill in `src/config/powerbi.config.ts` with real `reportId`, `embedUrl`, and `accessToken` values per role.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS v3 (custom dark FieldSync theme) |
| Routing | React Router v6 |
| Charts | Recharts |
| Dashboard grid | react-grid-layout v2 |
| BI embed | powerbi-client-react v2 |
| Icons | Lucide React |
| AI | Anthropic Claude (`claude-sonnet-4-6`) via `@anthropic-ai/sdk` |
| MCP bridge | Express + stdio MCP server |
| Database | PostgreSQL (via MCP tools) |
| State / persistence | React Context + localStorage |

---

## Project Structure

```
src/
  pages/
    QADashboard.tsx        # QA operations dashboard — all role views, KPI system, survey detail, assignment
    Dashboard.tsx          # My Custom Dashboard — drag/resize saved chart widgets
    DataAnalytics.tsx      # AI analytics chat + inline chart preview
    DemoGuide.tsx          # Demo Guide landing page + DemoStepOverlay floating component
  components/
    charts/ChartRenderer.tsx     # Renders bar/line/area/pie/metric from widget config
    mcp/AnalyticsOutput.tsx      # Chat response display + save/dashboard action buttons
    layout/Sidebar.tsx           # Role-gated navigation
    layout/TopNav.tsx            # Role switcher dropdown
    layout/Layout.tsx            # App shell — mounts DemoStepOverlay
  context/
    RoleContext.tsx         # Global role state
    DashboardContext.tsx    # Saved dashboard widgets (localStorage, per-role)
    DemoContext.tsx         # Demo walkthrough state — DEMO_STEPS, DemoProvider, useDemo()
  types/
    dashboard.ts            # DashboardWidget, ChartData, ChartType
  config/
    powerbi.config.ts       # Power BI embed config stubs
server/
  index.ts                  # Express + Anthropic SDK, SSE streaming, MCP bridge
```
