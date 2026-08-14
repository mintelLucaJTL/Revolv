import { Box, Card, CardContent, Text } from "@jtl-software/platform-ui-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Percent, PackageSearch, Sparkles, TrendingUp, type LucideIcon } from "lucide-react";
import KpiCard from "../components/KpiCard";
import ReturnReasonsChart from "../components/ReturnReasonsChar";
import TopReturnsChart from "../components/TopReturnsChart";
import ReturnCostsChart from "../components/ReturnCostsChart";
import LatestReturnsList from "../components/LatestReturnsList";
import { apiFetch } from "../utils/api";
import { buildRetourenAnalysePath } from "../utils/riskBand";

const REFRESH_INTERVAL_MS = 5 * 60_000;

interface DashboardKpiDto {
  wholeReturnQuote: number;
  affectedArticle: number;
  openKiRecommendations: number;
  improvedProducts: number;
}

interface TrafficLightGroupDto {
  count: number;
  averagePercent: number;
}

interface TrafficLightKpiDto {
  red: TrafficLightGroupDto;
  yellow: TrafficLightGroupDto;
  green: TrafficLightGroupDto;
  yellowThreshold?: number;
  redThreshold?: number;
}

interface SettingsApiDto {
  toneOfVoice: string;
  autoAnalyzeNewIssues: boolean;
  thresholdYellow: number;
  thresholdRed: number;
}

interface KpiNavCard {
  title: string;
  content: string;
  value: string;
  extra?: string;
  icon: LucideIcon;
}

type AmpelVariant = "red" | "yellow" | "green";

interface AmpelTile {
  variant: AmpelVariant;
  badgeLabel: string;
  smallLabel: string;
  value: number;
  percent: string;
}

const KPI_CARD_META: Omit<KpiNavCard, "value" | "extra">[] = [
  {
    title: "Gesamte Retourenquote",
    content: "So viel Prozent der verkauften Stück kamen zurück.",
    icon: Percent,
  },
  {
    title: "Betroffene Artikel",
    content: "Artikel mit mindestens einer Rücksendung.",
    icon: PackageSearch,
  },
  {
    title: "KI-Empfehlungen offen",
    content: "Offene Vorschläge, die noch geprüft werden müssen.",
    icon: Sparkles,
  },
  {
    title: "Verbesserte Produkte",
    content: "Produkte, die bereits verbessert wurden.",
    icon: TrendingUp,
  },
];

// Nur diese beiden der vier oberen Karten haben eine konkrete Zielseite -> nur sie bekommen
// Klick + Glow-Hover + Maus-Tooltip, statt alle vier gleich klickbar zu machen.
const CARD_LINKS: Record<string, { path: string; tooltip: string }> = {
  "KI-Empfehlungen offen": {
    path: "/retouren-analyse?filter=Offen",
    tooltip: "Zu den offenen Retourenanalysen navigieren →",
  },
  "Verbesserte Produkte": {
    path: "/erfolgsmessung",
    tooltip: "Zu den Erfolgsmessungen navigieren →",
  },
};

function formatPercent(value: number): string {
  return `${value.toLocaleString("de-DE", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`;
}

function formatCount(value: number): string {
  return value.toLocaleString("de-DE");
}

function formatThreshold(value: number): string {
  return Number(value).toLocaleString("de-DE", { maximumFractionDigits: 1 });
}

function mapKpiDtoToCards(data: DashboardKpiDto): KpiNavCard[] {
  return [
    {
      ...KPI_CARD_META[0],
      value: formatPercent(Number(data.wholeReturnQuote ?? 0)),
    },
    {
      ...KPI_CARD_META[1],
      value: formatCount(Number(data.affectedArticle ?? 0)),
    },
    {
      ...KPI_CARD_META[2],
      value: formatCount(Number(data.openKiRecommendations ?? 0)),
    },
    {
      ...KPI_CARD_META[3],
      value: formatCount(Number(data.improvedProducts ?? 0)),
    },
  ];
}

