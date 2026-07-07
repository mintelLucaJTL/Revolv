import {
  LayoutDashboard,
  RotateCcw,
  ShieldCheck,
  FileText,
  Sparkles,
  Settings,
  TrendingDown,
} from "lucide-react"

type Page = "dashboard" | "returns" | "quality" | "descriptions" | "ai" | "settings"

const nav = [
  { id: "dashboard" as Page, label: "Dashboard", icon: LayoutDashboard },
  { id: "returns" as Page, label: "Retourenanalyse", icon: RotateCcw },
  { id: "quality" as Page, label: "Qualitätsprüfung", icon: ShieldCheck },
  { id: "descriptions" as Page, label: "Produktbeschreibungen", icon: FileText },
  { id: "ai" as Page, label: "KI-Empfehlungen", icon: Sparkles },
  { id: "settings" as Page, label: "Einstellungen", icon: Settings },
]

export function Sidebar({ active, onNavigate }: { active: Page; onNavigate: (p: Page) => void }) {
  return (
    <aside className="fixed left-0 top-0 h-full w-60 bg-white border-r border-gray-100 flex flex-col z-40">
      <div className="flex items-center gap-2.5 px-6 h-16 border-b border-gray-100">
        <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
          <TrendingDown size={15} className="text-white" />
        </div>
        <span className="font-semibold text-gray-900 text-sm tracking-tight">ReturnIQ</span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {nav.map(({ id, label, icon: Icon }) => {
          const isActive = active === id
          return (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 text-left ${
                isActive
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
              }`}
            >
              <Icon size={16} strokeWidth={isActive ? 2.2 : 1.8} />
              {label}
            </button>
          )
        })}
      </nav>

      <div className="px-4 pb-5">
        <div className="bg-blue-50 rounded-xl p-3.5">
          <p className="text-xs font-semibold text-blue-700 mb-1">KI-Analyse aktiv</p>
          <p className="text-xs text-blue-500 leading-relaxed">
            Letzte Aktualisierung: heute, 09:14 Uhr
          </p>
        </div>
      </div>
    </aside>
  )
}

export type { Page }
