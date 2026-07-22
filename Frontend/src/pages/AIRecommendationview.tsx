import { useEffect, useMemo, useState } from "react";
import { Box, Card, Button, CardTitle, Text } from "@jtl-software/platform-ui-react";
import { ArticleCard } from "../components/ArticleCard";
import Sidebar from "../components/Sidebar";
import TopNavigationBar from "../components/TopNavigationBar";

const filters = ["Alle Artikel", "Qualität", "Beschreibung", "Empfehlungen"];

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
        {/* Linke Seite: Titel und Status */}
        <Box className="flex flex-col gap-1">
          <Box className="flex items-center gap-2">
            {/* Sparkle Icon */}
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

        {/* Rechte Seite: Gesamtfortschritt */}
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

export default function AIRecommendationView() {
  const [articles, setArticles] = useState<ArticleOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        const response = await fetch("http://localhost:5215/api/ai/overview");

        if (!response.ok) {
          throw new Error("Fehler beim Laden der KI-Übersicht");
        }

        const data: ArticleOverview[] = await response.json();
        setArticles(data);
      } catch (err) {
        setError("Die Artikel konnten nicht geladen werden.");
      } finally {
        setLoading(false);
      }
    };

    fetchOverview();
  }, []);

  // Gesamtanzahl offener und erledigter Aufgaben über alle geladenen Artikel
  const { totalOpen, totalResolved } = useMemo(() => {
    return articles.reduce(
      (acc, article) => ({
        totalOpen: acc.totalOpen + article.openCount,
        totalResolved: acc.totalResolved + article.resolvedCount,
      }),
      { totalOpen: 0, totalResolved: 0 },
    );
  }, [articles]);

  return (
    <Box className="min-h-screen bg-slate-50">
      <TopNavigationBar />
      <Box className="flex">
        <Sidebar />

        <Box className="flex-1 p-6">
          <Box className="max-w-7xl mx-auto flex flex-col gap-4">
            {/* Header mit Gesamtfortschritt */}
            <AIRecommendationHeader openCount={totalOpen} doneCount={totalResolved} />

            <Card className="p-6">
              <div className="flex flex-col gap-4">
                <Box className="flex flex-col gap-2">
                  <CardTitle>Artikel-Übersicht</CardTitle>
                  <Text>Alle offenen KI-Empfehlungen auf einen Blick</Text>
                </Box>

                <Box className="flex flex-wrap gap-2">
                  {filters.map((filter) => (
                    <Button key={filter} label={filter} variant="secondary" />
                  ))}
                </Box>

                <Box className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {loading ? (
                    <div className="text-sm text-slate-600">Lade Artikel …</div>
                  ) : error ? (
                    <div className="text-sm text-red-600">{error}</div>
                  ) : (
                    articles.map((article) => (
                      <ArticleCard
                        key={article.id}
                        name={article.name}
                        articleNo={article.articleNo}
                        category={article.category}
                        size={article.size}
                        returnRate={article.returnRate}
                        tags={[
                          ...(article.hasQualityBadge ? ["Qualität"] : []),
                          ...(article.hasDescriptionBadge ? ["Beschreibung"] : []),
                          ...(article.hasRecommendationBadge ? ["Empfehlung"] : []),
                        ]}
                        progress={
                          article.openCount + article.resolvedCount > 0
                            ? Math.round(
                                (article.resolvedCount /
                                  (article.openCount + article.resolvedCount)) *
                                  100,
                              )
                            : 0
                        }
                        openCount={article.openCount}
                        imageUrl={article.imageUrl}
                      />
                    ))
                  )}
                </Box>
              </div>
            </Card>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
