import { useEffect, useMemo, useState } from "react";
import { Box, Card, Button, CardTitle, Text } from "@jtl-software/platform-ui-react";
import { ArticleCard } from "../components/ArticleCard";
import Sidebar from "../components/Sidebar";
import TopNavigationBar from "../components/TopNavigationBar";
import ArticleDetailsPanel from "../components/ArticleDetailsPanel";
import { apiFetch } from "../utils/api";

/**
 * Filter-Labels für die obere Filterleiste.
 */
const filters = ["Alle Artikel", "Qualität", "Beschreibung", "Empfehlungen"];

/**
 * Typdefinition für die Artikelübersicht im Frontend.
 */
interface ArticleOverview {
  id: number;
  name: string;
  articleNo: string;
  category: string;
  size: string;
  returnRate: "high" | "medium" | "low";
  hasQualityBadge: boolean;
  hasDescriptionBadge: boolean;
  hasRecommendationBadge: boolean;
  openCount: number;
  resolvedCount: number;
  imageUrl?: string;
}

/**
 * API-Datentyp, wie er vom Backend zurückkommen kann.
 */
interface ArticleOverviewApiDto {
  id: number;
  name: string;
  articleNumber: string;
  category: string;
  size: string;
  returnRate: "high" | "medium" | "low";
  hasQualityBadge: boolean;
  hasDescriptionBadge: boolean;
  hasRecommendationBadge: boolean;
  openCount: number;
  resolvedCount: number;
  imageUrl?: string;
}

/**
 * Beispiel-Daten für den Fallback, wenn das Backend keine Artikel liefert.
 */
const sampleArticles: ArticleOverview[] = [
  {
    id: 1001,
    name: "Beispiel Sneaker X",
    articleNo: "BEX-1001",
    category: "Schuhe",
    size: "42",
    returnRate: "high",
    hasQualityBadge: true,
    hasDescriptionBadge: false,
    hasRecommendationBadge: true,
    openCount: 5,
    resolvedCount: 2,
    imageUrl: "/images/sneaker-1.jpg",
  },
  {
    id: 1002,
    name: "Beispiel T-Shirt",
    articleNo: "BT-1002",
    category: "Bekleidung",
    size: "M",
    returnRate: "medium",
    hasQualityBadge: false,
    hasDescriptionBadge: true,
    hasRecommendationBadge: false,
    openCount: 2,
    resolvedCount: 1,
    imageUrl: "/images/tshirt-1.jpg",
  },
];

function ArticleCardSkeleton() {
  return (
    <Card className="w-full animate-pulse dark:bg-slate-900 dark:border-slate-700">
      <div className="p-4 pb-2">
        <div className="flex items-start justify-between gap-4">
          <div className="h-20 w-20 flex-shrink-0 rounded-lg bg-slate-200 dark:bg-slate-700" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-4 w-40 rounded bg-slate-200 dark:bg-slate-700" />
            <div className="h-3 w-28 rounded bg-slate-100 dark:bg-slate-800" />
            <div className="h-3 w-32 rounded bg-slate-100 dark:bg-slate-800" />
            <div className="h-3 w-16 rounded bg-slate-100 dark:bg-slate-800" />
          </div>
          <div className="h-6 w-28 flex-shrink-0 rounded-full bg-slate-200 dark:bg-slate-700" />
        </div>
      </div>
      <div className="space-y-4 px-4 pb-4 pt-2">
        <div className="flex gap-2">
          <div className="h-6 w-16 rounded-full bg-slate-100 dark:bg-slate-800" />
          <div className="h-6 w-20 rounded-full bg-slate-100 dark:bg-slate-800" />
        </div>
        <div className="space-y-2">
          <div className="flex justify-between">
            <div className="h-3 w-16 rounded bg-slate-100 dark:bg-slate-800" />
            <div className="h-3 w-20 rounded bg-slate-100 dark:bg-slate-800" />
          </div>
          <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800" />
        </div>
      </div>
    </Card>
  );
}

/**
 * Header-Komponente für die KI-Empfehlungsseite.
 */
