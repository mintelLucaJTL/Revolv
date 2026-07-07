import { Bell, Shield, Database, Users } from "lucide-react"

export function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Einstellungen</h2>
        <p className="text-sm text-gray-500 mt-0.5">Systemkonfiguration und Präferenzen</p>
      </div>

      {[
        {
          icon: Bell,
          title: "Benachrichtigungen",
          items: [
            ["Tägliche Retourenberichte", true],
            ["KI-Empfehlungen per E-Mail", true],
            ["Kritische Schwellenwerte", true],
          ],
        },
        {
          icon: Shield,
          title: "KI-Schwellenwerte",
          items: [
            ["Warnung ab Retourenquote", "20%"],
            ["Kritisch ab Retourenquote", "35%"],
            ["Automatische Analysen", true],
          ],
        },
        {
          icon: Database,
          title: "Datenintegration",
          items: [
            ["Shop-System verbunden", "Shopify"],
            ["Letzte Synchronisation", "07.07.2026 09:14"],
          ],
        },
        {
          icon: Users,
          title: "Team",
          items: [
            ["Max Müller", "E-Commerce Manager"],
            ["Anna Schmidt", "Qualitätsmanagement"],
            ["Tom Weber", "Produktmanager"],
          ],
        },
      ].map(({ icon: Icon, title, items }) => (
        <div key={title} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center">
              <Icon size={14} className="text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {items.map(([label, value]) => (
              <div key={label as string} className="px-5 py-3.5 flex items-center justify-between">
                <span className="text-sm text-gray-700">{label as string}</span>
                {typeof value === "boolean" ? (
                  <div className={`w-9 h-5 rounded-full relative transition-colors ${value ? "bg-blue-600" : "bg-gray-200"}`}>
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${value ? "left-4" : "left-0.5"}`} />
                  </div>
                ) : (
                  <span className="text-sm text-gray-500 font-medium">{value as string}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
