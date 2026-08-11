import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Text,
  Button,
} from "@jtl-software/platform-ui-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import TopNavigationBar from "../components/TopNavigationBar";
import Sidebar from "../components/Sidebar";
import { apiFetch } from "../utils/api";

interface TrendPoint {
  month: string; // "yyyy-MM"
  returnRate: number;
}

interface ArticleTrend {
  articleId: number;
  name: string;
  articleNumber: string;
  changeMonth: string; // "yyyy-MM" — when the AI suggestion was applied
  changeLabel: string;
  points: TrendPoint[];
}

const MONTH_LABEL_FORMATTER = new Intl.DateTimeFormat("de-DE", { month: "short", year: "2-digit" });

function formatMonthLabel(isoMonth: string): string {
  const [year, month] = isoMonth.split("-").map(Number);
  if (!year || !month) return isoMonth;
  return MONTH_LABEL_FORMATTER.format(new Date(year, month - 1, 1));
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function formatPercent(value: number | null): string {
  if (value === null) return "–";
  return `${value.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

function formatDelta(value: number | null): string {
  if (value === null) return "–";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} Pp.`;
}

function TrendSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="h-16 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="h-20 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
        <div className="h-20 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
        <div className="h-20 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
      </div>
      <div className="h-72 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
    </div>
  );
}

