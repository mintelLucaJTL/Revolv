import { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Text,
  Button,
  DropdownItem,
  JTLDropdown,
} from "@jtl-software/platform-ui-react";
import { ChevronDown, HelpCircle, LineChart as LineChartIcon } from "lucide-react";
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
import { apiFetch } from "../utils/api";

interface TrendPoint {
  month: string; // "yyyy-MM"
  returnRate: number;
  returnedQuantity: number;
  soldQuantity: number;
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

function sum(values: number[]): number {
  return values.reduce((total, v) => total + v, 0);
}

// Summierte Stückzahlen statt Durchschnitt der einzelnen Monats-Prozentwerte: 3 von 6 verkauften
// Einheiten zurückgegeben ist eine andere (korrektere) Quote als der Mittelwert mehrerer
// Monatsquoten mit stark unterschiedlichem Volumen.
function aggregateRate(points: TrendPoint[]): {
  rate: number | null;
  returned: number;
  sold: number;
} {
  const returned = sum(points.map((p) => p.returnedQuantity));
  const sold = sum(points.map((p) => p.soldQuantity));
  return { rate: sold > 0 ? (returned / sold) * 100 : null, returned, sold };
}

function formatUnits(returned: number, sold: number): string {
  const fmt = (v: number) => v.toLocaleString("de-DE", { maximumFractionDigits: 1 });
  return `${fmt(returned)} von ${fmt(sold)} verkauften Einheiten zurückgegeben`;
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
      setError(err instanceof Error ? err.message : "Erfolgsmessung konnte nicht geladen werden.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadTrends();
  }, []);

  const selected = trends.find((a) => a.articleId === selectedId) ?? null;

  const { before, after, delta } = useMemo(() => {
    const empty = { rate: null, returned: 0, sold: 0 };
    if (!selected) {
      return { before: empty, after: empty, delta: null };
    }
    const beforePoints = selected.points.filter((p) => p.month < selected.changeMonth);
    const afterPoints = selected.points.filter((p) => p.month >= selected.changeMonth);

    const beforeAgg = aggregateRate(beforePoints);
    const afterAgg = aggregateRate(afterPoints);

    // Liegt die Änderung außerhalb des vom Backend gelieferten Zeitfensters oder gab es vorher
    // keine Verkäufe, gibt es keine sinnvolle "vorher"-Quote - dann 0% vorzugaukeln wäre
    // irreführend, also "–" statt eines erfundenen Werts.
    if (beforeAgg.rate === null) {
      return { before: beforeAgg, after: afterAgg, delta: null };
    }

    return {
      before: beforeAgg,
      after: afterAgg,
      delta: afterAgg.rate !== null ? afterAgg.rate - beforeAgg.rate : null,
    };
  }, [selected]);

  const chartData = (selected?.points ?? []).map((p) => ({
    ...p,
    label: formatMonthLabel(p.month),
  }));

  // Fehlen sowohl vorher- als auch nachher-Daten, funktioniert die ganze Auswertung nicht nur
  // die Kennzahlen-Karten - dann lieber einen einzigen klaren "Keine Daten"-Zustand für die
  // gesamte Seite zeigen statt mehrerer kleiner, widersprüchlich wirkender Karten.
  const hasNoData = before.rate === null && after.rate === null;

  // Alle drei Karten einheitlich gestylt (statt rot/grün/amber je nach Ausgang) - einfach ein
  // kräftiger, einheitlicher Blauton mit größerer Schrift für einen aufgeräumten, "cooleren" Look.
  const kpiCardClasses =
    "border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white dark:border-blue-900 dark:from-blue-950/30 dark:to-slate-900";

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      <div>
        <Text weight="bold">Erfolgsmessung</Text>
        <Text type="small" color="muted">
          Wirkt die KI wirklich? Retourenquote vor und nach einer übernommenen Änderung.
        </Text>
      </div>

