import { useState } from "react"
import { Sparkles, Check, X } from "lucide-react"
import { products } from "../data/returns"

export function DescriptionsPage() {
  const [selectedId, setSelectedId] = useState(products[0].id)
  const [accepted, setAccepted] = useState<Record<string, boolean>>({})

  const product = products.find(p => p.id === selectedId)!
  const isAccepted = accepted[selectedId]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Produktbeschreibungen</h2>
        <p className="text-sm text-gray-500 mt-0.5">KI-optimierte Beschreibungen zur Reduzierung von Retouren</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {products.map(p => (
          <button
            key={p.id}
            onClick={() => setSelectedId(p.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              selectedId === p.id ? "bg-blue-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-blue-300"
            }`}
          >
            {p.id}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900 text-sm">{product.name}</h3>
            <p className="text-xs text-gray-400 mt-0.5">{product.id} · {product.category}</p>
          </div>
          <span className="text-xs px-2.5 py-1 bg-red-50 text-red-600 font-semibold rounded-full">
            {product.returnRate.toFixed(1)}% Retourenquote
          </span>
        </div>

        <div className="grid grid-cols-2 divide-x divide-gray-100">
          <div className="p-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Aktuelle Beschreibung</p>
            <p className="text-sm text-gray-700 leading-relaxed">{product.description}</p>
          </div>
          <div className="p-5">
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-3 flex items-center gap-1">
              <Sparkles size={10} /> KI-optimierte Beschreibung
            </p>
            <p className={`text-sm leading-relaxed transition-colors ${isAccepted ? "text-green-900" : "text-gray-700"}`}>
              {product.aiDescription}
            </p>
            {isAccepted && (
              <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-green-700">
                <Check size={12} /> Übernommen
              </div>
            )}
          </div>
        </div>

        <div className="px-5 py-4 border-t border-gray-100 flex gap-3">
          <button
            onClick={() => setAccepted(a => ({ ...a, [selectedId]: true }))}
            disabled={isAccepted}
            className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Check size={14} /> Änderungen übernehmen
          </button>
          <button
            onClick={() => setAccepted(a => ({ ...a, [selectedId]: false }))}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
          >
            <X size={14} /> Ablehnen
          </button>
        </div>
      </div>
    </div>
  )
}
