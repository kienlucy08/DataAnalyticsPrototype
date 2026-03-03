# DataAnalyticsPrototype

FieldSync-style data analytics dashboard prototype built with Vite + React 18 + TypeScript + Tailwind CSS.

## Stack

- Vite + React 18 + TypeScript
- React Router v6
- Tailwind CSS v3 (custom dark theme tokens)
- powerbi-client-react + powerbi-client
- Lucide React icons

## Running locally

```bash
npm install
npm run dev
# http://localhost:5173
```

## Power BI Embed

Two embed modes are supported. Configure them in `src/config/powerbi.config.ts`.

### Option 1 — Publish to web (current, no auth required)

1. Open your report in Power BI Service (app.powerbi.com)
2. **File → Embed report → Publish to web (public)**
3. Copy the iframe `src` URL (looks like `https://app.powerbi.com/view?r=...`)
4. Paste it into the `iframeUrl` field for the relevant role in `powerbi.config.ts`

> **Note:** Publish to web is public — anyone with the link can view the report.
> Suitable for prototyping; not recommended for production with sensitive data.

### Option 2 — Azure AD authenticated embed (future)

For production use with access control, Row-Level Security (RLS), and token-based auth:

**Prerequisites:**
- Active Azure subscription
- Azure AD App Registration with Power BI API permissions (`Report.Read.All`, `Dataset.Read.All`)
- Report published to a **shared Power BI workspace** (not My Workspace)
- Service principal or delegated auth backend to vend embed tokens

**Setup steps (when ready):**
1. Register an app in Azure AD → note Tenant ID, Client ID, Client Secret
2. Grant Power BI API permissions + admin consent
3. Move `.pbix` to a shared workspace in Power BI Service
4. Add the service principal as a workspace Member
5. Build a backend endpoint to call the Power BI REST API and return an embed token
6. Fill in `reportId`, `embedUrl`, and `accessToken` in `powerbi.config.ts`

The app will automatically use the Azure embed path when those fields are set, falling back to the iframe if only `iframeUrl` is provided.

## Roles

The top-nav role switcher cycles between three views: **Admin**, **PM**, and **Technician**. Each role maps to its own Power BI config entry.
