import { AlertTriangle, CheckCircle2, ShieldCheck } from "lucide-react"
import { products } from "../data/returns"

const issues = products
  .filter(p => p.qualityIssues.length > 0)
  .flatMap(p => p.qualityIssues.map(issue => ({ product: p.name, id: p.id, issue })))

export function QualityPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Qualitätsprüfung</h2>
        <p className="text-sm text-gray-500 mt-0.5">KI-erkannte Qualitätsprobleme im Sortiment</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Kritische Probleme", value: "4", color: "text-red-600", bg: "bg-red-50" },
          { label: "In Prüfung", value: "3", color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Gelöst diesen Monat", value: "11", color: "text-green-600", bg: "bg-green-50" },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`${bg} rounded-2xl p-5`}>
            <p className={`text-3xl font-bold ${color}`}>{value}</p>
            <p className="text-sm text-gray-600 mt-1">{label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900 text-sm">Gemeldete Qualitätsprobleme</h3>
        </div>
        <div className="divide-y divide-gray-50">
          {issues.map((item, i) => (
            <div key={i} className="flex items-start gap-4 px-5 py-4 hover:bg-gray-50/60 transition-colors">
              <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                <AlertTriangle size={14} className="text-red-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{item.issue}</p>
                <p className="text-xs text-gray-400 mt-0.5">{item.product} · {item.id}</p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors">
                  Prüfen
                </button>
                <button className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-50 transition-colors">
                  Ticket
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 bg-green-50 rounded-xl flex items-center justify-center">
            <CheckCircle2 size={16} className="text-green-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 text-sm">Gelöste Probleme</h3>
            <p className="text-xs text-gray-400">Diesen Monat abgeschlossen</p>
          </div>
        </div>
        {["Reißverschluss-Problem bei Modell ART-33104 behoben", "Neue Lieferanten-Qualitätsvereinbarung für Strick-Artikel"].map((item, i) => (
          <div key={i} className="flex items-center gap-3 py-2.5 border-t border-gray-50">
            <CheckCircle2 size={13} className="text-green-500 flex-shrink-0" />
            <p className="text-sm text-gray-700">{item}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
