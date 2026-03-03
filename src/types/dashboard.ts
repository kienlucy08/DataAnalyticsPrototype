export interface DashboardWidget {
  id: string
  type: 'bar' | 'line' | 'area' | 'pie'
  title: string
  xKey?: string
  yKey?: string
  dataKeys?: string[]
  nameKey?: string
  valueKey?: string
  data: Record<string, unknown>[]
  layout: { x: number; y: number; w: number; h: number }
  createdAt: number
}

export interface ChartData {
  type: 'bar' | 'line' | 'area' | 'pie'
  title: string
  xKey?: string
  yKey?: string
  dataKeys?: string[]
  nameKey?: string
  valueKey?: string
  data: Record<string, unknown>[]
}