export default function Erfolgsmessung() {
  const [trends, setTrends] = useState<ArticleTrend[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadTrends = async () => {
    setIsLoading(true);
    setError("");

    try {
      const response = await apiFetch("/api/dashboard/success-metrics?months=8");

      if (!response.ok) {
        throw new Error(`API-Anfrage fehlgeschlagen: ${response.status}`);
      }

      const data = (await response.json()) as ArticleTrend[];
      setTrends(data);
      setSelectedId((current) =>
        data.some((a) => a.articleId === current) ? current : (data[0]?.articleId ?? null),
      );
    } catch (err) {
      console.error("Fehler beim Laden der Erfolgsmessung:", err);
      setError(
        err instanceof Error ? err.message : "Erfolgsmessung konnte nicht geladen werden.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadTrends();
  }, []);

  const selected = trends.find((a) => a.articleId === selectedId) ?? null;

  const { before, after, delta, improved } = useMemo(() => {
    if (!selected) {
      return { before: null, after: null, delta: null, improved: false };
    }
    const beforePoints = selected.points.filter((p) => p.month < selected.changeMonth);
    const afterPoints = selected.points.filter((p) => p.month >= selected.changeMonth);
    // Liegt die Änderung außerhalb des vom Backend gelieferten Zeitfensters, gibt es keine
    // "vorher"-Punkte - dann 0% vorzugaukeln (und die Veränderung fälschlich rot zu färben)
    // wäre irreführend, also "–" statt eines erfundenen Werts.
    if (beforePoints.length === 0) {
      return { before: null, after: average(afterPoints.map((p) => p.returnRate)), delta: null, improved: false };
    }
    const avgBefore = average(beforePoints.map((p) => p.returnRate));
    const avgAfter = average(afterPoints.map((p) => p.returnRate));
    return {
      before: avgBefore,
      after: avgAfter,
      delta: avgAfter - avgBefore,
      improved: avgAfter < avgBefore,
    };
  }, [selected]);

  const chartData = (selected?.points ?? []).map((p) => ({
    ...p,
    label: formatMonthLabel(p.month),
  }));

  const deltaColor =
    delta === null
      ? "text-slate-500 dark:text-slate-400"
      : improved
        ? "text-green-600 dark:text-green-400"
        : "text-red-600 dark:text-red-400";

  return (
    <Box className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <TopNavigationBar />

      <Box className="flex">
        <Sidebar />

        <Box className="flex-1 p-6">
          <div className="mx-auto flex max-w-5xl flex-col gap-4">
            <div>
              <Text weight="bold">Erfolgsmessung</Text>
              <Text type="xs" color="muted">
                Wirkt die KI wirklich? Retourenquote vor und nach einer übernommenen Änderung.
              </Text>
            </div>

            {isLoading ? (
              <TrendSkeleton />
            ) : error ? (
              <Card className="dark:bg-slate-900 dark:border-slate-700">
                <CardContent className="flex flex-col items-center justify-center gap-3 p-8 text-sm text-red-600">
                  <span>{error}</span>
                  <Button label="Erneut versuchen" onClick={() => void loadTrends()} />
                </CardContent>
              </Card>
            ) : !selected ? (
              <Card className="dark:bg-slate-900 dark:border-slate-700">
                <CardContent className="p-8 text-sm text-slate-500 dark:text-slate-400">
                  Noch keine Erfolgsmessung verfügbar. Sobald für einen Artikel ein
                  KI-Vorschlag angenommen bzw. erledigt wurde, erscheint hier dessen
                  Retourenquote-Trend.
                </CardContent>
              </Card>
            ) : (
              <>
                <Card className="dark:bg-slate-900 dark:border-slate-700">
                  <CardContent className="p-4">
                    <label className="flex flex-col gap-1.5 sm:max-w-sm">
                      <span className="text-xs text-slate-500 dark:text-slate-400">Artikel</span>
                      <select
                        value={selectedId ?? ""}
                        onChange={(e) => setSelectedId(Number(e.target.value))}
                        className="rounded-md border border-gray-200 bg-white px-3 py-2 text-slate-900 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100"
                      >
                        {trends.map((a) => (
                          <option key={a.articleId} value={a.articleId}>
                            {a.name} ({a.articleNumber})
                          </option>
                        ))}
                      </select>
                    </label>
                  </CardContent>
                </Card>

                <div className="grid gap-4 sm:grid-cols-3">
                  <Card className="dark:bg-slate-900 dark:border-slate-700">
                    <CardContent className="p-4">
                      <Text type="xs" color="muted">
                        Ø Retourenquote vorher
                      </Text>
                      <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
                        {formatPercent(before)}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="dark:bg-slate-900 dark:border-slate-700">
                    <CardContent className="p-4">
                      <Text type="xs" color="muted">
                        Ø Retourenquote nachher
                      </Text>
                      <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
                        {formatPercent(after)}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="dark:bg-slate-900 dark:border-slate-700">
                    <CardContent className="p-4">
                      <Text type="xs" color="muted">
                        Veränderung
                      </Text>
                      <div className={`mt-1 text-2xl font-bold ${deltaColor}`}>{formatDelta(delta)}</div>
                    </CardContent>
                  </Card>
                </div>

                <Card className="dark:bg-slate-900 dark:border-slate-700">
                  <CardHeader>
                    <CardTitle className="dark:text-slate-100">Retourenquote über Zeit</CardTitle>
                    <Text type="xs" color="muted">
                      {selected.changeLabel} — {formatMonthLabel(selected.changeMonth)}
                    </Text>
                  </CardHeader>
                  <CardContent>
                    <div className="h-72 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                          <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#64748B" }} />
                          <YAxis
                            tick={{ fontSize: 12, fill: "#64748B" }}
                            tickFormatter={(value) => `${value}%`}
                            width={48}
                          />
                          <Tooltip
                            formatter={(value) => [formatPercent(Number(value)), "Retourenquote"]}
                            labelFormatter={(label) => label}
                            contentStyle={{
                              borderRadius: 12,
                              backgroundColor: "#0f172a",
                              borderColor: "#334155",
                              color: "#e2e8f0",
                            }}
                            itemStyle={{ color: "#e2e8f0" }}
                            labelStyle={{ color: "#e2e8f0" }}
                          />
                          <ReferenceLine
                            x={formatMonthLabel(selected.changeMonth)}
                            stroke="#3B82F6"
                            strokeDasharray="4 4"
                            label={{
                              value: "KI-Änderung",
                              position: "insideTopLeft",
                              fill: "#3B82F6",
                              fontSize: 12,
                            }}
                          />
                          <Line
                            type="monotone"
                            dataKey="returnRate"
                            stroke="#3B82F6"
                            strokeWidth={2}
                            dot={{ r: 3 }}
                            activeDot={{ r: 5 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </Box>
      </Box>
    </Box>
  );
}
