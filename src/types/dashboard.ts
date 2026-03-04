export type ChartType = 'bar' | 'line' | 'area' | 'pie' | 'metric' | 'table'

export interface DashboardWidget {
  id: string
  type: ChartType
  title: string
  xKey?: string
  yKey?: string
  dataKeys?: string[]
  nameKey?: string
  valueKey?: string
  value?: number | string
  label?: string
  data: Record<string, unknown>[]
  layout: { x: number; y: number; w: number; h: number }
  createdAt: number
}

export interface SavedDashboard {
  id: string
  name: string
  widgets: DashboardWidget[]
  savedAt: number
}

export interface ChartData {
  type: ChartType
  title: string
  xKey?: string
  yKey?: string
  dataKeys?: string[]
  nameKey?: string
  valueKey?: string
  value?: number | string
  label?: string
  data: Record<string, unknown>[]
}
