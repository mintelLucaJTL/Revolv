import { Card, CardContent, CardHeader, CardTitle, Box, Button } from "@jtl-software/platform-ui-react";
import { useEffect, useRef, useState } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
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
  cost: number;
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
  return <div className="animate-pulse h-52 rounded-xl bg-slate-100 dark:bg-slate-800" />;
}

// Component for the monthly return-costs chart (Ticket #273)
export default function ReturnCostsChart() {
  const [months, setMonths] = useState<number>(6);
  const [chartData, setChartData] = useState<MonthlyCostChartItem[]>([]);
  const [totalCost, setTotalCost] = useState(0);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Guards against an older, slower request overwriting a newer one when the
  // period is switched quickly (e.g. "3 Monate" then immediately "12 Monate").
  const latestRequestRef = useRef(months);

  const loadReturnCosts = async (selectedMonths: number) => {
    latestRequestRef.current = selectedMonths;
    setIsLoading(true);
    setError("");

    try {
      const response = await apiFetch(`/api/dashboard/return-costs?months=${selectedMonths}`);

      if (!response.ok) {
        throw new Error(`API-Anfrage fehlgeschlagen: ${response.status}`);
      }

      const data = (await response.json()) as ReturnCostsResponseDto;
      if (latestRequestRef.current !== selectedMonths) return; // Newer request already in flight.

      const items = (data.monthly ?? []).map((item) => ({
        id: item.month,
        label: formatMonthLabel(item.month),
        cost: Number(item.totalCost),
      }));

      setChartData(items);
      setTotalCost(Number(data.totalCost ?? 0));
    } catch (err) {
      if (latestRequestRef.current !== selectedMonths) return;

      console.error("Fehler beim Laden der Retourenkosten:", err);
      setChartData([]);
      setTotalCost(0);
      setError(err instanceof Error ? err.message : "Retourenkosten konnten nicht geladen werden.");
    } finally {
      if (latestRequestRef.current === selectedMonths) setIsLoading(false);
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
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <CardTitle className="dark:text-slate-100">Retourenkosten</CardTitle>
            <Box className="text-sm text-slate-500 dark:text-slate-400">
              Warenwert der zurückgesendeten Artikel pro Monat
            </Box>
          </div>

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
        {!isLoading && !error && hasData && (
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {formatCurrency(totalCost)}
            </span>
            <span className="text-sm text-slate-500 dark:text-slate-400">
              Gesamt in den letzten {months} Monaten
            </span>
          </div>
        )}

        {isLoading ? (
          <ChartSkeleton />
        ) : error ? (
          <div className="h-52 flex flex-col items-center justify-center gap-3 text-sm text-red-600">
            <span>{error}</span>
            <Button label="Erneut versuchen" onClick={() => void loadReturnCosts(months)} />
          </div>
        ) : !hasData ? (
          <div className="h-52 flex items-center justify-center text-sm text-slate-500 dark:text-slate-400">
            Keine Retourenkosten im gewählten Zeitraum.
          </div>
        ) : (
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#64748B" }} />
                <YAxis
                  tick={{ fontSize: 12, fill: "#64748B" }}
                  tickFormatter={(value) => formatCurrency(Number(value), 0)}
                  width={80}
                />
                <Tooltip
                  formatter={(value) => [formatCurrency(Number(value ?? 0)), "Retourenkosten"]}
                  contentStyle={{
                    borderRadius: 12,
                    backgroundColor: "#0f172a",
                    borderColor: "#334155",
                    color: "#e2e8f0",
                  }}
                />
                <Bar dataKey="cost" radius={[8, 8, 0, 0]} fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