interface AIRecommendationHeaderProps {
  title?: string;
  openCount?: number;
  doneCount?: number;
}
function AIRecommendationHeader({
  title = "KI-Empfehlungen",
  openCount = 0,
  doneCount = 0,
}: AIRecommendationHeaderProps) {
  const total = openCount + doneCount;
  const progressPercent = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  return (
    <Box className="w-full rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6 shadow-lg mb-6">
      <Box className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Box className="flex flex-col gap-1">
          <Box className="flex items-center gap-2">
            <svg
              className="w-6 h-6 text-white opacity-90"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
              />
            </svg>
            <h1 className="text-white text-2xl font-bold tracking-tight">{title}</h1>
          </Box>
          <p className="text-blue-100 text-sm font-medium">
            {openCount} offen · {doneCount} erledigt
          </p>
        </Box>

        <Box className="flex flex-col gap-1.5 sm:min-w-[200px]">
          <Box className="flex items-center justify-between">
            <span className="text-blue-100 text-xs font-medium">Fortschritt</span>
            <span className="text-white text-xs font-bold">{progressPercent}%</span>
          </Box>
          <Box className="w-full h-2.5 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-700"
              style={{ width: `${progressPercent}%` }}
            />
          </Box>
          <span className="text-blue-100 text-xs">
            {doneCount} von {total} abgeschlossen
          </span>
        </Box>
      </Box>
    </Box>
  );
}

/**
 * Hauptseite für die KI-Empfehlungs-Ansicht.
 */
