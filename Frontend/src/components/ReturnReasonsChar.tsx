import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Box,
  Text,
} from "@jtl-software/platform-ui-react";
import { useEffect, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

// DTO for the return reasons
interface ReturnReasonDto {
  reasonName: string;
  count: number;
  percentage: number;
}

// DTO for the chart
interface ReturnReasonChartItem {
  id: string;
  reasonName: string;
  count: number;
  percentage: number;
  colorCode: string;
}

// Colors for the chart
const CHART_COLORS = ["#3B82F6", "#EF4444", "#F59E0B", "#10B981", "#8B5CF6", "#64748B"];

// Component for the return reasons chart
export default function ReturnReasonsChart() {
  const [returnReasons, setReturnReasons] = useState<ReturnReasonChartItem[]>([]);

  // Loading state
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Load the return reasons
  useEffect(() => {
    const loadReturnReasons = async () => {
      setIsLoading(true);
      setError("");

      try {
        // Load the return reasons from the API
        const response = await fetch("http://localhost:5215/api/dashboard/return-reasons");

        // Check if the request was successful
        if (!response.ok) {
          throw new Error(`API-Anfrage fehlgeschlagen: ${response.status}`);
        }

        // Parse the response as ReturnReasonDto
        const data = (await response.json()) as ReturnReasonDto[];

        // Map the data to the ReturnReasonChartItem
        const chartData = data.map((item, index) => ({
          id: `${item.reasonName}-${index}`,
          reasonName: item.reasonName || "Unbekannt",
          count: item.count,
          percentage: Number(item.percentage),
          colorCode: CHART_COLORS[index % CHART_COLORS.length],
        }));

        // Set the return reasons
        setReturnReasons(chartData);
      } catch (err) {
        console.error("Fehler beim Laden der Retourengründe:", err);
        setReturnReasons([]);

        // Set the error message
        setError(
          err instanceof Error ? err.message : "Retourengründe konnten nicht geladen werden.",
        );
      } finally {
        // Set the loading state to false
        setIsLoading(false);
      }
    };

    void loadReturnReasons();
  }, []);

  return (
    <Card className="w-full dark:bg-slate-900 dark:border-slate-700">
      <CardHeader>
        <CardTitle className="dark:text-slate-100">Häufigste Retourengründe</CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        <Box className="text-sm text-slate-500 dark:text-slate-400">
          Gesamtverteilung aller Rücksendungen
        </Box>

        {isLoading ? (
          <div className="h-64 flex items-center justify-center text-sm text-slate-500 dark:text-slate-400">
            Lade Retourengründe...
          </div>
        ) : error ? (
          <div className="h-64 flex items-center justify-center text-sm text-red-600">{error}</div>
        ) : returnReasons.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-sm text-slate-500 dark:text-slate-400">
            Keine Retourengründe gefunden.
          </div>
        ) : (
          <>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  {/* Donut-Look über innerRadius + outerRadius */}
                  <Pie
                    data={returnReasons}
                    dataKey="percentage"
                    nameKey="reasonName"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={4}
                    cornerRadius={8}
                  >
                    {returnReasons.map((entry) => (
                      <Cell key={entry.id} fill={entry.colorCode} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name) => [`${Number(value ?? 0).toFixed(1)}%`, String(name)]}
                    contentStyle={{
                      borderRadius: 12,
                      backgroundColor: "#0f172a",
                      borderColor: "#334155",
                      color: "#e2e8f0",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              {returnReasons.map((item) => (
                <Box
                  key={item.id}
                  className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700"
                >
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: item.colorCode }}
                  />
                  <Box className="dark:text-slate-100">
                    <Text>
                      {item.reasonName} ({item.percentage.toFixed(1)}%)
                    </Text>
                  </Box>
                </Box>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}