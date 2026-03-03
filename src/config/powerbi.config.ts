export interface PBIConfig {
  // "Publish to web" public iframe URL — no auth required
  // Get this from Power BI Service: File → Embed report → Publish to web (public)
  iframeUrl?: string

  // Azure AD authenticated embed — requires app registration + embed token
  reportId: string
  embedUrl: string
  accessToken: string
}

export const PBI_CONFIGS: Record<'admin' | 'pm' | 'technician', PBIConfig> = {
  admin: {
    iframeUrl: 'https://fieldsyncservices.sharepoint.com/sites/FieldSyncOperations/_layouts/15/embed.aspx?UniqueId=aaa4d74a-57a6-4496-a03f-e94c0e6995c5',      // paste your "Publish to web" src URL here
    reportId: '',       // Azure AD: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
    embedUrl: '',       // Azure AD: 'https://app.powerbi.com/reportEmbed?reportId=...'
    accessToken: '',    // Azure AD: embed token from backend
  },
  pm: {
    iframeUrl: '',
    reportId: '',
    embedUrl: '',
    accessToken: '',
  },
  technician: {
    iframeUrl: '',
    reportId: '',
    embedUrl: '',
    accessToken: '',
  },
}
