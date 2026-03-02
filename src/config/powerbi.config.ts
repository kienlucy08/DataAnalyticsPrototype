export interface PBIConfig {
  reportId: string
  embedUrl: string
  accessToken: string
}

// Stub configs — replace with real values from your Azure/Power BI workspace
export const PBI_CONFIGS: Record<'admin' | 'pm' | 'technician', PBIConfig> = {
  admin: {
    reportId: '',       // e.g. 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
    embedUrl: '',       // e.g. 'https://app.powerbi.com/reportEmbed?reportId=...'
    accessToken: '',    // embed token from Azure AD
  },
  pm: {
    reportId: '',
    embedUrl: '',
    accessToken: '',
  },
  technician: {
    reportId: '',
    embedUrl: '',
    accessToken: '',
  },
}