function mapTrafficLightsToTiles(
  data: TrafficLightKpiDto,
  yellowThreshold: number,
  redThreshold: number,
): AmpelTile[] {
  const yellow = formatThreshold(yellowThreshold);
  const red = formatThreshold(redThreshold);

  return [
    {
      variant: "red",
      badgeLabel: `ÜBER ${red}%`,
      smallLabel: "Hohe Retourenquote",
      value: data.red?.count ?? 0,
      percent: formatPercent(Number(data.red?.averagePercent ?? 0)),
    },
    {
      variant: "yellow",
      badgeLabel: `${yellow} – ${red}%`,
      smallLabel: "Mittlere Retourenquote",
      value: data.yellow?.count ?? 0,
      percent: formatPercent(Number(data.yellow?.averagePercent ?? 0)),
    },
    {
      variant: "green",
      badgeLabel: `> 0 – unter ${yellow}%`,
      smallLabel: "Niedrige Retourenquote",
      value: data.green?.count ?? 0,
      percent: formatPercent(Number(data.green?.averagePercent ?? 0)),
    },
  ];
}

function KpiCardSkeleton() {
  return (
    <Card className="rounded-lg bg-white p-4 shadow-sm animate-pulse dark:bg-slate-900 dark:border-slate-700">
      <CardContent className="p-0">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="h-9 w-9 rounded-lg bg-slate-200 dark:bg-slate-700" />
            <div className="space-y-2">
              <div className="h-8 w-20 rounded bg-slate-200 dark:bg-slate-700" />
              <div className="h-4 w-40 rounded bg-slate-100 dark:bg-slate-800" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [kpiCards, setKpiCards] = useState<KpiNavCard[]>([]);
  const [ampelTiles, setAmpelTiles] = useState<AmpelTile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Tooltip, der der Maus folgt, solange eine verlinkte KPI-Karte (siehe CARD_LINKS) gehovert wird.
  const [actionTip, setActionTip] = useState<{ x: number; y: number; text: string } | null>(null);

  useEffect(() => {
    const loadDashboardData = async (isBackgroundRefresh: boolean) => {
      // Background refresh: avoid full loading state so skeletons don't flash.
      if (isBackgroundRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        const [kpiResponse, trafficResponse, settingsResponse] = await Promise.all([
          apiFetch("/api/dashboard/kpi"),
          apiFetch("/api/dashboard/traffic-lights"),
          apiFetch("/api/settings"),
        ]);

        if (!kpiResponse.ok) {
          throw new Error(`KPI-Anfrage fehlgeschlagen (${kpiResponse.status})`);
        }
        if (!trafficResponse.ok) {
          throw new Error(`Ampel-Anfrage fehlgeschlagen (${trafficResponse.status})`);
        }
        if (!settingsResponse.ok) {
          throw new Error(`Settings-Anfrage fehlgeschlagen (${settingsResponse.status})`);
        }

        const kpiData = (await kpiResponse.json()) as DashboardKpiDto;
        const trafficData = (await trafficResponse.json()) as TrafficLightKpiDto;
        const settingsData = (await settingsResponse.json()) as SettingsApiDto;

        const yellowThreshold = Number(
          trafficData.yellowThreshold ?? settingsData.thresholdYellow ?? 10,
        );
        const redThreshold = Number(trafficData.redThreshold ?? settingsData.thresholdRed ?? 25);

        setKpiCards(mapKpiDtoToCards(kpiData));
        setAmpelTiles(mapTrafficLightsToTiles(trafficData, yellowThreshold, redThreshold));
        setLastUpdated(new Date());
      } catch (err) {
        console.error("Error loading the dashboard data:", err);
        // Keep last good data on background refresh failures.
        if (!isBackgroundRefresh) {
          setKpiCards([]);
          setAmpelTiles([]);
        }
        setError(
          err instanceof TypeError
            ? "Backend nicht erreichbar. Starte RevolvAPI oder überprüfe die API-URL (http://localhost:5215)."
            : err instanceof Error
              ? err.message
              : "Die Dashboard-Daten konnten nicht geladen werden.",
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    };

    void loadDashboardData(false);

    const intervalId = setInterval(() => {
      void loadDashboardData(true);
    }, REFRESH_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, []);

  return (
    <>
      <Box className="flex items-center gap-2">
            <Text weight="bold">Retourenanalyse</Text>
            {isRefreshing && (
              <span
                className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"
                title="Aktualisiere..."
                aria-label="Aktualisiere Daten"
              />
            )}
            {lastUpdated && (
              <span className="text-xs text-slate-400 dark:text-slate-500">
                Zuletzt aktualisiert:{" "}
                {lastUpdated.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </Box>

          {error && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-4 mt-4">
            {isLoading
              ? Array.from({ length: 4 }, (_, index) => (
                  <KpiCardSkeleton key={`kpi-skeleton-${index}`} />
                ))
              : kpiCards.map((card) => {
                  const extraText = card.extra ?? "";
                  const isNegative =
                    extraText.trim().startsWith("-") || extraText.trim().startsWith("−");
                  const Icon = card.icon;
                  const link = CARD_LINKS[card.title];
                  const isActionable = link !== undefined;

                  const kpiCard = (
                    <Card
                      key={card.title}
                      onClick={link ? () => navigate(link.path) : undefined}
                      onMouseMove={
                        link
                          ? (e) => setActionTip({ x: e.clientX, y: e.clientY, text: link.tooltip })
                          : undefined
                      }
                      onMouseLeave={link ? () => setActionTip(null) : undefined}
                      role={isActionable ? "button" : undefined}
                      tabIndex={isActionable ? 0 : undefined}
                      onKeyDown={
                        link
                          ? (e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                navigate(link.path);
                              }
                            }
                          : undefined
                      }
                      className={`rounded-lg bg-white p-4 shadow-sm transition-all duration-200 dark:bg-slate-900 dark:text-slate-100 ${
                        isActionable
                          ? // near = Maus in der Pufferzone rund um die Karte, hover = direkt drauf.
                            // Dark braucht deutlich mehr Deckkraft, sonst versackt der Glow im
                            // dunklen Hintergrund statt sich sichtbar abzuheben.
                            "cursor-pointer hover:-translate-y-0.5 hover:scale-[1.02] " +
                            "group-hover:border-blue-300 group-hover:shadow-[0_0_14px_-6px_rgba(59,130,246,0.35)] " +
                            "dark:group-hover:border-blue-400 dark:group-hover:shadow-[0_0_18px_-4px_rgba(96,165,250,0.55)] " +
                            "hover:border-blue-300 hover:shadow-[0_0_28px_-6px_rgba(59,130,246,0.65)] " +
                            "dark:hover:border-blue-300 dark:hover:shadow-[0_0_32px_-4px_rgba(96,165,250,0.85)]"
                          : "hover:shadow-md"
                      }`}
                    >
                      <CardContent className="p-0">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-4">
                            <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                              <Icon size={18} aria-hidden="true" />
                            </span>
                            <div>
                              <div className="text-3xl font-bold leading-tight">{card.value}</div>
                              <div className="text-sm text-slate-600 mt-1 dark:text-slate-300">
                                {card.content}
                              </div>
                            </div>
                          </div>

                          {card.extra && (
                            <div
                              className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                isNegative
                                  ? "bg-green-50 text-green-700 border border-green-100 dark:bg-green-950/40 dark:text-green-300 dark:border-green-900"
                                  : "bg-red-50 text-red-700 border border-red-100 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900"
                              }`}
                            >
                              {card.extra}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );

                  // Pufferzone: schon das Herankommen mit der Maus (nicht erst der direkte Hover
                  // auf der Karte selbst) löst per group-hover den dezenten "near"-Zustand aus.
                  return isActionable ? (
                    <div key={card.title} className="group -m-3 p-3">
                      {kpiCard}
                    </div>
                  ) : (
                    kpiCard
                  );
                })}
          </div>

          {actionTip && (
            <div
              className="pointer-events-none fixed z-50 rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg dark:bg-slate-700"
              style={{ left: actionTip.x + 16, top: actionTip.y + 16 }}
            >
              {actionTip.text}
            </div>
          )}

          <div className="grid gap-4 mt-6">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Deine Retouren-Ampel
            </h2>

            <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
              {isLoading
                ? Array.from({ length: 3 }, (_, index) => (
                    <KpiCardSkeleton key={`ampel-skeleton-${index}`} />
                  ))
                : ampelTiles.map((t) => (
                    <KpiCard
                      key={t.smallLabel}
                      variant={t.variant}
                      badgeLabel={t.badgeLabel}
                      smallLabel={t.smallLabel}
                      value={t.value}
                      onClick={() => navigate(buildRetourenAnalysePath(t.variant))}
                      hoverHint="Zur gefilterten Retourenanalyse navigieren →"
                    />
                  ))}
            </div>

            <div className="w-full mt-2 grid gap-6 grid-cols-1 lg:grid-cols-2">
              <TopReturnsChart />
              <ReturnCostsChart />
            </div>

            <div className="w-full mt-6 grid gap-6 grid-cols-1 lg:grid-cols-2">
              <ReturnReasonsChart />
              <LatestReturnsList />
            </div>
          </div>
    </>
  );
}
