import { Card, CardHeader, CardContent, Text, Box } from "@jtl-software/platform-ui-react";

type Variant = "red" | "green" | "yellow";
interface Props {
  variant: Variant; // Farbe / visueller Status der Kachel
  badgeLabel?: string; // Kleine obere Beschriftung (z. B. "ÜBER 25%")
  smallLabel?: string; // Hauptbeschreibung (z. B. "Hohe Retourenquote")
  value: number | string; // Auffällige Zahl in großem Format (z. B. 3)
  percent?: string;
  onClick?: () => void;
}

const CONFIG = {
  red: { border: "border-red-100", accent: "text-red-600", bg: "bg-red-50" },
  green: { border: "border-green-100", accent: "text-green-600", bg: "bg-green-50" },
  yellow: { border: "border-yellow-100", accent: "text-yellow-600", bg: "bg-yellow-50" },
} as const;

export default function KpiCard({
  variant,
  badgeLabel,
  smallLabel,
  value,
  percent,
  onClick,
}: Props) {
  // Wähle die passenden CSS-Klassen für die gewählte Variant-Farbe.
  const cfg = CONFIG[variant];
  return (
    <Card
      className={`rounded-lg ${cfg.border} p-4 hover:shadow-sm transition-colors cursor-pointer`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={smallLabel}
    >
      <CardHeader className="flex items-start justify-between p-0 mb-2">
        <div className="flex items-center gap-3">
          <div className={`${cfg.bg} p-2 rounded-full`}>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={cfg.accent}
            >
              <path d="M7 14l5-5 5 5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
        <div className="text-slate-300 text-sm">›</div>
      </CardHeader>

      <CardContent className="p-0">
        {" "}
        {/* badgeLabel: kleiner Hinweis oben (z. B. "ÜBER 25%") */}
        {badgeLabel && (
          <Box className="mb-2">
            <Text>{badgeLabel}</Text>
          </Box>
        )}
        {/* Großer Wert mit Farb-Akzent */}
        <div className={`${cfg.accent} text-3xl font-bold`}>{value}</div>
        {/* Beschreibung / Titel */}
        <Box className="mt-2">
          <Text weight="bold">{smallLabel}</Text>
        </Box>
        {/* Optionales Prozent-Feld (kleiner Text) */}
        {percent && (
          <Box className="mt-1">
            <Text>Ø {percent} Retourenquote</Text>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
