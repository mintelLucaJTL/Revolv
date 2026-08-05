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
  isPlaceholder: boolean;
}

// Colors by rank: highest return rate (index 0, most critical) in signal red,
// descending to green for the lowest of the top 5.
const CHART_COLORS = ["#EF4444", "#F97316", "#F59E0B", "#84CC16", "#10B981"];

const REQUIRED_SLOTS = 5;

// Always render 5 slots so the chart's shape/width stays constant regardless of how many
// articles actually have returns - missing slots become empty dashed placeholders instead
// of the chart just getting narrower or showing fewer bars.
function padWithPlaceholders(
  items: TopReturnedArticleChartItem[],
): TopReturnedArticleChartItem[] {
  const padded = [...items];
  while (padded.length < REQUIRED_SLOTS) {
    padded.push({
      id: `placeholder-${padded.length}`,
      articleNumber: "",
      name: "",
      returnRate: 100,
      colorCode: "transparent",
      isPlaceholder: true,
    });
  }
  return padded;
}

const AXIS_LABEL_MAX_LENGTH = 14;

interface AxisTickProps {
  x?: number;
  y?: number;
  payload?: { value?: string };
}

// Default Recharts ticks silently drop labels it thinks would collide - with long product
// names in the now-narrower (2-column) chart that hid the middle bar's label entirely.
// Truncating keeps every bar labeled; the full name is still in the tooltip on hover.
function TopArticleAxisTick({ x = 0, y = 0, payload }: AxisTickProps) {
  const label = payload?.value ?? "";
  const short =
    label.length > AXIS_LABEL_MAX_LENGTH ? `${label.slice(0, AXIS_LABEL_MAX_LENGTH - 1)}…` : label;

  return (
    <text x={x} y={y + 14} textAnchor="middle" fontSize={11} fill="#64748B">
      {short}
    </text>
  );
}

function ChartSkeleton() {
  return <div className="animate-pulse h-52 rounded-xl bg-slate-100 dark:bg-slate-800" />;
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
          isPlaceholder: false,
        }));

        // Set the top returned articles (padded to 5 slots - see padWithPlaceholders)
        setTopReturns(padWithPlaceholders(chartData));
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
          <div className="h-52 flex items-center justify-center text-sm text-red-600">{error}</div>
        ) : (
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topReturns}>
                <XAxis dataKey="name" interval={0} tick={<TopArticleAxisTick />} />
                <YAxis tick={{ fontSize: 12, fill: "#64748B" }} unit="%" />
                <Tooltip
                  formatter={(value, _name, item) =>
                    item?.payload?.isPlaceholder
                      ? ["–", "Kein weiterer Artikel"]
                      : [`${Number(value ?? 0).toFixed(1)}%`, "Retourenquote"]
                  }
                  contentStyle={{
                    borderRadius: 12,
                    backgroundColor: "#0f172a",
                    borderColor: "#334155",
                    color: "#e2e8f0",
                  }}
                />
                <Bar dataKey="returnRate" radius={[8, 8, 0, 0]}>
                  {topReturns.map((entry) =>
                    entry.isPlaceholder ? (
                      <Cell
                        key={entry.id}
                        fill="transparent"
                        stroke="#CBD5E1"
                        strokeDasharray="4 4"
                        strokeWidth={1.5}
                      />
                    ) : (
                      <Cell key={entry.id} fill={entry.colorCode} />
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