export default function AIRecommendationView() {
  const [articles, setArticles] = useState<ArticleOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState("Alle Artikel");

  const [selectedArticle, setSelectedArticle] = useState<ArticleOverview | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        const response = await apiFetch("/api/ai/overview");

        if (!response.ok) {
          throw new Error(`Fehler beim Laden der KI-Übersicht (${response.status})`);
        }

        const data = (await response.json()) as ArticleOverviewApiDto[];
        const mapped: ArticleOverview[] = (Array.isArray(data) ? data : []).map((item) => ({
          id: item.id,
          name: item.name ?? "",
          articleNo: item.articleNumber ?? "",
          category: item.category ?? "",
          size: item.size ?? "",
          returnRate: item.returnRate ?? "low",
          hasQualityBadge: Boolean(item.hasQualityBadge),
          hasDescriptionBadge: Boolean(item.hasDescriptionBadge),
          hasRecommendationBadge: Boolean(item.hasRecommendationBadge),
          openCount: item.openCount ?? 0,
          resolvedCount: item.resolvedCount ?? 0,
          imageUrl: item.imageUrl,
        }));

        setArticles(mapped);
      } catch (err) {
        console.error("Fetch AI overview error:", err);
        setError(
          err instanceof TypeError
            ? "Backend nicht erreichbar. Starte RevolvAPI (http://localhost:5215)."
            : "Die Artikel konnten nicht geladen werden.",
        );
        setArticles([]);
      } finally {
        setLoading(false);
      }
    };

    void fetchOverview();
  }, []);

  const { totalOpen, totalResolved } = useMemo(() => {
    return articles.reduce(
      (acc, article) => ({
        totalOpen: acc.totalOpen + article.openCount,
        totalResolved: acc.totalResolved + article.resolvedCount,
      }),
      { totalOpen: 0, totalResolved: 0 },
    );
  }, [articles]);

  const filteredArticles = useMemo(() => {
    switch (activeFilter) {
      case "Qualität":
        return articles.filter((a) => a.hasQualityBadge);
      case "Beschreibung":
        return articles.filter((a) => a.hasDescriptionBadge);
      case "Empfehlungen":
        return articles.filter((a) => a.hasRecommendationBadge);
      default:
        return articles;
    }
  }, [articles, activeFilter]);

  const filteredSampleArticles = useMemo(() => {
    switch (activeFilter) {
      case "Qualität":
        return sampleArticles.filter((a) => a.hasQualityBadge);
      case "Beschreibung":
        return sampleArticles.filter((a) => a.hasDescriptionBadge);
      case "Empfehlungen":
        return sampleArticles.filter((a) => a.hasRecommendationBadge);
      default:
        return sampleArticles;
    }
  }, [activeFilter]);

  function openArticlePanel(article: ArticleOverview) {
    setSelectedArticle(article);
    setPanelOpen(true);
  }

  function closePanel() {
    setPanelOpen(false);
    setSelectedArticle(null);
  }

  const showFallbackExamples = !loading && !error && articles.length === 0;

  return (
    <Box className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <TopNavigationBar />
      <Box className="flex">
        <Sidebar />

        <Box className="flex-1 p-6">
          <Box className="max-w-7xl mx-auto flex flex-col gap-4">
            <AIRecommendationHeader openCount={totalOpen} doneCount={totalResolved} />

            <Card className="p-6 dark:bg-slate-900 dark:border-slate-700">
              <div className="flex flex-col gap-4">
                <Box className="flex flex-col gap-2">
                  <CardTitle className="dark:text-slate-100">Artikel-Übersicht</CardTitle>
                  <Box className="dark:text-slate-300">
                    <Text>Alle offenen KI-Empfehlungen auf einen Blick</Text>
                  </Box>
                </Box>

                <Box className="flex flex-wrap gap-2">
                  {filters.map((filter) => (
                    <Button
                      key={filter}
                      label={filter}
                      variant={activeFilter === filter ? "default" : "secondary"}
                      onClick={() => setActiveFilter(filter)}
                    />
                  ))}
                </Box>

                <Box className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {loading ? (
                    Array.from({ length: 6 }, (_, index) => (
                      <ArticleCardSkeleton key={`article-skeleton-${index}`} />
                    ))
                  ) : error ? (
                    <div className="text-sm text-red-600">{error}</div>
                  ) : articles.length > 0 ? (
                    filteredArticles.length > 0 ? (
                      filteredArticles.map((article) => (
                        <div
                          key={article.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => openArticlePanel(article)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              openArticlePanel(article);
                            }
                          }}
                          className="focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                          aria-label={`Artikel ${article.name} öffnen`}
                        >
                          <ArticleCard
                            name={article.name}
                            articleNo={article.articleNo}
                            category={article.category}
                            size={article.size}
                            returnRate={article.returnRate}
                            hasQualityBadge={article.hasQualityBadge}
                            hasDescriptionBadge={article.hasDescriptionBadge}
                            hasRecommendationBadge={article.hasRecommendationBadge}
                            openCount={article.openCount}
                            resolvedCount={article.resolvedCount}
                            imageUrl={article.imageUrl}
                            onOpen={() => openArticlePanel(article)}
                          />
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-slate-600 dark:text-slate-300">
                        Keine Artikel für diesen Filter.
                      </div>
                    )
                  ) : showFallbackExamples ? (
                    <>
                      <div className="col-span-full text-sm text-slate-600 dark:text-slate-300">
                        Keine Artikel gefunden. Hier sind Beispielartikel zum Testen:
                      </div>
                      {filteredSampleArticles.map((article) => (
                        <div
                          key={article.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => openArticlePanel(article)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              openArticlePanel(article);
                            }
                          }}
                          className="focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                          aria-label={`Beispielartikel ${article.name} öffnen`}
                        >
                          <ArticleCard
                            name={article.name}
                            articleNo={article.articleNo}
                            category={article.category}
                            size={article.size}
                            returnRate={article.returnRate}
                            hasQualityBadge={article.hasQualityBadge}
                            hasDescriptionBadge={article.hasDescriptionBadge}
                            hasRecommendationBadge={article.hasRecommendationBadge}
                            openCount={article.openCount}
                            resolvedCount={article.resolvedCount}
                            imageUrl={article.imageUrl}
                            onOpen={() => openArticlePanel(article)}
                          />
                        </div>
                      ))}
                    </>
                  ) : (
                    <div className="text-sm text-slate-600 dark:text-slate-300">
                      Keine Artikel vorhanden.
                    </div>
                  )}
                </Box>
              </div>
            </Card>
          </Box>
        </Box>
      </Box>

      <ArticleDetailsPanel
        article={
          selectedArticle
            ? {
                image: selectedArticle.imageUrl,
                name: selectedArticle.name,
                number: selectedArticle.articleNo,
                returnRate: selectedArticle.returnRate,
              }
            : null
        }
        open={panelOpen}
        onClose={closePanel}
      />
    </Box>
  );
}
