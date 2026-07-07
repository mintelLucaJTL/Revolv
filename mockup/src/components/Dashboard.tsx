import { RotateCcw, Package, Sparkles, CheckCircle2 } from "lucide-react"
import { KPICard } from "./KPICard"
import { ReturnPieChart, ReturnBarChart } from "./Charts"

const kpis = [
  {
    label: "Gesamte Retourenquote",
    value: "24,8%",
    trend: "−2.3%",
    trendUp: false,
    trendPositive: true,
    icon: RotateCcw,
    iconBg: "bg-blue-50",
    iconColor: "text-blue-600",
  },
  {
    label: "Betroffene Artikel",
    value: "142",
    trend: "+8",
    trendUp: true,
    trendPositive: false,
    icon: Package,
    iconBg: "bg-red-50",
    iconColor: "text-red-500",
  },
  {
    label: "KI-Empfehlungen offen",
    value: "37",
    trend: "−5 diese Woche",
    trendUp: false,
    trendPositive: true,
    icon: Sparkles,
    iconBg: "bg-amber-50",
    iconColor: "text-amber-500",
  },
  {
    label: "Verbesserte Produkte",
    value: "89",
    trend: "+12 diesen Monat",
    trendUp: true,
    trendPositive: true,
    icon: CheckCircle2,
    iconBg: "bg-green-50",
    iconColor: "text-green-600",
  },
]

export function Dashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">Übersicht</h2>
        <p className="text-sm text-gray-500">Retourenanalyse — Juli 2026</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <KPICard key={kpi.label} {...kpi} />
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <ReturnPieChart />
        <ReturnBarChart />
      </div>
    </div>
  )
}
