import { Card, CardContent, CardHeader, CardTitle, Box, Button } from "@jtl-software/platform-ui-react";
import { useEffect, useRef, useState } from "react";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { apiFetch } from "../utils/api";

// DTO from GET /api/dashboard/return-costs?months=n
interface MonthlyReturnCostDto {
  month: string; // ISO "yyyy-MM"
  totalCost: number;
}

interface ReturnCostsResponseDto {
  totalCost: number;
  monthly: MonthlyReturnCostDto[];
}

// DTO for the chart
interface MonthlyCostChartItem {
  id: string;
  label: string;
  cost: number; // real value - what the tooltip/summary show
  barHeight: number; // what actually gets plotted (see buildChartData)
  isPlaceholder: boolean;
}

// Months with no returns (cost === 0) get the same dashed/transparent "empty slot" treatment
// as the Top-5 chart, instead of silently rendering as an invisible zero-height bar. Since the
// cost axis has no fixed max (unlike a 0-100% chart), the placeholder height matches the
// tallest real month so it reads clearly as "no data" rather than a fake amount.
function buildChartData(rawItems: { id: string; label: string; cost: number }[]): MonthlyCostChartItem[] {
  const maxRealCost = Math.max(0, ...rawItems.map((item) => item.cost));

  return rawItems.map((item) => ({
    ...item,
    isPlaceholder: item.cost === 0,
    barHeight: item.cost === 0 ? maxRealCost : item.cost,
  }));
}

const PERIOD_OPTIONS = [
  { months: 3, label: "3 Monate" },
  { months: 6, label: "6 Monate" },
  { months: 12, label: "12 Monate" },
] as const;

const MONTH_LABEL_FORMATTER = new Intl.DateTimeFormat("de-DE", { month: "short", year: "2-digit" });

function formatMonthLabel(isoMonth: string): string {
  const [year, month] = isoMonth.split("-").map(Number);
  if (!year || !month) return isoMonth;
  return MONTH_LABEL_FORMATTER.format(new Date(year, month - 1, 1));
}

function formatCurrency(value: number, maximumFractionDigits = 2): string {
  return value.toLocaleString("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits,
  });
}

function ChartSkeleton() {
  return <div className="animate-pulse h-64 rounded-xl bg-slate-100 dark:bg-slate-800" />;
}

