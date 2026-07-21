import { Box, Card, Button, CardTitle, Text } from "@jtl-software/platform-ui-react";
import { ArticleCard } from "../components/ArticleCard";
import Sidebar from "../components/Sidebar";
import TopNavigationBar from "../components/TopNavigationBar";

const filters = ["Alle Artikel", "Qualität", "Beschreibung", "Empfehlungen"];

const sampleArticles = [
  {
    name: "Hose Blau",
    articleNo: "ART-44230",
    category: "Hosen",
    size: "XS",
    returnRate: "high" as const,
    tags: ["Qualität", "Beschreibung"],
    progress: 72,
    openCount: 3,
    imageUrl: "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=400&q=80",
  },
  {
    name: "Weiße Jacke",
    articleNo: "ART-20871",
    category: "Jacken",
    size: "L",
    returnRate: "medium" as const,
    tags: ["Empfehlung", "Qualität"],
    progress: 54,
    openCount: 2,
    imageUrl: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=400&q=80",
  },
  {
    name: "Creme Bluse",
    articleNo: "ART-55891",
    category: "Blusen",
    size: "M",
    returnRate: "low" as const,
    tags: ["Beschreibung"],
    progress: 32,
    openCount: 1,
    imageUrl: "https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=400&q=80",
  },
];

// ─── Header Component ────────────────────────────────────────────────────────

interface AIRecommendationHeaderProps {
  title?: string;
  openCount?: number;
  doneCount?: number;
}

function AIRecommendationHeader({
  title = "KI-Empfehlungen",
  openCount = 23,
  doneCount = 2,
}: AIRecommendationHeaderProps) {
  const total = openCount + doneCount;
  const progressPercent = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  return (
    <Box className="w-full rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6 shadow-lg mb-6">
      <Box className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Left: Title + Subtitle */}
        <Box className="flex flex-col gap-1">
          <Box className="flex items-center gap-2">
            {/* Sparkle icon */}
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

        {/* Right: Progress */}
        <Box className="flex flex-col gap-1.5 sm:min-w-[200px]">
          <Box className="flex items-center justify-between">
            <span className="text-blue-100 text-xs font-medium">Fortschritt</span>
            <span className="text-white text-xs font-bold">{progressPercent}%</span>
          </Box>
          <Box className="w-full h-2.5 bg-white/20 rounded-full overflow-hidden">
            <Box
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

// ─── Page ────────────────────────────────────────────────────────────────────

export default function AIRecommendationView() {
  return (
    <Box className="min-h-screen bg-slate-50">
      <TopNavigationBar />
      <Box className="flex">
        <Sidebar />

        <Box className="flex-1 p-6">
          <Box className="max-w-7xl mx-auto flex flex-col gap-4">

            {/* ← New Header */}
            <AIRecommendationHeader openCount={23} doneCount={2} />

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
                  {sampleArticles.map((article) => (
                    <ArticleCard key={article.articleNo} {...article} />
                  ))}
                </Box>
              </div>
            </Card>

          </Box>
        </Box>
      </Box>
    </Box>
  );
}