      <div className="flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900 shadow-[0_0_24px_-8px_rgba(59,130,246,0.6)] dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-200 dark:shadow-[0_0_28px_-6px_rgba(96,165,250,0.5)]">
        <LineChartIcon size={18} className="mt-0.5 flex-shrink-0" aria-hidden="true" />
        <p>
          Wähle unten einen Artikel, für den bereits ein KI-Vorschlag angenommen bzw. erledigt
          wurde. Du siehst dann die durchschnittliche Retourenquote vor und nach der Änderung im
          Verlauf – so erkennst du auf einen Blick, ob die KI-Empfehlung tatsächlich gewirkt hat.
        </p>
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
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <LineChartIcon className="text-slate-300 dark:text-slate-600" size={32} />
            <Text weight="semibold">Noch keine Erfolgsmessung verfügbar</Text>
            <Text type="small" color="muted">
              Sobald für einen Artikel ein KI-Vorschlag angenommen bzw. erledigt wurde, erscheint
              hier dessen Retourenquote-Trend im Vergleich vorher/nachher.
            </Text>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="dark:bg-slate-900 dark:border-slate-700">
            <CardContent className="p-4">
              <div className="flex flex-col gap-1.5 sm:max-w-sm">
                <span className="text-xs text-slate-500 dark:text-slate-400">Artikel</span>
                <JTLDropdown
                  position="left"
                  width="100%"
                  menuItems={trends.map((a) => ({
                    type: DropdownItem.Default,
                    label: `${a.name} (${a.articleNumber})`,
                    onClick: () => setSelectedId(a.articleId),
                  }))}
                >
                  <Button
                    variant="secondary"
                    fullWidth
                    label={selected ? `${selected.name} (${selected.articleNumber})` : "Artikel wählen"}
                    icon={<ChevronDown size={16} />}
                  />
                </JTLDropdown>
              </div>
            </CardContent>
          </Card>

          {hasNoData ? (
            <Card className="border-2 border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
              <CardContent className="flex flex-col items-center gap-3 p-16 text-center">
                <HelpCircle
                  className="text-amber-500 dark:text-amber-400"
                  size={56}
                  strokeWidth={2}
                />
                <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                  Keine Daten vorhanden
                </div>
                <Text type="small" color="muted">
                  Für diesen Artikel gibt es aktuell keine Verkäufe im Vergleichszeitraum - ohne
                  Verkäufe lässt sich keine Retourenquote berechnen.
                </Text>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <Card className={kpiCardClasses}>
                  <CardContent className="p-5">
                    <Text type="small" color="muted">
                      Retourenquote vorher
                    </Text>
                    <div className="mt-1 text-4xl font-bold text-slate-900 dark:text-slate-100">
                      {formatPercent(before.rate)}
                    </div>
                    <Text type="small" color="muted">
                      {before.rate !== null
                        ? formatUnits(before.returned, before.sold)
                        : "Keine Daten vorhanden"}
                    </Text>
                  </CardContent>
                </Card>

                <Card className={kpiCardClasses}>
                  <CardContent className="p-5">
                    <Text type="small" color="muted">
                      Retourenquote nachher
                    </Text>
                    <div className="mt-1 text-4xl font-bold text-slate-900 dark:text-slate-100">
                      {formatPercent(after.rate)}
                    </div>
                    <Text type="small" color="muted">
                      {after.rate !== null
                        ? formatUnits(after.returned, after.sold)
                        : "Keine Daten vorhanden"}
                    </Text>
                  </CardContent>
                </Card>

                <Card className={kpiCardClasses}>
                  <CardContent className="p-5">
                    <Text type="small" color="muted">
                      Veränderung
                    </Text>
                    <div className="mt-1 text-4xl font-bold text-blue-600 dark:text-blue-400">
                      {formatDelta(delta)}
                    </div>
                    <Text type="small" color="muted">
                      {delta !== null
                        ? "Prozentpunkte, aus den Stückzahlen oben"
                        : "Keine Daten vorhanden"}
                    </Text>
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
                      <LineChart
                        data={chartData}
                        margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
                      >
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
        </>
      )}
    </div>
  );
}
