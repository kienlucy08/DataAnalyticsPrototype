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

- **Surveys** — status (`Unassigned → Pending → In Progress → Completed / Overdue`), assigned technician, priority (`High / Medium / Low`, auto-elevated to High when overdue), progress percentage, created date, due date, completed date
- **Scans** — technician, site, organization, file count, site visit linkage (or "unallocated" if not yet linked)
- **Site Visits** — assignee, scheduled date, processing status, processed-by name, and processing date
- **Sites** — last visit date, last processing timestamp, overdue flag

This creates a clear audit trail across the full lifecycle of field work — from creating a survey and assigning it, through active inspection, to final processing and sign-off.

#### Role Views

**Admin** — Full org-wide view. All surveys, scans, site visits, and sites across every organization. Includes an overall completion rate progress bar to surface systemic bottlenecks.

**Org Owner** — Per-organization health cards showing each org's total surveys, completed, in-progress, overdue, and completion rate. Clean overview by default — no KPI cards at the top so the page doesn't feel cluttered. Users can add KPI cards if they want (see Customizable KPI Cards below).

**Project Manager** — Two focused tables: *Needs Assignment* (unassigned surveys with inline technician assignment dropdown) and *Assigned Surveys* (active work with progress bars and status badges). Defaults to metrics most useful for workload management: Completed, In Progress, Overdue, Unassigned.

**QC Technician (Matt)** — Personal view only. Active surveys shown as priority-ordered cards with a priority-lock system: high-priority surveys must be addressed before lower-priority ones are accessible. Completed surveys shown in a history table.

**QC Technician 2 (John)** — Same technician view with priority-lock. Scoped to John's own surveys, scans, and site visits.

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
| Admin | Total, Completed, In Progress, Overdue | Org-wide health overview |
| Org Owner | *(none by default)* | Per-org breakdown cards already cover this; avoid clutter |
| Project Manager | Completed, In Progress, Overdue, **Unassigned** | Assignment backlog is the primary PM concern |
| QC Technician | Completed, In Progress, Overdue, **Pending** | Personal progress signals; pending = not yet started |
| QC Technician 2 | Completed, In Progress, Overdue, **Pending** | Same as above |

Scans, Site Visits, and Sites tabs use the same defaults across all roles since those tables are less role-differentiated.

#### Available Metrics by Tab

**Surveys**
Total Surveys · Completed · In Progress · Overdue · Unassigned · Pending (Not Started) · Completion %

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
    QADashboard.tsx        # QA operations dashboard — role views, KPI system, data tables
    Dashboard.tsx          # My Custom Dashboard — drag/resize saved chart widgets
    DataAnalytics.tsx      # AI analytics chat + inline chart preview
  components/
    charts/ChartRenderer.tsx     # Renders bar/line/area/pie/metric from widget config
    mcp/AnalyticsOutput.tsx      # Chat response display + save/dashboard action buttons
    layout/Sidebar.tsx           # Role-gated navigation
    layout/TopNav.tsx            # Role switcher dropdown
  context/
    RoleContext.tsx         # Global role state
    DashboardContext.tsx    # Saved dashboard widgets (localStorage, per-role)
  types/
    dashboard.ts            # DashboardWidget, ChartData, ChartType
  config/
    powerbi.config.ts       # Power BI embed config stubs
server/
  index.ts                  # Express + Anthropic SDK, SSE streaming, MCP bridge
```
