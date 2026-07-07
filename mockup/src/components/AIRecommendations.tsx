import { useState } from "react"
import { Sparkles, CheckCircle2, Circle } from "lucide-react"
import { products } from "../data/returns"

interface FlatRec {
  productName: string
  productId: string
  text: string
  priority: "Hoch" | "Mittel" | "Niedrig"
  impact: string
  effort: "Niedrig" | "Mittel" | "Hoch"
  done: boolean
  key: string
}

const priorityOrder = { Hoch: 0, Mittel: 1, Niedrig: 2 }

export function AIRecommendations() {
  const initial: FlatRec[] = products.flatMap(p =>
    p.recommendations.map((r, i) => ({
      productName: p.name,
      productId: p.id,
      text: r.text,
      priority: r.priority,
      impact: r.impact,
      effort: r.effort,
      done: r.done,
      key: `${p.id}-${i}`,
    }))
  ).sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])

  const [recs, setRecs] = useState(initial)
  const [filter, setFilter] = useState<"all" | "Hoch" | "Mittel" | "Niedrig">("all")

  const toggle = (key: string) => {
    setRecs(r => r.map(rec => rec.key === key ? { ...rec, done: !rec.done } : rec))
  }

  const visible = filter === "all" ? recs : recs.filter(r => r.priority === filter)
  const doneCount = recs.filter(r => r.done).length

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">KI-Empfehlungen</h2>
        <p className="text-sm text-gray-500 mt-0.5">{doneCount} von {recs.length} Empfehlungen erledigt</p>
      </div>

      <div className="w-full bg-gray-100 rounded-full h-1.5">
        <div
          className="bg-blue-600 h-1.5 rounded-full transition-all duration-500"
          style={{ width: `${(doneCount / recs.length) * 100}%` }}
        />
      </div>

      <div className="flex items-center gap-2">
        {(["all", "Hoch", "Mittel", "Niedrig"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              filter === f
                ? "bg-blue-600 text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:border-blue-300"
            }`}
          >
            {f === "all" ? "Alle" : f}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {visible.map(rec => (
          <div
            key={rec.key}
            onClick={() => toggle(rec.key)}
            className={`flex items-center gap-4 px-5 py-4 rounded-2xl border cursor-pointer transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md ${
              rec.done
                ? "bg-green-50 border-green-100"
                : "bg-white border-gray-100 shadow-sm"
            }`}
          >
            <div className="flex-shrink-0">
              {rec.done
                ? <CheckCircle2 size={18} className="text-green-500" />
                : <Circle size={18} className="text-gray-300" />
              }
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <Sparkles size={11} className={rec.done ? "text-green-500" : "text-blue-500"} />
                <p className={`text-sm font-semibold ${rec.done ? "line-through text-gray-400" : "text-gray-900"}`}>
                  {rec.text}
                </p>
              </div>
              <p className="text-xs text-gray-400">{rec.productName} · {rec.productId}</p>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-xs text-green-700 bg-green-50 border border-green-100 px-2 py-0.5 rounded-full font-medium">
                {rec.impact}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                rec.priority === "Hoch" ? "bg-red-50 text-red-600" :
                rec.priority === "Mittel" ? "bg-amber-50 text-amber-600" :
                "bg-gray-100 text-gray-500"
              }`}>
                {rec.priority}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-50 text-gray-500 font-medium border border-gray-100">
                Aufwand: {rec.effort}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
