import { Box, Card, CardContent, Text } from "@jtl-software/platform-ui-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import KpiCard from "../components/KpiCard";
import TopNavigationBar from "../components/TopNavigationBar";
import ReturnReasonsChart from "../components/ReturnReasonsChar";
import TopReturnsChart from "../components/TopReturnsChart";
import Sidebar from "../components/Sidebar";
import LatestReturnsList from "../components/LatestReturnsList";
import { apiFetch } from "../utils/api";
import { buildRetourenAnalysePath } from "../utils/riskBand";
const REFRESH_INTERVAL_MS = 5 * 60_000; // 5 Minuten

/** Raw data from the backend (DashboardKpiDto) */
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

/** Response from GET /api/dashboard/traffic-lights */
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
    content: "Gesamtquote aller Retouren in diesem Monat.",
  },
  {
    title: "Betroffene Artikel",
    content: "Artikel mit aktuellen Rücksendungen.",
  },
  {
    title: "KI-Empfehlungen offen",
    content: "Offene Vorschläge, die noch geprüft werden müssen.",
  },
  {
    title: "Verbesserte Produkte",
    content: "Produkte, die bereits verbessert wurden.",
  },
];

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
      badgeLabel: `UNTER ${yellow}%`,
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

  useEffect(() => {
    const loadDashboardData = async (isBackgroundRefresh: boolean) => {
      // Beim automatischen Reload keinen vollen Loading-Zustand setzen,
      // sonst flackern die Skeleton-Karten alle 60 Sekunden auf.
      if (isBackgroundRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        // Settings + traffic-lights together: badges always use current thresholds,
        // counts are calculated with the same thresholds on the backend.
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
        // Bei einem Hintergrund-Refresh die zuletzt erfolgreich geladenen Daten stehen lassen,
        // statt die ganze Seite mit einer Fehlermeldung zu überschreiben.
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
    <Box className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <TopNavigationBar />

      <Box className="flex">
        <Sidebar />

        <Box className="flex-1 p-6">
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

                  return (
                    <Card
                      key={card.title}
                      className="rounded-lg bg-white p-4 shadow-sm hover:shadow-md transition-shadow dark:bg-slate-900 dark:text-slate-100"
                    >
                      <CardContent className="p-0">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-4">
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
                })}
          </div>

          <div className="grid gap-4 mt-6">
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
                      percent={t.percent}
                      onClick={() => navigate(buildRetourenAnalysePath(t.variant))}
                    />
                  ))}
            </div>

            <TopReturnsChart />

            <div className="w-full mt-6 grid gap-6 grid-cols-1 lg:grid-cols-2">
              <ReturnReasonsChart />
              <LatestReturnsList />
            </div>
          </div>
        </Box>
      </Box>
    </Box>
  );
}
