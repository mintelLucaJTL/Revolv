import { Card, CardContent, CardHeader, CardTitle, Box } from "@jtl-software/platform-ui-react";
import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer } from "recharts";
import { apiFetch } from "../utils/api";

// DTO from GET /api/dashboard/top-returned-articles
interface TopReturnedArticleDto {
  articleNumber: string;
  name: string;
  returnRate: number;
}

// DTO for the chart
interface TopReturnedArticleChartItem {
  id: string;
  articleNumber: string;
  name: string;
  returnRate: number;
  colorCode: string;
}

// Colors by rank: highest return rate (index 0, most critical) in signal red,
// descending to green for the lowest of the top 5.
const CHART_COLORS = ["#EF4444", "#F97316", "#F59E0B", "#84CC16", "#10B981"];

function ChartSkeleton() {
  return <div className="animate-pulse h-64 rounded-xl bg-slate-100 dark:bg-slate-800" />;
}

// Component for the top-returned-articles chart
export default function TopReturnsChart() {
  const [topReturns, setTopReturns] = useState<TopReturnedArticleChartItem[]>([]);

  // Loading state
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Load the top returned articles
  useEffect(() => {
    const loadTopReturns = async () => {
      setIsLoading(true);
      setError("");

      try {
        // Load the top returned articles from the API
        const response = await apiFetch("/api/dashboard/top-returned-articles");

        // Check if the request was successful
        if (!response.ok) {
          throw new Error(`API-Anfrage fehlgeschlagen: ${response.status}`);
        }

        // Parse the response as TopReturnedArticleDto
        const data = (await response.json()) as TopReturnedArticleDto[];

        // Map the data to the TopReturnedArticleChartItem
        const chartData = data.map((item, index) => ({
          id: `${item.articleNumber}-${index}`,
          articleNumber: item.articleNumber,
          name: item.name || "Unbekannt",
          returnRate: Number(item.returnRate),
          colorCode: CHART_COLORS[index % CHART_COLORS.length],
        }));

        // Set the top returned articles
        setTopReturns(chartData);
      } catch (err) {
        console.error("Fehler beim Laden der meistretournierten Artikel:", err);
        setTopReturns([]);

        // Set the error message
        setError(
          err instanceof Error
            ? err.message
            : "Meistretournierte Artikel konnten nicht geladen werden.",
        );
      } finally {
        // Set the loading state to false
        setIsLoading(false);
      }
    };

    void loadTopReturns();
  }, []);

  return (
    <Card className="w-full dark:bg-slate-900 dark:border-slate-700">
      <CardHeader>
        <CardTitle className="dark:text-slate-100">
          Top 5 Artikel mit höchster Retourenquote
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        <Box className="text-sm text-slate-500 dark:text-slate-400">
          Artikel mit der aktuell höchsten prozentualen Retourenquote
        </Box>

        {isLoading ? (
          <ChartSkeleton />
        ) : error ? (
          <div className="h-64 flex items-center justify-center text-sm text-red-600">{error}</div>
        ) : topReturns.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-sm text-slate-500 dark:text-slate-400">
            Keine Artikel gefunden.
          </div>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topReturns}>
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#64748B" }} />
                <YAxis tick={{ fontSize: 12, fill: "#64748B" }} unit="%" />
                <Tooltip
                  formatter={(value) => [`${Number(value ?? 0).toFixed(1)}%`, "Retourenquote"]}
                  contentStyle={{
                    borderRadius: 12,
                    backgroundColor: "#0f172a",
                    borderColor: "#334155",
                    color: "#e2e8f0",
                  }}
                />
                <Bar dataKey="returnRate" radius={[8, 8, 0, 0]}>
                  {topReturns.map((entry) => (
                    <Cell key={entry.id} fill={entry.colorCode} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
