import { Card, CardHeader, CardContent, Text, Box } from "@jtl-software/platform-ui-react";

type Variant = "red" | "green" | "yellow";

interface Props {
  variant: Variant;         //hier wird festgelegt welche daten in die Cards kommen
  badgeLabel?: string;      // Kleiner Hinweistext ganz oben (z. B. "ÜBER 25%")
  smallLabel?: string;     // Hauptbeschreibung der Kennzahl (z. B. "Hohe Retourenquote")
  value: number | string;   // Große, im Fokus stehende Kennzahl (z. B. Anzahl betroffener Artikel)
  percent?: string;         // Optionale exakte Prozentangabe für den Fußbereich
  onClick?: () => void;     // Callback-Funktion, falls die Kachel interaktiv ist
}

// Zentrales Design wie sehen die farben aus für das Ampel-Prinzip.
// Verhindert unübersichtliche IF-Abfragen im Code.
const CONFIG = {
  red:    { border: "border-red-100",   accent: "text-red-600",   bg: "bg-red-50"   },
  green:  { border: "border-green-100", accent: "text-green-600", bg: "bg-green-50" },
  yellow: { border: "border-yellow-100",accent: "text-yellow-600",bg: "bg-yellow-50"},
} as const;

export default function KpiCard({ variant, badgeLabel, smallLabel, value, percent, onClick }: Props) {
  // Passende Style-Konfiguration anhand der übergebenen Farbe (Variant) laden
  const cfg = CONFIG[variant];

  return (
    <Card
      // Dynamische Klassen für Rahmenfarbe + interaktive Hover-Effekte bei Klickbarkeit
      className={`rounded-lg ${cfg.border} p-4 hover:shadow-sm transition-colors cursor-pointer`}
      onClick={onClick}
      // Barrierefreiheit : Macht das Element als Button erkennbar
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={smallLabel}
    >
      <CardHeader className="flex items-start justify-between p-0 mb-2">
        <div className="flex items-center gap-3">
          {/* Runder Icon-Hintergrund in Statusfarbe */}
          <div className={`${cfg.bg} p-2 rounded-full`}>
            {/* SVG-Pfeil nach oben e */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={cfg.accent}>
              <path d="M7 14l5-5 5 5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
        {/* Optischer Hinweisindikator für den Nutzer (Anklickbarkeit) */}
        <div className="text-slate-300 text-sm">›</div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Oberes Badge: Wird nur gerendert, wenn ein Text übergeben wurde */}
        {badgeLabel && (
          <Box className="mb-2">
            <Text>{badgeLabel}</Text>
          </Box>
        )}

        {/* Die primäre Kennzahl im Fokus (groß und farblich hervorgehoben) */}
        <div className={`${cfg.accent} text-3xl font-bold`}>{value}</div>

        {/* Beschreibungstext der KPI */}
        <Box className="mt-2">
          <Text weight="bold">{smallLabel}</Text>
        </Box>

        {/* Fußzeile: Zeigt bei Bedarf die exakte durchschnittliche Quote an */}
        {percent && (
          <Box className="mt-1">
            <Text>Ø {percent} Retourenquote</Text>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}