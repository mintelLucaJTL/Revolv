import { useEffect, useState } from "react";
import { Card, CardHeader, CardContent, Text, Box } from "@jtl-software/platform-ui-react";
import { apiFetch } from "../utils/api";

type Variant = "red" | "green" | "yellow";

// Shape von GET /api/articles/returns?band=... (ArticleTableDTO, siehe ReturnController).
interface FilteredArticleItem {
  articleNumber: string;
  name: string;
  mostFrequentReason: string | null;
}

interface Props {
  variant: Variant; // Farbe / visueller Status der Kachel
  badgeLabel?: string; // Kleine obere Beschriftung (z. B. "ÜBER 25%")
  smallLabel?: string; // Hauptbeschreibung (z. B. "Hohe Retourenquote")
  value: number | string; // Auffällige Zahl in großem Format (z. B. 3)
  percent?: string;
  onClick?: () => void;
  // Auf-/Zuklapp-Status wird vom Dashboard gesteuert, damit alle drei Ampel-Karten synchron reagieren.
  isExpanded: boolean;
  onToggleExpanded: () => void;
}

// Zentrales Design wie sehen die farben aus für das Ampel-Prinzip.
// Verhindert unübersichtliche IF-Abfragen im Code.
const CONFIG = {
  red: { border: "border-red-100", accent: "text-red-600", bg: "bg-red-50", pill: "bg-red-600" },
  green: {
    border: "border-green-100",
    accent: "text-green-600",
    bg: "bg-green-50",
    pill: "bg-green-600",
  },
  yellow: {
    border: "border-yellow-100",
    accent: "text-yellow-600",
    bg: "bg-yellow-50",
    pill: "bg-yellow-500",
  },
} as const;

