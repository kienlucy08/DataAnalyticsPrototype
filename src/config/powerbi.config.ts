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
    iframeUrl: 'https://app.powerbi.com/onedrive/open?pbi_source=ODSPViewer&driveId=b!hTeS7dxrnEmCaX5mSyx1hpmsDuLywdlOlL_3cYtie1U0BSRs4Z4DSa1HwjKb8qGu&itemId=01235L3J2K26SKVJSXSZCKAP7JJQHGTFOF',      // paste your "Publish to web" src URL here
    reportId: '',       // Azure AD: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
    embedUrl: '',       // Azure AD: 'https://app.powerbi.com/reportEmbed?reportId=...'
    accessToken: '',    // Azure AD: embed token from backend
  },
  pm: {
    iframeUrl: 'https://app.powerbi.com/reportEmbed?reportId=0ecbf9f8-dfdc-456a-a537-367a5d0585da&autoAuth=true&ctid=f7315aa7-49bd-4b20-9699-d1480b9b30b5',
    reportId: '',
    embedUrl: '',
    accessToken: '',
  },
  technician: {
    iframeUrl: 'https://app.powerbi.com/reportEmbed?reportId=aff3106d-cae9-4e1c-9310-2e642afa66f0&autoAuth=true&ctid=f7315aa7-49bd-4b20-9699-d1480b9b30b5',
    reportId: '',
    embedUrl: '',
    accessToken: '',
  },
}
