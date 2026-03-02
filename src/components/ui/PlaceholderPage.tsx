import React from 'react'
import { Construction } from 'lucide-react'

interface Props {
  title: string
}

const PlaceholderPage: React.FC<Props> = ({ title }) => (
  <div className="flex flex-col items-center justify-center flex-1 gap-4 min-h-[400px]">
    <div className="flex items-center justify-center w-16 h-16 rounded-full bg-card border border-border">
      <Construction className="w-8 h-8 text-accent" />
    </div>
    <div className="text-center">
      <h2 className="text-text-primary text-xl font-semibold mb-1">{title}</h2>
      <p className="text-text-secondary text-sm">This section is coming soon.</p>
    </div>
  </div>
)

export default PlaceholderPage
