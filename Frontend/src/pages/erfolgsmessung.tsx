import { useMemo, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Text,
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

// Platzhalter, bis der Endpunkt (Retourenquote pro Artikel über Zeit + Zeitpunkt der
// übernommenen KI-Änderung) existiert. Absichtlich mit einem gemischten Ergebnis (nicht bei
// jedem Artikel wird's besser) statt drei erfundenen Erfolgsgeschichten - sonst wäre die Seite
// unehrlich, sobald echte Daten reinkommen.
const DUMMY_TRENDS: ArticleTrend[] = [
  {
    articleId: 1,
    name: "Herren-T-Shirt Slim Fit",
    articleNumber: "TS-4471",
    changeMonth: "2026-04",
    changeLabel: "KI-Beschreibung übernommen (Größenhinweis ergänzt)",
    points: [
      { month: "2026-01", returnRate: 27.4 },
      { month: "2026-02", returnRate: 25.9 },
      { month: "2026-03", returnRate: 28.1 },
      { month: "2026-04", returnRate: 26.8 },
      { month: "2026-05", returnRate: 18.2 },
      { month: "2026-06", returnRate: 14.6 },
      { month: "2026-07", returnRate: 13.1 },
      { month: "2026-08", returnRate: 12.4 },
    ],
  },
  {
    articleId: 2,
    name: "Damen Boxhose L",
    articleNumber: "AR20160504-VKO-003",
    changeMonth: "2026-05",
    changeLabel: "Qualitätsproblem behoben (Nahtverstärkung)",
    points: [
      { month: "2026-01", returnRate: 9.8 },
      { month: "2026-02", returnRate: 10.4 },
      { month: "2026-03", returnRate: 11.1 },
      { month: "2026-04", returnRate: 10.7 },
      { month: "2026-05", returnRate: 10.2 },
      { month: "2026-06", returnRate: 6.4 },
      { month: "2026-07", returnRate: 5.1 },
      { month: "2026-08", returnRate: 4.8 },
    ],
  },
  {
    articleId: 3,
    name: "Trailrunning Short",
    articleNumber: "TRS-9021",
    changeMonth: "2026-03",
    changeLabel: "Pflegehinweis ergänzt",
    points: [
      { month: "2026-01", returnRate: 19.2 },
      { month: "2026-02", returnRate: 20.1 },
      { month: "2026-03", returnRate: 19.6 },
      { month: "2026-04", returnRate: 21.3 },
      { month: "2026-05", returnRate: 20.8 },
      { month: "2026-06", returnRate: 22.0 },
      { month: "2026-07", returnRate: 21.4 },
      { month: "2026-08", returnRate: 20.7 },
    ],
  },
];

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

function formatPercent(value: number): string {
  return `${value.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

function formatDelta(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} Pp.`;
}

export default function Erfolgsmessung() {
  const [selectedId, setSelectedId] = useState(DUMMY_TRENDS[0].articleId);

  const selected = DUMMY_TRENDS.find((a) => a.articleId === selectedId) ?? DUMMY_TRENDS[0];

  const { before, after, delta, improved } = useMemo(() => {
    const beforePoints = selected.points.filter((p) => p.month < selected.changeMonth);
    const afterPoints = selected.points.filter((p) => p.month >= selected.changeMonth);
    const avgBefore = average(beforePoints.map((p) => p.returnRate));
    const avgAfter = average(afterPoints.map((p) => p.returnRate));
    return {
      before: avgBefore,
      after: avgAfter,
      delta: avgAfter - avgBefore,
      improved: avgAfter < avgBefore,
    };
  }, [selected]);

  const chartData = selected.points.map((p) => ({
    ...p,
    label: formatMonthLabel(p.month),
  }));

  const deltaColor = improved
    ? "text-green-600 dark:text-green-400"
    : "text-red-600 dark:text-red-400";

  return (
    <Box className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <TopNavigationBar />

      <Box className="flex">
        <Sidebar />

        <Box className="flex-1 p-6">
          <div className="mx-auto flex max-w-5xl flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <Text weight="bold">Erfolgsmessung</Text>
                <Text type="xs" color="muted">
                  Wirkt die KI wirklich? Retourenquote vor und nach einer übernommenen Änderung.
                </Text>
              </div>
              <span
                className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300"
                title="Diese Seite zeigt Platzhalterdaten, bis der Backend-Endpoint angebunden ist."
              >
                Demo-Daten – Backend folgt
              </span>
            </div>

            <Card className="dark:bg-slate-900 dark:border-slate-700">
              <CardContent className="p-4">
                <label className="flex flex-col gap-1.5 sm:max-w-sm">
                  <span className="text-xs text-slate-500 dark:text-slate-400">Artikel</span>
                  <select
                    value={selectedId}
                    onChange={(e) => setSelectedId(Number(e.target.value))}
                    className="rounded-md border border-gray-200 bg-white px-3 py-2 text-slate-900 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100"
                  >
                    {DUMMY_TRENDS.map((a) => (
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
          </div>
        </Box>
      </Box>
    </Box>
  );
}
