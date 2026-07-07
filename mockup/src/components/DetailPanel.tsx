import { X, Sparkles, AlertTriangle, CheckCircle2, FileText, ShieldCheck } from "lucide-react"
import type { Product } from "../data/returns"
import { useState } from "react"

function Badge({ rate }: { rate: number }) {
  if (rate >= 35) return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-600">{rate.toFixed(1)}%</span>
  if (rate >= 20) return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-600">{rate.toFixed(1)}%</span>
  return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-600">{rate.toFixed(1)}%</span>
}

export function DetailPanel({ product, onClose }: { product: Product; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<"ai" | "quality" | "description">("ai")
  const [descAccepted, setDescAccepted] = useState(false)
  const [recs, setRecs] = useState(product.recommendations)

  const tabs = [
    { id: "ai" as const, label: "KI-Analyse", icon: Sparkles },
    { id: "quality" as const, label: "Qualität", icon: ShieldCheck },
    { id: "description" as const, label: "Beschreibung", icon: FileText },
  ]

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <aside className="w-[640px] bg-white h-full overflow-y-auto shadow-2xl flex flex-col">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <p className="text-xs text-gray-400 font-medium">{product.id}</p>
            <h2 className="font-bold text-gray-900 text-base leading-tight">{product.name}</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-50 transition-colors text-gray-500">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 px-6 py-5 space-y-5">
          {/* Product info */}
          <div className="flex gap-4">
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-24 h-24 rounded-xl object-cover bg-gray-100 flex-shrink-0"
            />
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              {[
                ["Artikelnummer", product.id],
                ["Kategorie", product.category],
                ["Farbe", product.color],
                ["Größe", product.size],
              ].map(([k, v]) => (
                <div key={k}>
                  <p className="text-xs text-gray-400">{k}</p>
                  <p className="font-medium text-gray-800">{v}</p>
                </div>
              ))}
              <div>
                <p className="text-xs text-gray-400">Retourenquote</p>
                <Badge rate={product.returnRate} />
              </div>
              <div>
                <p className="text-xs text-gray-400">KI-Status</p>
                <p className="font-medium text-gray-800">{product.aiStatus}</p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-gray-50 p-1 rounded-xl">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all duration-150 ${
                  activeTab === id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <Icon size={12} />
                {label}
              </button>
            ))}
          </div>

          {/* Tab: AI Analysis */}
          {activeTab === "ai" && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <Sparkles size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-blue-700 mb-1">KI-Hinweis</p>
                    <p className="text-sm text-blue-800 leading-relaxed">{product.aiInsight}</p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Häufige Kundenkommentare</h4>
                <div className="space-y-2">
                  {product.comments.map((c, i) => (
                    <div key={i} className="bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-700 italic leading-relaxed">
                      {c}
                    </div>
                  ))}
                </div>
              </div>

              {recs.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Empfehlungen</h4>
                  <div className="space-y-2">
                    {recs.map((rec) => (
                      <div
                        key={rec.id}
                        className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
                          rec.done ? "bg-green-50 border-green-100" : "bg-white border-gray-100"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <button
                            onClick={() => setRecs(recs.map((r) => r.id === rec.id ? { ...r, done: !r.done } : r))}
                            className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border transition-colors ${
                              rec.done ? "bg-green-500 border-green-500" : "border-gray-300 hover:border-blue-400"
                            }`}
                          >
                            {rec.done && <CheckCircle2 size={10} className="text-white" />}
                          </button>
                          <span className={`text-sm font-medium ${rec.done ? "line-through text-gray-400" : "text-gray-800"}`}>
                            {rec.text}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                          <span className="text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full">{rec.impact}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            rec.priority === "Hoch" ? "bg-red-50 text-red-600" :
                            rec.priority === "Mittel" ? "bg-amber-50 text-amber-600" :
                            "bg-gray-100 text-gray-500"
                          }`}>{rec.priority}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab: Quality */}
          {activeTab === "quality" && (
            <div className="space-y-4">
              {product.qualityIssues.length > 0 ? (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Erkannte Qualitätsprobleme</h4>
                  {product.qualityIssues.map((issue, i) => (
                    <div key={i} className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                      <AlertTriangle size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-red-800">{issue}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-3 bg-green-50 border border-green-100 rounded-xl px-4 py-4">
                  <CheckCircle2 size={16} className="text-green-600" />
                  <p className="text-sm text-green-800 font-medium">Keine Qualitätsprobleme erkannt.</p>
                </div>
              )}

              <div className="flex flex-col gap-2 pt-2">
                <button className="w-full py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors">
                  Qualitätsprüfung starten
                </button>
                <button className="w-full py-2.5 rounded-xl border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition-colors">
                  Ticket an Qualitätsmanagement
                </button>
              </div>
            </div>
          )}

          {/* Tab: Description */}
          {activeTab === "description" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Aktuelle Beschreibung</p>
                  <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 leading-relaxed min-h-[120px]">
                    {product.description}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Sparkles size={10} /> KI-Optimiert
                  </p>
                  <div className={`rounded-xl p-4 text-sm leading-relaxed min-h-[120px] border transition-all ${
                    descAccepted ? "bg-green-50 border-green-200 text-green-900" : "bg-blue-50 border-blue-100 text-blue-900"
                  }`}>
                    {product.aiDescription}
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setDescAccepted(true)}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
                  disabled={descAccepted}
                >
                  {descAccepted ? "✓ Übernommen" : "Änderungen übernehmen"}
                </button>
                <button
                  onClick={() => setDescAccepted(false)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition-colors"
                >
                  Ablehnen
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>
    </div>
  )
}
