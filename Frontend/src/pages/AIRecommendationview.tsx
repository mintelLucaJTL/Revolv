import { useEffect, useMemo, useState } from "react";
import { Box, Card, Button, CardTitle, Text } from "@jtl-software/platform-ui-react";
import { ArticleCard } from "../components/ArticleCard";
import Sidebar from "../components/Sidebar";
import TopNavigationBar from "../components/TopNavigationBar";
import ArticleDetailsPanel from "../components/ArticleDetailsPanel";

/**
 * Filter-Labels für die obere Filterleiste.
 * (Nur UI-Platzhalter; reale Filter-Logik kann später ergänzt werden.)
 */
const filters = ["Alle Artikel", "Qualität", "Beschreibung", "Empfehlungen"];

/**
 * Typdefinition für die minimale Artikelübersicht, wie sie von der API erwartet wird.
 * Felder, die hier fehlen, können später ergänzt werden.
 */
interface ArticleOverview {
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

/* Beispiel‑Daten für den Fallback (Dev / Offline), falls Backend keine Daten liefert. */
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
    name: "Beispiel T‑Shirt",
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

/**
 * Header-Komponente für die KI‑Übersichtsseite.
 * Zeigt Titel, offene/erledigte Zähler und einen Fortschrittsbalken an.
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
  // Berechne Gesamt-Fortschritt in Prozent (sicher gegenüber Division durch 0)
  const total = openCount + doneCount;
  const progressPercent = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  return (
    <Box className="w-full rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6 shadow-lg mb-6">
      <Box className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Linke Seite: Titel + Zähler */}
        <Box className="flex flex-col gap-1">
          <Box className="flex items-center gap-2">
            {/* Dekoratives Icon neben dem Titel */}
            <svg className="w-6 h-6 text-white opacity-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
            <h1 className="text-white text-2xl font-bold tracking-tight">{title}</h1>
          </Box>
          <p className="text-blue-100 text-sm font-medium">
            {openCount} offen · {doneCount} erledigt
          </p>
        </Box>

        {/* Rechte Seite: Fortschrittsanzeige */}
        <Box className="flex flex-col gap-1.5 sm:min-w-[200px]">
          <Box className="flex items-center justify-between">
            <span className="text-blue-100 text-xs font-medium">Fortschritt</span>
            <span className="text-white text-xs font-bold">{progressPercent}%</span>
          </Box>
          <Box className="w-full h-2.5 bg-white/20 rounded-full overflow-hidden">
            <div className="h-full bg-white rounded-full transition-all duration-700" style={{ width: `${progressPercent}%` }} />
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
 * Hauptkomponente für die KI‑Empfehlungsseite.
 * Verantwortlich für:
 * - Laden der Artikelübersicht (API call)
 * - Anzeige von Cards (ArticleCard)
 * - Fallback-/Fehlerzustände (Fehlermeldung / Beispielartikel)
 * - Öffnen/Schließen des Side‑Panels (`ArticleDetailsPanel`)
 */
