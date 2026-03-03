import React from 'react'
import { PowerBIEmbed } from 'powerbi-client-react'
import { models } from 'powerbi-client'
import { BarChart3, AlertCircle } from 'lucide-react'
import type { PBIConfig } from '../../config/powerbi.config'

interface Props {
  config: PBIConfig
  title: string
}

const isIframeConfigured = (config: PBIConfig): boolean => Boolean(config.iframeUrl)

const isAzureConfigured = (config: PBIConfig): boolean =>
  Boolean(config.embedUrl && config.accessToken && config.reportId)

const PowerBIDashboard: React.FC<Props> = ({ config, title }) => {
  // Prefer "Publish to web" iframe if available
  if (isIframeConfigured(config)) {
    return (
      <div className="w-full rounded-xl overflow-hidden border border-border bg-card">
        <iframe
          src={config.iframeUrl}
          title={title}
          className="w-full h-[600px] border-0"
          allowFullScreen
        />
      </div>
    )
  }

  // Fallback: Azure AD authenticated embed
  if (isAzureConfigured(config)) {
    return (
      <div className="w-full rounded-xl overflow-hidden border border-border">
        <PowerBIEmbed
          embedConfig={{
            type: 'report',
            id: config.reportId,
            embedUrl: config.embedUrl,
            accessToken: config.accessToken,
            tokenType: models.TokenType.Embed,
            settings: {
              background: models.BackgroundType.Transparent,
              panes: {
                filters: { visible: false },
                pageNavigation: { visible: true },
              },
            },
          }}
          cssClassName="w-full h-[600px] border-0"
          eventHandlers={
            new Map([
              ['loaded', () => console.log('Power BI report loaded')],
              ['error', (event: unknown) => console.error('Power BI error:', event)],
            ])
          }
        />
      </div>
    )
  }

  // Not configured
  return (
    <div className="flex flex-col items-center justify-center w-full min-h-[480px] rounded-xl border border-border bg-card gap-5">
      <div className="flex items-center justify-center w-16 h-16 rounded-full bg-surface border border-border">
        <BarChart3 className="w-8 h-8 text-accent" />
      </div>
      <div className="text-center max-w-md px-4">
        <h3 className="text-text-primary font-semibold text-lg mb-2">
          {title}
        </h3>
        <p className="text-text-secondary text-sm leading-relaxed">
          Add an{' '}
          <code className="text-accent bg-surface px-1.5 py-0.5 rounded text-xs font-mono">iframeUrl</code>{' '}
          (Publish to web) or Azure AD embed credentials to{' '}
          <span className="text-text-primary font-medium">src/config/powerbi.config.ts</span>.
        </p>
      </div>
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface border border-border-light">
        <AlertCircle className="w-3.5 h-3.5 text-text-muted" />
        <span className="text-text-muted text-xs">Awaiting embed configuration</span>
      </div>
    </div>
  )
}

export default PowerBIDashboard
