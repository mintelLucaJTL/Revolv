import { Card, CardContent } from "@jtl-software/platform-ui-react";

type Variant = "red" | "green" | "yellow";

interface Props {
  variant: Variant;
  badgeLabel?: string;
  smallLabel?: string;
  value: number | string;
  percent?: string;
  onClick?: () => void;
}

// Full-card traffic-light styling for the Ampel KPI tiles — same red/yellow/green tokens as
// the band chips on Retouren-Analyse, so the color language stays consistent across the app.
const CONFIG = {
  red: {
    card: "bg-red-50 border-red-300 dark:bg-red-950/40 dark:border-red-800",
    text: "text-red-700 dark:text-red-300",
    dot: "bg-red-500",
    pill: "bg-red-600 dark:bg-red-500",
  },
  yellow: {
    card: "bg-yellow-50 border-yellow-300 dark:bg-yellow-950/40 dark:border-yellow-800",
    text: "text-yellow-800 dark:text-yellow-300",
    dot: "bg-yellow-500",
    pill: "bg-yellow-600 dark:bg-yellow-500",
  },
  green: {
    card: "bg-green-50 border-green-300 dark:bg-green-950/40 dark:border-green-800",
    text: "text-green-700 dark:text-green-300",
    dot: "bg-green-500",
    pill: "bg-green-600 dark:bg-green-500",
  },
} as const;

export default function KpiCard({
  variant,
  badgeLabel,
  smallLabel,
  value,
  percent,
  onClick,
}: Props) {
  const cfg = CONFIG[variant];
  const isInteractive = typeof onClick === "function";

  return (
    <Card
      className={`rounded-2xl border-2 p-8 ${cfg.card} transition-all ${
        isInteractive ? "cursor-pointer hover:shadow-md" : ""
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
        {/* Headline first — the info a new user needs to understand the card at a glance. */}
        <div className="flex items-center gap-3">
          <span className={`h-3.5 w-3.5 flex-shrink-0 rounded-full ${cfg.dot}`} aria-hidden="true" />
          <span className={`text-2xl font-bold leading-snug ${cfg.text}`}>
            {smallLabel}
            {percent ? `: ${percent}` : ""}
          </span>
        </div>

        {/* Article count + band badge are secondary detail below the headline. */}
        <div className="mt-5 flex items-center gap-3">
          <span className={`text-2xl font-semibold ${cfg.text}`}>{value} Artikel</span>
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
}