// Component for the monthly return-costs chart (Ticket #273)
export default function ReturnCostsChart() {
  const [months, setMonths] = useState<number>(6);
  const [chartData, setChartData] = useState<MonthlyCostChartItem[]>([]);
  const [totalCost, setTotalCost] = useState(0);

  // isLoading: only the very first load (nothing to show yet, full skeleton is fine). A period
  // switch after that keeps the previous chart visible with no loading indicator at all, so the
  // card's height/content never collapses and pops back (that collapse was the "springt beim
  // Laden" jump) and there's no blinking indicator competing with the rest of the dashboard.
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const hasLoadedOnceRef = useRef(false);

  // Guards against an older, slower request overwriting a newer one when the
  // period is switched quickly (e.g. "3 Monate" then immediately "12 Monate").
  const latestRequestRef = useRef(months);

  const loadReturnCosts = async (selectedMonths: number) => {
    latestRequestRef.current = selectedMonths;
    if (!hasLoadedOnceRef.current) {
      setIsLoading(true);
    }
    setError("");

    try {
      const response = await apiFetch(`/api/dashboard/return-costs?months=${selectedMonths}`);

      if (!response.ok) {
        throw new Error(`API-Anfrage fehlgeschlagen: ${response.status}`);
      }

      const data = (await response.json()) as ReturnCostsResponseDto;
      if (latestRequestRef.current !== selectedMonths) return; // Newer request already in flight.

      const rawItems = (data.monthly ?? []).map((item) => ({
        id: item.month,
        label: formatMonthLabel(item.month),
        cost: Number(item.totalCost),
      }));

      setChartData(buildChartData(rawItems));
      setTotalCost(Number(data.totalCost ?? 0));
    } catch (err) {
      if (latestRequestRef.current !== selectedMonths) return;

      console.error("Fehler beim Laden der Retourenkosten:", err);
      // Keep the previous good chart on screen for a failed refresh - only a first-load
      // failure has nothing to fall back to and needs the full error state.
      if (!hasLoadedOnceRef.current) {
        setChartData([]);
        setTotalCost(0);
      }
      setError(err instanceof Error ? err.message : "Retourenkosten konnten nicht geladen werden.");
    } finally {
      if (latestRequestRef.current === selectedMonths) {
        setIsLoading(false);
        hasLoadedOnceRef.current = true;
      }
    }
  };

  useEffect(() => {
    void loadReturnCosts(months);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [months]);

  const hasData = totalCost > 0 && chartData.some((item) => item.cost > 0);

  return (
    <Card className="w-full dark:bg-slate-900 dark:border-slate-700">
      <CardHeader>
        {/* Title-only, single line - matches TopReturnsChart's header exactly so both cards
            end up the same height instead of this one growing taller from a stacked subtitle.
            min-h matches TopReturnsChart's (see there) since the period buttons are taller
            than plain title text. */}
        <div className="flex min-h-10 items-center justify-between gap-4">
          <CardTitle className="dark:text-slate-100">Retourenkosten</CardTitle>

          <div className="flex items-center gap-2" role="group" aria-label="Zeitraum wählen">
            {PERIOD_OPTIONS.map((option) => (
              <Button
                key={option.months}
                label={option.label}
                variant={months === option.months ? "highlight" : "ghost"}
                onClick={() => setMonths(option.months)}
              />
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* One line, same length class as TopReturnsChart's subtitle - keeps both cards'
            pre-chart content the same height so the two charts start at the same vertical
            position, not just the cards' outer borders. The total (previously appended here)
            made this wrap to a second line depending on locale/period, breaking that alignment
            - it's still visible per-month via the tooltip on hover. */}
        <Box className="text-sm text-slate-500 dark:text-slate-400">
          Warenwert der zurückgesendeten Artikel pro Monat
        </Box>

        {error && hasData && (
          <div className="text-sm text-red-600" role="alert">
            {error} – zuletzt geladene Daten werden weiter angezeigt.
          </div>
        )}

        {isLoading ? (
          <ChartSkeleton />
        ) : error && !hasData ? (
          <div className="h-64 flex flex-col items-center justify-center gap-3 text-sm text-red-600">
            <span>{error}</span>
            <Button label="Erneut versuchen" onClick={() => void loadReturnCosts(months)} />
          </div>
        ) : !hasData ? (
          <div className="h-64 flex items-center justify-center text-sm text-slate-500 dark:text-slate-400">
            Keine Retourenkosten im gewählten Zeitraum.
          </div>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#64748B" }} />
                <YAxis
                  tick={{ fontSize: 12, fill: "#64748B" }}
                  tickFormatter={(value) => formatCurrency(Number(value), 0)}
                  width={80}
                />
                <Tooltip
                  // See TopReturnsChart: the default cursor highlight rectangle would paint
                  // over the placeholder cells' dashed/transparent look.
                  cursor={false}
                  formatter={(_value, _name, item) => {
                    const payload = item?.payload as MonthlyCostChartItem | undefined;
                    return payload?.isPlaceholder
                      ? ["–", "Keine Retouren"]
                      : [formatCurrency(payload?.cost ?? 0), "Retourenkosten"];
                  }}
                  contentStyle={{
                    borderRadius: 12,
                    backgroundColor: "#0f172a",
                    borderColor: "#334155",
                    color: "#e2e8f0",
                  }}
                  // See TopReturnsChart: Recharts colors item text from the Cell fill by
                  // default, which is invisible for the transparent placeholder cells.
                  itemStyle={{ color: "#e2e8f0" }}
                  labelStyle={{ color: "#e2e8f0" }}
                />
                {/* activeBar off: Recharts' default hover highlight is a solid gray fill that
                    would paint over the placeholder cells' dashed/transparent look. */}
                <Bar dataKey="barHeight" radius={[8, 8, 0, 0]} activeBar={false}>
                  {chartData.map((entry) =>
                    entry.isPlaceholder ? (
                      <Cell
                        key={entry.id}
                        fill="transparent"
                        stroke="#CBD5E1"
                        strokeDasharray="4 4"
                        strokeWidth={1.5}
                      />
                    ) : (
                      <Cell key={entry.id} fill="#3B82F6" />
                    ),
                  )}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
