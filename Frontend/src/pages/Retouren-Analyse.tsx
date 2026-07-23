import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Text,
} from "@jtl-software/platform-ui-react";
import TopNavigationBar from "../components/TopNavigationBar";
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

const navItems = [
  { label: "Dashboard", path: "/dashboard" },
  { label: "Retourenanalyse", path: "/retouren-analyse" },
  { label: "Ki-Empfehlungen", path: "/ki-empfehlungen" },
];

/**
 * Ampel-Farben anhand der ShopSettings-Schwellenwerte
 * (gleich wie Dashboard traffic-lights):
 * rot  > red, gelb >= yellow && <= red, grün < yellow
 */
function rateClasses(rate: number, yellowThreshold: number, redThreshold: number) {
  if (rate > redThreshold) {
    return { bg: "bg-red-50", dot: "bg-red-500", text: "text-red-700" };
  }
  if (rate >= yellowThreshold) {
    return { bg: "bg-yellow-50", dot: "bg-yellow-400", text: "text-yellow-700" };
  }
  return { bg: "bg-green-50", dot: "bg-green-400", text: "text-green-700" };
}

// Farbliche Kennzeichnung für die "KI-Status"-Spalte, passend zu den Werten aus ReturnController.
function aiStatusClasses(status: AIStatus): string {
  switch (status) {
    case "Angenommen":
    case "Gelöst":
      return "bg-green-50 text-green-700";
    case "Abgelehnt":
      return "bg-red-50 text-red-600";
    case "Ausstehend":
      return "bg-amber-50 text-amber-600";
    default:
      return "bg-slate-100 text-slate-500";
  }
}

export default function RetourenAnalyseView() {
  const navigate = useNavigate();
  const location = useLocation();

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

  const [reviewedCount] = useState(0);

  // Extracted so it can also be re-run after the modal saves a change (e.g. accepting a
  // description proposal), keeping the "KI-Status" column in this table in sync.
  const loadArticles = async () => {
    setIsLoading(true);

    try {
      const response = await fetch("http://localhost:5215/api/articles/returns");
      if (!response.ok) {
        throw new Error(`API-Anfrage fehlgeschlagen: ${response.status}`);
      }

      const data = (await response.json()) as ReturnItem[];
      if (!data.every((item) => item.id !== undefined && item.id !== null)) {
        console.warn("Retouren-Analyse: Einige Artikel aus /api/articles/returns haben keine id:", data);
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
    loadArticles();
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
    <Box className="min-h-screen bg-slate-50">
      <TopNavigationBar />

      <Box className="flex">
        <Box className="w-72 min-h-[calc(100vh-72px)] bg-white border-r p-4 space-y-3">
          <Text weight="bold">Navigation</Text>
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Button
                key={item.path}
                label={item.label}
                variant={isActive ? "default" : "ghost"}
                fullWidth
                onClick={() => navigate(item.path)}
                aria-current={isActive ? "page" : undefined}
              />
            );
          })}
        </Box>

        <Box className="flex-1 p-6">
          <div className="flex items-center justify-between mb-4 gap-4">
            <div className="flex items-center gap-3">
              <input
                aria-label="Suche Artikel"
                placeholder="Filter: Name, Artikel-Nr., Kategorie..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="rounded-md border border-gray-200 px-3 py-2 w-72 focus:ring-2 focus:ring-blue-200"
              />
              <Button
                label={`Sort: ${desc ? "Absteigend" : "Aufsteigend"}`}
                onClick={() => setDesc((s) => !s)}
              />
            </div>
            <Button label="Filter..." variant="secondary" />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Artikelübersicht</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                {isLoading ? (
                  <div className="p-8 text-center text-sm text-slate-500">Lade Artikeldaten...</div>
                ) : articles.length === 0 ? (
                  <div className="p-8 text-center text-sm text-slate-500">
                    Keine zurückgesendeten Artikel gefunden.
                  </div>
                ) : (
                  <table className="min-w-full divide-y divide-gray-100">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                          Artikel-Nr.
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                          Produktname
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                          Kategorie
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                          Größe
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                          Farbe
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                          Retourenquote
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                          Häufigster Grund
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                          KI-Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {visible.map((row) => {
                        const rc = rateClasses(row.returnRate, yellowThreshold, redThreshold);
                        return (
                          <tr
                            key={row.id}
                            className="hover:bg-gray-50 cursor-pointer"
                            onClick={async () => {
                              console.log("Retouren-Analyse click row", row);
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
                            <td className="px-4 py-4 text-sm text-gray-400">{row.articleNumber}</td>
                            <td className="px-4 py-4 font-semibold">{row.name}</td>
                            <td className="px-4 py-4 text-sm">{row.category}</td>
                            <td className="px-4 py-4 text-sm">{row.size}</td>
                            <td className="px-4 py-4 text-sm">{row.color}</td>
                            <td className="px-4 py-4">
                              <span
                                className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${rc.bg}`}
                              >
                                <span className={`w-2 h-2 rounded-full ${rc.dot}`} />
                                <span className={`font-semibold ${rc.text}`}>
                                  {row.returnRate.toFixed(1)}%
                                </span>
                              </span>
                            </td>
                            <td className="px-4 py-4 text-sm">{row.mostFrequentReason}</td>
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
        reviewedCount={reviewedCount}
        totalCount={2}
        onArticleUpdated={loadArticles}
      />
    </Box>
  );
}
