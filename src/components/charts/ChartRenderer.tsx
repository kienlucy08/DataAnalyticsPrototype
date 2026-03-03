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
  widget: Pick<DashboardWidget, 'type' | 'data' | 'xKey' | 'yKey' | 'dataKeys' | 'nameKey' | 'valueKey'>
  height?: number
}

const ChartRenderer: React.FC<Props> = ({ widget, height = 260 }) => {
  const { type, data, xKey, yKey, dataKeys, nameKey = 'name', valueKey = 'value' } = widget

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

  const sharedProps = {
    data,
    margin: { top: 4, right: 16, left: 0, bottom: 4 },
  }

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
            <Line
              key={k}
              type="monotone"
              dataKey={k}
              stroke={COLORS[i % COLORS.length]}
              strokeWidth={2}
              dot={false}
            />
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
            <Area
              key={k}
              type="monotone"
              dataKey={k}
              stroke={COLORS[i % COLORS.length]}
              fill={COLORS[i % COLORS.length]}
              fillOpacity={0.15}
              strokeWidth={2}
            />
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
