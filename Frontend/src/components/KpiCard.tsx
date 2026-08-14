import { Card, CardContent } from "@jtl-software/platform-ui-react";

type Variant = "red" | "green" | "yellow";

interface Props {
  variant: Variant;
  badgeLabel?: string;
  smallLabel?: string;
  value: number | string;
  onClick?: () => void;
}

// Full-card traffic-light styling for the Ampel KPI tiles — same red/yellow/green tokens as
// the band chips on Retouren-Analyse, so the color language stays consistent across the app.
const CONFIG = {
  red: {
    card: "bg-red-50 border-red-300 dark:bg-red-950/40 dark:border-red-800",
    // near = Maus in der Pufferzone rund um die Karte (noch nicht direkt drauf) - dezenter Hinweis.
    // Dark-Varianten brauchen deutlich mehr Deckkraft als Light, sonst versackt der farbige
    // Glow-Schatten sichtbar im dunklen Seitenhintergrund statt sich abzuheben.
    near: "group-hover:border-red-400 group-hover:shadow-[0_0_14px_-6px_rgba(239,68,68,0.35)] dark:group-hover:border-red-500 dark:group-hover:shadow-[0_0_18px_-4px_rgba(248,113,113,0.55)]",
    hover: "hover:bg-red-100 hover:border-red-400 hover:shadow-[0_0_28px_-6px_rgba(239,68,68,0.65)] dark:hover:bg-red-950/70 dark:hover:border-red-400 dark:hover:shadow-[0_0_32px_-4px_rgba(248,113,113,0.85)]",
    text: "text-red-700 dark:text-red-300",
    label: "text-red-600/80 dark:text-red-400/80",
    pill: "bg-red-600 dark:bg-red-500",
  },
  yellow: {
    card: "bg-yellow-50 border-yellow-300 dark:bg-yellow-950/40 dark:border-yellow-800",
    near: "group-hover:border-yellow-400 group-hover:shadow-[0_0_14px_-6px_rgba(234,179,8,0.35)] dark:group-hover:border-yellow-500 dark:group-hover:shadow-[0_0_18px_-4px_rgba(250,204,21,0.5)]",
    hover: "hover:bg-yellow-100 hover:border-yellow-400 hover:shadow-[0_0_28px_-6px_rgba(234,179,8,0.65)] dark:hover:bg-yellow-950/70 dark:hover:border-yellow-400 dark:hover:shadow-[0_0_32px_-4px_rgba(250,204,21,0.8)]",
    text: "text-yellow-800 dark:text-yellow-300",
    label: "text-yellow-700/80 dark:text-yellow-400/80",
    pill: "bg-yellow-600 dark:bg-yellow-500",
  },
  green: {
    card: "bg-green-50 border-green-300 dark:bg-green-950/40 dark:border-green-800",
    near: "group-hover:border-green-400 group-hover:shadow-[0_0_14px_-6px_rgba(34,197,94,0.35)] dark:group-hover:border-green-500 dark:group-hover:shadow-[0_0_18px_-4px_rgba(74,222,128,0.5)]",
    hover: "hover:bg-green-100 hover:border-green-400 hover:shadow-[0_0_28px_-6px_rgba(34,197,94,0.65)] dark:hover:bg-green-950/70 dark:hover:border-green-400 dark:hover:shadow-[0_0_32px_-4px_rgba(74,222,128,0.8)]",
    text: "text-green-700 dark:text-green-300",
    label: "text-green-600/80 dark:text-green-400/80",
    pill: "bg-green-600 dark:bg-green-500",
  },
} as const;

export default function KpiCard({
  variant,
  badgeLabel,
  smallLabel,
  value,
  onClick,
}: Props) {
  const cfg = CONFIG[variant];
  const isInteractive = typeof onClick === "function";

  const card = (
    <Card
      className={`rounded-2xl border-2 p-8 ${cfg.card} transition-all duration-200 ${
        isInteractive
          ? `cursor-pointer hover:-translate-y-0.5 hover:scale-[1.02] ${cfg.near} ${cfg.hover}`
          : ""
      }`}
      onClick={onClick}
      role={isInteractive ? "button" : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      aria-label={
        smallLabel ? `${smallLabel} – zur Retourenanalyse filtern` : "Zur Retourenanalyse filtern"
      }
      onKeyDown={
        isInteractive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      <CardContent className="p-0">
        {/* Eyebrow label — names the band before the number, no color dot needed since the
            whole card is already tinted for the band. */}
        <div className={`text-sm font-semibold uppercase tracking-wide ${cfg.label}`}>
          {smallLabel}
        </div>

        {/* Article count + band badge are supporting detail below the headline. */}
        <div className="mt-2 flex items-center justify-between gap-3">
          <span className={`text-lg font-semibold ${cfg.text}`}>{value} Artikel</span>
          {badgeLabel && (
            <span
              className={`${cfg.pill} rounded-full px-3 py-1 text-sm font-semibold text-white`}
            >
              {badgeLabel}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (!isInteractive) return card;

  // Pufferzone rund um die Karte: schon das Herankommen mit der Maus (nicht erst der direkte
  // Hover auf der Karte selbst) löst per group-hover den dezenten "near"-Zustand aus, damit
  // früher erkennbar ist, dass die Karte klickbar ist.
  return <div className="group -m-3 p-3">{card}</div>;
}
