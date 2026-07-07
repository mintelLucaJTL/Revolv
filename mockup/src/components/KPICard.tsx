import type { LucideIcon } from "lucide-react"
import { TrendingUp, TrendingDown } from "lucide-react"

interface KPICardProps {
  label: string
  value: string
  trend: string
  trendUp: boolean
  trendPositive: boolean
  icon: LucideIcon
  iconBg: string
  iconColor: string
}

export function KPICard({
  label,
  value,
  trend,
  trendUp,
  trendPositive,
  icon: Icon,
  iconBg,
  iconColor,
}: KPICardProps) {
  const TrendIcon = trendUp ? TrendingUp : TrendingDown
  const trendColor = trendPositive ? "text-green-600" : "text-red-500"
  const trendBg = trendPositive ? "bg-green-50" : "bg-red-50"

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 cursor-default">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center`}>
          <Icon size={18} className={iconColor} />
        </div>
        <span className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg ${trendBg} ${trendColor}`}>
          <TrendIcon size={11} />
          {trend}
        </span>
      </div>
      <p className="text-2xl font-bold text-gray-900 mb-1 tracking-tight">{value}</p>
      <p className="text-xs text-gray-500 font-medium">{label}</p>
    </div>
  )
}
