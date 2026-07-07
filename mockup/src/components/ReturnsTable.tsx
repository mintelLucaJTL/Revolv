import { useState } from "react"
import { ChevronUp, ChevronDown, Filter, ArrowUpDown } from "lucide-react"
import { products, type Product } from "../data/returns"
import { DetailPanel } from "./DetailPanel"

type SortKey = "id" | "name" | "returnRate"

function RateBadge({ rate }: { rate: number }) {
  if (rate >= 35) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-600">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
        {rate.toFixed(1)}%
      </span>
    )
  }
  if (rate >= 20) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-600">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
        {rate.toFixed(1)}%
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-600">
      <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
      {rate.toFixed(1)}%
    </span>
  )
}

function AIStatusBadge({ status }: { status: Product["aiStatus"] }) {
  const styles = {
    Optimiert: "bg-green-50 text-green-700",
    "In Bearbeitung": "bg-blue-50 text-blue-700",
    Ausstehend: "bg-gray-100 text-gray-600",
  }
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${styles[status]}`}>{status}</span>
}

export function ReturnsTable() {
  const [selected, setSelected] = useState<Product | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>("returnRate")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")
  const [filter, setFilter] = useState("")

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc")
    else { setSortKey(key); setSortDir("desc") }
  }

  const filtered = products
    .filter(p =>
      p.name.toLowerCase().includes(filter.toLowerCase()) ||
      p.id.toLowerCase().includes(filter.toLowerCase()) ||
      p.category.toLowerCase().includes(filter.toLowerCase())
    )
    .sort((a, b) => {
      const v = sortKey === "returnRate"
        ? a.returnRate - b.returnRate
        : a[sortKey].localeCompare(b[sortKey])
      return sortDir === "asc" ? v : -v
    })

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown size={12} className="text-gray-300" />
    return sortDir === "asc" ? <ChevronUp size={12} className="text-blue-600" /> : <ChevronDown size={12} className="text-blue-600" />
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Retourenanalyse</h2>
            <p className="text-sm text-gray-500 mt-0.5">{products.length} Artikel — Klicken für Detailansicht</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Filter size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={filter}
                onChange={e => setFilter(e.target.value)}
                placeholder="Filtern…"
                className="pl-8 pr-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 w-48"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/80">
                {[
                  { key: "id" as SortKey, label: "Artikel-Nr." },
                  { key: "name" as SortKey, label: "Produktname" },
                ].map(col => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-500 cursor-pointer hover:text-gray-800 select-none"
                  >
                    <span className="flex items-center gap-1.5">{col.label}<SortIcon col={col.key} /></span>
                  </th>
                ))}
                {["Kategorie", "Größe", "Farbe"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500">{h}</th>
                ))}
                <th
                  onClick={() => handleSort("returnRate")}
                  className="px-4 py-3 text-left text-xs font-semibold text-gray-500 cursor-pointer hover:text-gray-800 select-none"
                >
                  <span className="flex items-center gap-1.5">Retourenquote<SortIcon col="returnRate" /></span>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Häufigster Grund</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">KI-Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(p => (
                <tr
                  key={p.id}
                  onClick={() => setSelected(p)}
                  className="hover:bg-blue-50/40 cursor-pointer transition-colors duration-100 group"
                >
                  <td className="px-4 py-3.5 text-xs font-mono text-gray-400">{p.id}</td>
                  <td className="px-4 py-3.5 font-medium text-gray-900 group-hover:text-blue-700 transition-colors">{p.name}</td>
                  <td className="px-4 py-3.5 text-gray-600">{p.category}</td>
                  <td className="px-4 py-3.5 text-gray-600">{p.size}</td>
                  <td className="px-4 py-3.5 text-gray-600">{p.color}</td>
                  <td className="px-4 py-3.5"><RateBadge rate={p.returnRate} /></td>
                  <td className="px-4 py-3.5 text-gray-600">{p.topReason}</td>
                  <td className="px-4 py-3.5"><AIStatusBadge status={p.aiStatus} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selected && <DetailPanel product={selected} onClose={() => setSelected(null)} />}
    </>
  )
}
