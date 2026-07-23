import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@jtl-software/platform-ui-react";
import TopNavigationBar from "../components/TopNavigationBar";
import Sidebar from "../components/Sidebar";
import QualityReviewModal from "../components/QualityReviewModal";

// Values returned by GET /api/articles/returns for the "KI-Status" column (see ReturnController).
type AIStatus = "Keine Empfehlung" | "Ausstehend" | "Angenommen" | "Abgelehnt" | "Gelöst";

interface ReturnItem {
  id?: number;
  articleNumber: string;
  articleNo?: string;
  name: string;
  category: string;
  size: string;
  color: string | null;
  returnRate: number;
  mostFrequentReason: string | null;
  reason?: string;
  aiStatus: AIStatus;
}

interface SettingsApiDto {
  thresholdYellow: number;
  thresholdRed: number;
}

/**
 * Traffic-light colors based on the ShopSettings thresholds
 * (same logic as the Dashboard traffic lights):
 * red > redThreshold, yellow >= yellowThreshold && <= redThreshold, green < yellowThreshold
 */
function rateClasses(rate: number, yellowThreshold: number, redThreshold: number) {
  if (rate > redThreshold) {
    return {
      bg: "bg-red-50 dark:bg-red-950/40 dark:border-red-900",
      dot: "bg-red-500",
      text: "text-red-700 dark:text-red-300",
    };
  }
  if (rate >= yellowThreshold) {
    return {
      bg: "bg-yellow-50 dark:bg-yellow-950/40 dark:border-yellow-900",
      dot: "bg-yellow-400",
      text: "text-yellow-700 dark:text-yellow-300",
    };
  }
  return {
    bg: "bg-green-50 dark:bg-green-950/40 dark:border-green-900",
    dot: "bg-green-400",
    text: "text-green-700 dark:text-green-300",
  };
}

<<<<<<< Updated upstream
=======
// Color coding for the "KI-Status" column, matching the values returned by ReturnController.
>>>>>>> Stashed changes
function aiStatusClasses(status: AIStatus): string {
  switch (status) {
    case "Angenommen":
    case "Gelöst":
      return "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300";
    case "Abgelehnt":
      return "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-300";
    case "Ausstehend":
      return "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300";
    default:
      return "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400";
  }
}