export default function AIRecommendationView() {
  const [articles, setArticles] = useState<ArticleOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State für das Side‑Panel (welcher Artikel ist ausgewählt + offen/geschlossen)
  const [selectedArticle, setSelectedArticle] = useState<ArticleOverview | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  // Lade Daten von der API beim Mounten der Komponente
  useEffect(() => {
    const fetchOverview = async () => {
      try {
        const response = await fetch("http://localhost:5215/api/ai/overview");

        if (!response.ok) {
          // Wenn API Fehler liefert, wirf, damit wir im Catch landen
          throw new Error("Fehler beim Laden der KI-Übersicht");
        }

        // Erwartetes Format: Array von ArticleOverview
        const data: ArticleOverview[] = await response.json();
        setArticles(Array.isArray(data) ? data : []);
      } catch (err) {
        // Fehler-Handling: setze eine Nutzer‑freundliche Fehlermeldung und logge Details
        console.error("Fetch AI overview error:", err);
        setError("Die Artikel konnten nicht geladen werden.");
        setArticles([]); // Sicherstellen: articles ist immer ein Array
      } finally {
        setLoading(false);
      }
    };

    fetchOverview();
  }, []);

  // Berechne Gesamtzahlen (offen/erledigt) für Header-Anzeige
  const { totalOpen, totalResolved } = useMemo(() => {
    return articles.reduce(
      (acc, article) => ({
        totalOpen: acc.totalOpen + article.openCount,
        totalResolved: acc.totalResolved + article.resolvedCount,
      }),
      { totalOpen: 0, totalResolved: 0 },
    );
  }, [articles]);

  // Öffnet das Side-Panel für einen Artikel
  function openArticlePanel(article: ArticleOverview) {
    setSelectedArticle(article);
    setPanelOpen(true);
  }

  // Schließt das Side-Panel
  function closePanel() {
    setPanelOpen(false);
    setSelectedArticle(null);
  }

  // Fallback-Anzeige: wenn keine Artikel vom Backend kommen (kein Fehler, aber leere Liste)
  const showFallbackExamples = !loading && !error && articles.length === 0;

  return (
    <Box className="min-h-screen bg-slate-50">
      <TopNavigationBar />
      <Box className="flex">
        <Sidebar />

        <Box className="flex-1 p-6">
          <Box className="max-w-7xl mx-auto flex flex-col gap-4">
            {/* Header: Gesamtfortschritt der KI-Empfehlungen */}
            <AIRecommendationHeader openCount={totalOpen} doneCount={totalResolved} />

            <Card className="p-6">
              <div className="flex flex-col gap-4">
                {/* Sektionstitel + Beschreibung */}
                <Box className="flex flex-col gap-2">
                  <CardTitle>Artikel-Übersicht</CardTitle>
                  <Text>Alle offenen KI-Empfehlungen auf einen Blick</Text>
                </Box>

                {/* Filterleiste (UI) — konkrete Filter-Logik kann später ergänzt werden */}
                <Box className="flex flex-wrap gap-2">
                  {filters.map((filter) => (
                    <Button key={filter} label={filter} variant="secondary" />
                  ))}
                </Box>

                {/* Grid mit Artikelkarten / Fallback / Fehlerzuständen */}
                <Box className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {loading ? (
                    // Ladezustand
                    <div className="text-sm text-slate-600">Lade Artikel …</div>
                  ) : error ? (
                    // API-Fehler: Fehlermeldung anzeigen
                    <div className="text-sm text-red-600">{error}</div>
                  ) : articles.length > 0 ? (
                    // Normale Anzeige: Karten aus API-Daten
                    articles.map((article) => (
                      <div
                        key={article.id}
                        name={article.name}
                        articleNo={article.articleNumber}
                        category={article.category}
                        size={article.size}
                        returnRate={article.returnRate}
                        hasQualityBadge={article.hasQualityBadge}
                        hasDescriptionBadge={article.hasDescriptionBadge}
                        hasRecommendationBadge={article.hasRecommendationBadge}
                        openCount={article.openCount}
                        resolvedCount={article.resolvedCount}
                        imageUrl={article.imageUrl}
                      />
                    ))
                  ) : showFallbackExamples ? (
                    // Kein Fehler, aber leere Liste: Beispielartikel anbieten (hilfreich im Dev)
                    <>
                      <div className="col-span-full text-sm text-slate-600">Keine Artikel gefunden. Hier sind Beispielartikel zum Testen:</div>
                      {sampleArticles.map((article) => (
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
                            tags={[
                              ...(article.hasQualityBadge ? ["Qualität"] : []),
                              ...(article.hasDescriptionBadge ? ["Beschreibung"] : []),
                              ...(article.hasRecommendationBadge ? ["Empfehlung"] : []),
                            ]}
                            progress={
                              article.openCount + article.resolvedCount > 0
                                ? Math.round((article.resolvedCount / (article.openCount + article.resolvedCount)) * 100)
                                : 0
                            }
                            openCount={article.openCount}
                            imageUrl={article.imageUrl}
                          />
                        </div>
                      ))}
                    </>
                  ) : (
                    // Keine Artikel (stiller Zustand)
                    <div className="text-sm text-slate-600">Keine Artikel vorhanden.</div>
                  )}
                </Box>
              </div>
            </Card>
          </Box>
        </Box>
      </Box>

      {/* Side-Panel für Artikel-Details (KI-Ansicht)
          - Wir übergeben nur die benötigten Felder an die Panel-Komponente.
          - ArticleDetailsPanel handhabt Escape/Overlay/X zum Schließen. */}
      <ArticleDetailsPanel
        article={
          selectedArticle
            ? {
                image: (selectedArticle as any).imageUrl ?? (selectedArticle as any).image,
                name: selectedArticle.name,
                number: selectedArticle.articleNo,
                returnRate: selectedArticle.returnRate as any,
              }
            : null
        open={panelOpen}
        onClose={closePanel}
      />
    </Box>
  );
}