export default function KpiCard({
  variant,
  badgeLabel,
  smallLabel,
  value,
  percent,
  onClick,
  isExpanded,
  onToggleExpanded,
}: Props) {
  // Wähle die passenden CSS-Klassen für die gewählte Variant-Farbe.
  const cfg = CONFIG[variant];

  const [articles, setArticles] = useState<FilteredArticleItem[]>([]);
  const [isLoadingArticles, setIsLoadingArticles] = useState(false);
  const [articlesError, setArticlesError] = useState<string | null>(null);

  // Lädt die Artikel dieser Risikoklasse erst, wenn die Karte aufgeklappt wird.
  useEffect(() => {
    if (!isExpanded) return;

    let cancelled = false;

    const fetchArticles = async () => {
      setIsLoadingArticles(true);
      setArticlesError(null);

      try {
        const response = await apiFetch(`/api/articles/returns?band=${variant}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch articles (HTTP error: ${response.status})`);
        }
        const data = (await response.json()) as FilteredArticleItem[];
        if (!cancelled) setArticles(data);
      } catch (err) {
        if (!cancelled) {
          setArticlesError(err instanceof Error ? err.message : "An error occurred");
        }
      } finally {
        if (!cancelled) setIsLoadingArticles(false);
      }
    };

    void fetchArticles();

    return () => {
      cancelled = true;
    };
  }, [isExpanded, variant]);

  return (
    <Card
      // Dynamische Klassen für Rahmenfarbe + interaktive Hover-Effekte bei Klickbarkeit
      className={`rounded-lg ${cfg.border} hover:shadow-sm transition-all cursor-pointer dark:bg-slate-900 dark:border-slate-700 ${isExpanded ? "p-4" : "p-2"}`}
      onClick={onClick}
      // Barrierefreiheit : Macht das Element als Button erkennbar
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={smallLabel}
    >
      <CardHeader
        className={`flex items-start justify-between p-0 ${isExpanded ? "mb-2" : "mb-1"}`}
      >
        <div className="flex items-center gap-3">
          {/* Runder Icon-Button in Statusfarbe: klappt die Karte ein/aus */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpanded();
            }}
            className={`${cfg.bg} p-2 rounded-full dark:bg-slate-800`}
            aria-label={isExpanded ? "Karte einklappen" : "Karte ausklappen"}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={`${cfg.accent} transition-transform ${isExpanded ? "" : "rotate-180"}`}
            >
              <path d="M7 14l5-5 5 5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {isExpanded ? (
          <>
            {/* badgeLabel: kleiner Hinweis oben (z. B. "ÜBER 25%") */}
            {badgeLabel && (
              <Box className="mb-2 dark:text-slate-200">
                <Text>{badgeLabel}</Text>
              </Box>
            )}
            {/* Großer Wert mit Farb-Akzent */}
            <div className={`${cfg.accent} text-3xl font-bold`}>
              {value} <span className="text-base font-medium">Artikel</span>
            </div>
            {/* Beschreibung / Titel */}
            <Box className="mt-2 dark:text-slate-100">
              <Text weight="bold">{smallLabel}</Text>
            </Box>
            {/* Optionales Prozent-Feld (kleiner Text) */}
            {percent && (
              <Box className="mt-1 dark:text-slate-300">
                <Text>Ø {percent} Retourenquote</Text>
              </Box>
            )}
            {/* Artikel-Tabelle für diese Ampel-Stufe: eigenes, kompaktes Markup statt der
                generischen <Table>, deren feste Höhe und Boxed-Look nicht in die Karte passten. */}
            <div
              className={`mt-3 overflow-hidden rounded-lg border ${cfg.border} dark:border-slate-700`}
              onClick={(e) => e.stopPropagation()}
            >
              {articlesError ? (
                <div className="p-3 text-center text-xs text-red-600">{articlesError}</div>
              ) : isLoadingArticles ? (
                <div className="divide-y divide-slate-100 dark:divide-slate-700">
                  {Array.from({ length: 3 }, (_, index) => (
                    <div key={index} className="flex items-center gap-2 px-3 py-2 animate-pulse">
                      <div className="h-3 w-12 rounded bg-slate-200 dark:bg-slate-700" />
                      <div className="h-3 w-24 rounded bg-slate-200 dark:bg-slate-700" />
                    </div>
                  ))}
                </div>
              ) : articles.length === 0 ? (
                <div className="p-3 text-center text-xs text-slate-500 dark:text-slate-400">
                  Keine Artikel in dieser Risikoklasse.
                </div>
              ) : (
                <div className="max-h-56 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className={`${cfg.bg} dark:bg-slate-800 sticky top-0`}>
                      <tr>
                        <th className="px-3 py-1.5 text-left font-medium text-slate-600 dark:text-slate-300">
                          Artikel-Nr.
                        </th>
                        <th className="px-3 py-1.5 text-left font-medium text-slate-600 dark:text-slate-300">
                          Produktname
                        </th>
                        <th className="px-3 py-1.5 text-left font-medium text-slate-600 dark:text-slate-300">
                          Retourengrund
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {articles.map((article) => (
                        <tr
                          key={article.articleNumber}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                        >
                          <td className="px-3 py-2 text-slate-400 dark:text-slate-500">
                            {article.articleNumber}
                          </td>
                          <td className="px-3 py-2 font-semibold text-slate-900 dark:text-slate-100">
                            {article.name}
                          </td>
                          <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                            {article.mostFrequentReason ?? "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            {/* Zeile 1: Wert + Badge als weiße Pill in der Signalfarbe */}
            <div className="flex items-center gap-2">
              <span className={`${cfg.accent} text-lg font-bold`}>{value} Artikel</span>
              {badgeLabel && (
                <span
                  className={`${cfg.pill} rounded-full px-2 py-0.5 text-xs font-medium text-white`}
                >
                  {badgeLabel}
                </span>
              )}
            </div>
            {/* Zeile 2: Titel + Prozentwert */}
            <Box className="mt-0.5 text-xs dark:text-slate-300">
              <Text>
                {smallLabel}
                {percent ? `: ${percent}` : ""}
              </Text>
            </Box>
          </>
        )}
      </CardContent>
    </Card>
  );
}