export default function RetourenAnalyseView() {
  const [query, setQuery] = useState("");
  const [desc, setDesc] = useState(true);
  const [articles, setArticles] = useState<ReturnItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [yellowThreshold, setYellowThreshold] = useState(10);
  const [redThreshold, setRedThreshold] = useState(25);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

<<<<<<< Updated upstream
  const [reviewedCount] = useState(0);

=======
  // Extracted so it can also be re-run after the modal saves a change (e.g. accepting a
  // description proposal), keeping the "KI-Status" column in this table in sync.
>>>>>>> Stashed changes
  const loadArticles = async () => {
    setIsLoading(true);

    try {
      const response = await fetch("http://localhost:5215/api/articles/returns");
      if (!response.ok) {
        throw new Error(`API-Anfrage fehlgeschlagen: ${response.status}`);
      }

      const data = (await response.json()) as ReturnItem[];
      if (!data.every((item) => item.id !== undefined && item.id !== null)) {
        console.warn(
          "Retouren-Analyse: Einige Artikel aus /api/articles/returns haben keine id:",
          data,
        );
      }
      setArticles(data);
    } catch (error) {
      console.error("Fehler beim Laden der Retourendaten:", error);
      setArticles([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadArticles();
  }, []);

  useEffect(() => {
    const loadThresholds = async () => {
      try {
        const response = await fetch("http://localhost:5215/api/settings");
        if (!response.ok) return;
        const data = (await response.json()) as SettingsApiDto;
        setYellowThreshold(Number(data.thresholdYellow));
        setRedThreshold(Number(data.thresholdRed));
      } catch (error) {
        console.error("Fehler beim Laden der Schwellenwerte:", error);
      }
    };

    void loadThresholds();
  }, []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();

    const filtered = articles.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.articleNumber.toLowerCase().includes(q) ||
        d.category.toLowerCase().includes(q),
    );

    return [...filtered].sort((a, b) =>
      desc ? b.returnRate - a.returnRate : a.returnRate - b.returnRate,
    );
  }, [articles, query, desc]);

  return (
    <Box className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <TopNavigationBar />

      <Box className="flex">
        <Sidebar />

        <Box className="flex-1 p-6">
          <div className="flex items-center justify-between mb-4 gap-4">
            <div className="flex items-center gap-3">
              <input
                aria-label="Suche Artikel"
                placeholder="Filter: Name, Artikel-Nr., Kategorie..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="rounded-md border border-gray-200 bg-white px-3 py-2 w-72 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-200 focus:outline-none dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:ring-blue-900"
              />
              <Button
                label={`Sort: ${desc ? "Absteigend" : "Aufsteigend"}`}
                onClick={() => setDesc((s) => !s)}
              />
            </div>
            <Button label="Filter..." variant="secondary" />
          </div>

          <Card className="dark:bg-slate-900 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="dark:text-slate-100">Artikelübersicht</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                {isLoading ? (
                  <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
                    Lade Artikeldaten...
                  </div>
                ) : articles.length === 0 ? (
                  <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
                    Keine zurückgesendeten Artikel gefunden.
                  </div>
                ) : (
                  <table className="min-w-full divide-y divide-gray-100 dark:divide-slate-700">
                    <thead className="bg-gray-50 dark:bg-slate-800">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-slate-300">
                          Artikel-Nr.
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-slate-300">
                          Produktname
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-slate-300">
                          Kategorie
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-slate-300">
                          Größe
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-slate-300">
                          Farbe
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-slate-300">
                          Retourenquote
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-slate-300">
                          Häufigster Grund
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-slate-300">
                          KI-Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100 dark:bg-slate-900 dark:divide-slate-700">
                      {visible.map((row) => {
                        const rc = rateClasses(row.returnRate, yellowThreshold, redThreshold);
                        return (
                          <tr
                            key={row.id ?? row.articleNumber}
                            className="hover:bg-gray-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                            onClick={async () => {
                              const id = row.id ?? row.articleNumber;

                              if (id === undefined || id === null) {
                                console.error(
                                  "Retouren-Analyse: Artikel-ID und articleNumber fehlen für row",
                                  row,
                                );
                                setSelectedDetail(null);
                                setDetailError(
                                  "Keine gültige Artikelkennung verfügbar. Bitte Backend /api/articles/returns prüfen.",
                                );
                                setDetailLoading(false);
                                setIsModalOpen(true);
                                return;
                              }

                              setSelectedDetail(null);
                              setDetailError(null);
                              setDetailLoading(true);
                              setIsModalOpen(true);
                              try {
                                const res = await fetch(
                                  `http://localhost:5215/api/articles/${encodeURIComponent(String(id))}`,
                                );
                                if (!res.ok) {
                                  const text = await res.text();
                                  throw new Error(`HTTP ${res.status}: ${text}`);
                                }
                                const dto = await res.json();
                                setSelectedDetail(dto);
                              } catch (e) {
                                console.error("Fehler beim Laden der Artikeldetails:", e);
                                setDetailError(
                                  e instanceof Error
                                    ? e.message
                                    : "Die Artikeldetails konnten nicht geladen werden.",
                                );
                                setSelectedDetail(null);
                              } finally {
                                setDetailLoading(false);
                              }
                            }}
                          >
                            <td className="px-4 py-4 text-sm text-gray-400 dark:text-slate-500">
                              {row.articleNumber}
                            </td>
                            <td className="px-4 py-4 font-semibold text-slate-900 dark:text-slate-100">
                              {row.name}
                            </td>
                            <td className="px-4 py-4 text-sm text-slate-700 dark:text-slate-300">
                              {row.category}
                            </td>
                            <td className="px-4 py-4 text-sm text-slate-700 dark:text-slate-300">
                              {row.size}
                            </td>
                            <td className="px-4 py-4 text-sm text-slate-700 dark:text-slate-300">
                              {row.color ?? "—"}
                            </td>
                            <td className="px-4 py-4">
                              <span
                                className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border border-transparent ${rc.bg}`}
                              >
                                <span className={`w-2 h-2 rounded-full ${rc.dot}`} />
                                <span className={`font-semibold ${rc.text}`}>
                                  {row.returnRate.toFixed(1)}%
                                </span>
                              </span>
                            </td>
                            <td className="px-4 py-4 text-sm text-slate-700 dark:text-slate-300">
                              {row.mostFrequentReason ?? "—"}
                            </td>
                            <td className="px-4 py-4 text-sm">
                              <span
                                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${aiStatusClasses(
                                  row.aiStatus,
                                )}`}
                              >
                                {row.aiStatus}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </CardContent>
          </Card>
        </Box>
      </Box>

      <QualityReviewModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedDetail(null);
          setDetailError(null);
          setDetailLoading(false);
        }}
        articleDetail={selectedDetail}
        isLoading={detailLoading}
        error={detailError}
        onArticleUpdated={loadArticles}
      />
    </Box>
  );
}
