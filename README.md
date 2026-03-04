# FieldSync Data Analytics Prototype

A role-aware analytics dashboard prototype for FieldSync infrastructure inspection data. Built with React, TypeScript, Tailwind CSS, and a Claude-powered MCP (Model Context Protocol) bridge for natural-language database queries.

---

## Getting Started

```bash
# Install dependencies
npm install

# Start both the Vite frontend and Express MCP bridge server
npm run dev:all
```

- Frontend: http://localhost:5173
- MCP bridge server: http://localhost:3001

Required environment variables in `.env`:
```
API_KEY=your_anthropic_api_key
MCP_SERVER_PATH=path/to/your/mcp/server
DATABASE_URL=your_postgres_connection_string
SERVER_PORT=3001
```

---

## Role Switcher

The top navigation includes a role switcher that simulates three different user personas. Each persona has a different scope of data access enforced at both the frontend (instant pre-check) and server (Claude system prompt) levels.

| Role | Persona | Access Scope |
|---|---|---|
| **Admin** | Lucy Kien | Full access — all organizations, all users, all surveys, all metrics |
| **Project Manager** | Susan Smith | FieldSync Organization and Test only |
| **Technician** | Matt Edrich | Own surveys and personal performance data only |

Switching roles reloads all dashboard state — each persona has a completely separate saved dashboard in localStorage.

---

## Pages

### PowerBI Dashboard

**Route:** `/powerbi-dashboard`

Embeds a Power BI report scoped to the current role. Each role sees a different report configured in `src/config/powerbi.config.ts`. This page is best used for **pre-built, structured executive reporting** — visualizations designed and published by a BI team, with consistent branding and layout. It does not require the MCP server to be running.

> Best for: scheduled reporting, sharing standardized views with stakeholders, consuming pre-defined KPIs.

**Power BI embed modes:**

*Option 1 — Publish to web (no auth required, suitable for prototyping):*
1. Open your report in Power BI Service (app.powerbi.com)
2. **File → Embed report → Publish to web (public)**
3. Copy the iframe `src` URL and paste it into the `iframeUrl` field for the relevant role in `src/config/powerbi.config.ts`

> Note: Publish to web is public — anyone with the link can view the report. Not recommended for sensitive data.

*Option 2 — Azure AD authenticated embed (production):*
For access control, Row-Level Security (RLS), and token-based auth, fill in `reportId`, `embedUrl`, and `accessToken` in `powerbi.config.ts`. Requires an Azure AD App Registration with Power BI API permissions and a backend that vends embed tokens.

---

### QA Dashboard

**Route:** `/qa-dashboard`

A workflow-oriented survey management view. Unlike the analytics pages, this page shows **live operational status** of active surveys — what needs action right now. The view adapts entirely based on the current role:

#### Admin View (Lucy Kien)
Sees the full picture across all organizations and all technicians:
- **KPI cards** — total surveys, completed, in-progress, and overdue counts at a glance
- **Completion rate bar** — overall progress across all active work
- **Full survey table** — every survey in the system, including organization, assignee, status badge, and priority

This view is designed for identifying systemic bottlenecks — which organizations have the most overdue work, which technicians are overloaded, and the overall health of the inspection pipeline across the platform.

#### Project Manager View (Susan Smith)
Scoped to Susan's organizations (FieldSync Org and Test Org) only. Split into two focused tables:

- **Needs Assignment** — surveys with no technician assigned yet, sorted by priority (High / Medium / Low) and due date. Each row has an inline technician assignment dropdown so the PM can act immediately without navigating away.
- **Assigned Surveys** — surveys already in progress, showing the assignee name, a color-coded progress bar, current status (Pending / In Progress / Completed / Overdue), and due date.

This layout mirrors real PM responsibilities: clear the unassigned backlog, then monitor active work. Both concerns live in the same view so there's no need to cross-reference separate lists.

Susan does not see surveys belonging to organizations outside her scope — this is consistent with the access rules enforced in the Custom Data Analytics page.

#### Technician View (Matt Edrich)
Shows only Matt's own surveys, split into two sections:

- **In Progress** — progress cards for each active survey showing site name, organization, a completion percentage bar, and due date. The bar color shifts from amber (under 50%) to blue (50–99%) to green (100%) as work advances.
- **Completed Surveys** — a history table of finished surveys with completion date and deficiency count. Rows with a high deficiency count are highlighted in amber to surface outliers.

Technicians have no operational reason to see org-level statistics, other technicians' workloads, or cross-organization data. This focused view gives Matt exactly what he needs — active assignments and personal history — with nothing extraneous. This principle extends to the Custom Data Analytics page, where the same access boundaries are enforced when Matt queries data.

---

### Custom Data Analytics

**Route:** `/custom-data-analytics`

A natural-language query interface powered by Claude and the MCP database bridge. Users type a question in plain English; Claude queries the PostgreSQL database through MCP tools and returns a formatted answer — including charts, tables, and KPI cards that can be saved directly to the Custom Dashboard.

**Key features:**

- **Suggested Questions panel** — role-specific prompts organized by category (Organization Overview, Tower Analysis, Deficiencies & Safety, etc.) to help users understand what kinds of questions are worth asking
- **Chart type switcher** — after Claude returns a result, switch between Bar, Line, Area, Pie, Card (metric), or Table views before saving to the dashboard
- **Add to Dashboard** — saves the current visualization to My Custom Dashboard in the selected display type
- **Save Chat** — downloads the full question and text response as a `.txt` file

**Access enforcement — two-layer permission model:**

1. *Frontend pre-check* — obvious violations are caught instantly before the API is called. A Technician asking about organization-level data, or a PM asking about organizations outside their scope, receives an immediate ⛔ denial banner. No tokens are consumed.
2. *Server-side enforcement* — Claude's system prompt includes explicit role-specific rules. Queries that pass the frontend check but still violate access rules (e.g. ambiguous phrasing) are blocked by Claude itself, which returns a denial response using the same ⛔ banner UI.

**When to use this page vs PowerBI Dashboard:**
- Use **PowerBI Dashboard** for standardized, pre-built reports with consistent formatting (weekly KPIs, executive summaries, embedded RLS-filtered views).
- Use **Custom Data Analytics** for one-off questions, ad-hoc deep-dives, and exploring patterns not covered by existing reports. Results are generated on-demand from live data and can be saved to a personal dashboard.

---

### My Custom Dashboard

**Route:** `/custom-dashboard`

A personal, fully customizable dashboard where charts and tables saved from the Custom Data Analytics page are displayed in a drag-and-resize grid. Each user persona has their own separate dashboard — Lucy's saved charts are not visible to Susan or Matt.

**Key features:**
- **Drag and resize** any widget freely on the grid
- **Save Dashboard** — snapshots the current grid layout and all widgets with a name of your choice
- **Saved Dashboards archive** — collapsible accordion listing all named snapshots; click Restore to reload any saved state, or delete snapshots you no longer need
- **Clear All** — removes all widgets from the active grid

**Default widget sizes on save:**
- Charts (bar, line, area, pie, metric card): 6 columns wide, 4 rows tall — two per row
- Tables: 12 columns wide (full width), 6 rows tall — one per row with space for data rows

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
