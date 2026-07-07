import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import { pieData, barData } from "../data/returns"

const RADIAN = Math.PI / 180
const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  return percent > 0.08 ? (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  ) : null
}

export function ReturnPieChart() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 h-full">
      <h3 className="font-semibold text-gray-900 text-sm mb-1">Häufigste Retourengründe</h3>
      <p className="text-xs text-gray-400 mb-4">Gesamtverteilung aller Rücksendungen</p>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={pieData}
            cx="50%"
            cy="50%"
            outerRadius={88}
            innerRadius={44}
            dataKey="value"
            labelLine={false}
            label={renderLabel}
          >
            {pieData.map((entry, index) => (
              <Cell key={index} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number) => [`${value}%`, ""]}
            contentStyle={{ borderRadius: 12, border: "1px solid #f0f0f0", fontSize: 12 }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2">
        {pieData.map((d) => (
          <div key={d.name} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
            <span className="text-xs text-gray-500">{d.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function ReturnBarChart() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 h-full">
      <h3 className="font-semibold text-gray-900 text-sm mb-1">Retourenquote nach Produkt</h3>
      <p className="text-xs text-gray-400 mb-4">Prozentsatz zurückgesendeter Artikel</p>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={barData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 10, fill: "#9ca3af" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "#9ca3af" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip
            formatter={(value: number) => [`${value}%`, "Retourenquote"]}
            contentStyle={{ borderRadius: 12, border: "1px solid #f0f0f0", fontSize: 12 }}
          />
          <Bar
            dataKey="rate"
            fill="#2563EB"
            radius={[6, 6, 0, 0]}
            maxBarSize={48}
          >
            {barData.map((entry, index) => (
              <Cell
                key={index}
                fill={entry.rate >= 35 ? "#EF4444" : entry.rate >= 20 ? "#F59E0B" : "#22C55E"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
