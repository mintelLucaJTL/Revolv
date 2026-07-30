import { Card, CardHeader, CardContent, Text, Box } from "@jtl-software/platform-ui-react";

type Variant = "red" | "green" | "yellow";

interface Props {
  variant: Variant;
  badgeLabel?: string;
  smallLabel?: string;
  value: number | string;
  percent?: string;
  onClick?: () => void;
}

// Shared traffic-light styling for the Ampel KPI tiles.
const CONFIG = {
  red: { border: "border-red-100", accent: "text-red-600", bg: "bg-red-50", pill: "bg-red-600" },
  green: {
    border: "border-green-100",
    accent: "text-green-600",
    bg: "bg-green-50",
    pill: "bg-green-600",
  },
  yellow: {
    border: "border-yellow-100",
    accent: "text-yellow-600",
    bg: "bg-yellow-50",
    pill: "bg-yellow-500",
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
      className={`rounded-lg p-2 ${cfg.border} transition-all dark:bg-slate-900 dark:border-slate-700 ${
        isInteractive ? "cursor-pointer hover:shadow-sm" : ""
      }`}
      onClick={onClick}
      role={isInteractive ? "button" : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      aria-label={
        smallLabel
          ? `${smallLabel} – zur Retourenanalyse filtern`
          : "Zur Retourenanalyse filtern"
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
      <CardHeader className="flex items-start justify-between p-0 mb-1">
        <div className="flex items-center gap-3">
          <div className={`${cfg.bg} p-2 rounded-full dark:bg-slate-800`}>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={cfg.accent}
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="8" />
            </svg>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="flex items-center gap-2">
          <span className={`${cfg.accent} text-lg font-bold`}>{value} Artikel</span>
          {badgeLabel && (
            <span className={`${cfg.pill} rounded-full px-2 py-0.5 text-xs font-medium text-white`}>
              {badgeLabel}
            </span>
          )}
        </div>
        <Box className="mt-0.5 text-xs dark:text-slate-300">
          <Text>
            {smallLabel}
            {percent ? `: ${percent}` : ""}
          </Text>
        </Box>
      </CardContent>
    </Card>
  );
}
