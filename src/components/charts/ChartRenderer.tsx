import React from 'react'
import {
  ResponsiveContainer,
  BarChart, Bar,
  LineChart, Line,
  AreaChart, Area,
  PieChart, Pie, Cell,
  CartesianGrid,
  XAxis, YAxis,
  Tooltip,
  Legend,
} from 'recharts'
import type { DashboardWidget } from '../../types/dashboard'

const COLORS = ['#4f8ef7', '#6ba3f9', '#8b9ab5', '#f7a54f', '#4ff7a5', '#f74f8e', '#a54ff7']

const TOOLTIP_STYLE = {
  backgroundColor: '#151d2e',
  border: '1px solid #242f4a',
  borderRadius: '8px',
  color: '#fff',
  fontSize: 12,
}

const AXIS_STYLE = { fill: '#8b9ab5', fontSize: 11 }

interface Props {
  widget: Pick<DashboardWidget, 'type' | 'data' | 'xKey' | 'yKey' | 'dataKeys' | 'nameKey' | 'valueKey' | 'value' | 'label' | 'title'>
  height?: number
}

/** Extract the primary display value for a metric card */
function extractMetricValue(widget: Props['widget']): { display: string; sub: string } {
  // Explicit value field
  if (widget.value !== undefined) {
    return { display: String(widget.value), sub: widget.label ?? '' }
  }
  // Single data row — grab first numeric value
  if (widget.data?.length === 1) {
    const row = widget.data[0]
    const numEntry = Object.entries(row).find(([, v]) => typeof v === 'number')
    if (numEntry) {
      const num = numEntry[1] as number
      return {
        display: Number.isInteger(num) ? String(num) : num.toFixed(2),
        sub: widget.label ?? (numEntry[0] !== 'value' ? numEntry[0] : ''),
      }
    }
  }
  // Multiple rows — show count
  if (widget.data?.length > 1) {
    return { display: String(widget.data.length), sub: widget.label ?? 'records' }
  }
  return { display: '—', sub: '' }
}

const ChartRenderer: React.FC<Props> = ({ widget, height = 260 }) => {
  const { type, data, xKey, yKey, dataKeys, nameKey = 'name', valueKey = 'value' } = widget

  // ── Metric card ──────────────────────────────────────────────────────────
  if (type === 'metric') {
    const { display, sub } = extractMetricValue(widget)
    return (
      <div className="flex flex-col items-center justify-center h-full gap-1 py-4">
        <div className="text-4xl font-bold text-accent tabular-nums">{display}</div>
        {sub && <div className="text-text-muted text-xs text-center">{sub}</div>}
      </div>
    )
  }

  if (type === 'table') {
    if (!data || data.length === 0) {
      return (
        <div className="flex items-center justify-center h-full text-text-muted text-sm">No data</div>
      )
    }
    const columns = Object.keys(data[0])
    return (
      <div className="h-full overflow-auto">
        <table className="w-full text-xs border-collapse">
          <thead className="sticky top-0 z-10">
            <tr className="bg-surface border-b border-border">
              {columns.map(col => (
                <th key={col} className="px-3 py-2 text-left text-text-primary font-semibold whitespace-nowrap">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, ri) => (
              <tr key={ri} className="border-b border-border last:border-0 hover:bg-surface/50 transition-colors">
                {columns.map(col => (
                  <td key={col} className="px-3 py-2 text-text-secondary whitespace-nowrap">
                    {row[col] == null ? '—' : String(row[col])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-text-muted text-sm">
        No data
      </div>
    )
  }

  if (type === 'pie') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            dataKey={valueKey}
            nameKey={nameKey}
            cx="50%"
            cy="50%"
            outerRadius="70%"
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            labelLine={false}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Legend wrapperStyle={{ fontSize: 11, color: '#8b9ab5' }} />
        </PieChart>
      </ResponsiveContainer>
    )
  }

  const keys = dataKeys ?? (yKey ? [yKey] : [])
  const x = xKey ?? 'name'

  const sharedProps = { data, margin: { top: 4, right: 16, left: 0, bottom: 4 } }

  const sharedChildren = (
    <>
      <CartesianGrid strokeDasharray="3 3" stroke="#242f4a" />
      <XAxis dataKey={x} tick={AXIS_STYLE} axisLine={false} tickLine={false} />
      <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} width={40} />
      <Tooltip contentStyle={TOOLTIP_STYLE} />
      {keys.length > 1 && <Legend wrapperStyle={{ fontSize: 11, color: '#8b9ab5' }} />}
    </>
  )

  if (type === 'line') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <LineChart {...sharedProps}>
          {sharedChildren}
          {keys.map((k, i) => (
            <Line key={k} type="monotone" dataKey={k} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={false} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    )
  }

  if (type === 'area') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart {...sharedProps}>
          {sharedChildren}
          {keys.map((k, i) => (
            <Area key={k} type="monotone" dataKey={k} stroke={COLORS[i % COLORS.length]} fill={COLORS[i % COLORS.length]} fillOpacity={0.15} strokeWidth={2} />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    )
  }

  // default: bar
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart {...sharedProps}>
        {sharedChildren}
        {keys.map((k, i) => (
          <Bar key={k} dataKey={k} fill={COLORS[i % COLORS.length]} radius={[3, 3, 0, 0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}

export default ChartRenderer
