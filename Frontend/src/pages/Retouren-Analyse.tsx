import { useEffect, useMemo, useState } from "react";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@jtl-software/platform-ui-react";
import QualityReviewModal from "../components/QualityReviewModal";
import { useSearchParams } from "react-router-dom";
import { apiFetch } from "../utils/api";
import { BAND_LABELS, buildReturnsApiUrl, parseBand, type RiskBand } from "../utils/riskBand";
import type { ReturnItem, SettingsApiDto, ArticleDetailDTO } from "../types/api";

const DEFAULT_YELLOW_THRESHOLD = 10;
const DEFAULT_RED_THRESHOLD = 25;

// Statt der drei einzelnen Bereichs-Tags (Qualität/Beschreibung/Empfehlungen) jetzt direkt nach
// dem kombinierten Offen/Abgeschlossen-Status filtern (siehe ArticleStatusToggle) - der ist die
// eigentlich relevante Frage: "was muss ich mir noch anschauen?".
const TAG_FILTERS = ["Alle Artikel", "Offen", "Abgeschlossen", "Keine Empfehlung"] as const;
type TagFilter = (typeof TAG_FILTERS)[number];

function matchesTagFilter(item: ReturnItem, filter: TagFilter): boolean {
  switch (filter) {
    case "Offen":
      return item.aiStatus !== "Keine Empfehlung" && !item.isFullyResolved;
    case "Abgeschlossen":
      return Boolean(item.isFullyResolved);
    case "Keine Empfehlung":
      return item.aiStatus === "Keine Empfehlung";
    default:
      return true;
  }
}

type ArticlesState =
  | { status: "loading" }
  | { status: "ready"; data: ReturnItem[] }
  | { status: "error"; message: string; staleData: ReturnItem[] };

interface ThresholdsState {
  yellow: number;
  red: number;
  isFallback: boolean;
}

const BAND_CHIP_CLASSES: Record<RiskBand, string> = {
  red: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900",
  yellow:
    "bg-yellow-50 text-yellow-800 border-yellow-200 dark:bg-yellow-950/40 dark:text-yellow-300 dark:border-yellow-900",
  green:
    "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-300 dark:border-green-900",
};

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

// Reiner Status-Indikator (kein Bedienelement) im Stil eines Toggles: welche Seite hervorgehoben
// ist, sagt auf einen Blick, ob für diesen Artikel noch etwas offen ist oder wirklich ALLE drei
// Bereiche (Qualität, KI-Beschreibung, Empfehlungen) fertig bearbeitet sind - anders als der alte
// aiStatus-Text, der sich nur nach dem Beschreibungsvorschlag richtete.
function ArticleStatusToggle({ isFullyResolved }: { isFullyResolved: boolean }) {
  return (
    <div
      className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 p-0.5 dark:border-slate-700 dark:bg-slate-800"
      role="status"
      aria-label={isFullyResolved ? "Abgeschlossen" : "Offen"}
    >
      <span
        className={`rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${
          !isFullyResolved
            ? "bg-amber-500 text-white shadow-sm"
            : "text-slate-400 dark:text-slate-500"
        }`}
      >
        Offen
      </span>
      <span
        className={`rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${
          isFullyResolved
            ? "bg-green-600 text-white shadow-sm"
            : "text-slate-400 dark:text-slate-500"
        }`}
      >
        Abgeschlossen
      </span>
    </div>
  );
}

function TableRowSkeleton() {
  return (
    <tr className="animate-pulse">
      <td className="px-4 py-4">
        <div className="h-4 w-16 rounded bg-slate-200 dark:bg-slate-700" />
      </td>
      <td className="px-4 py-4">
        <div className="h-4 w-36 rounded bg-slate-200 dark:bg-slate-700" />
      </td>
      <td className="px-4 py-4">
        <div className="h-4 w-20 rounded bg-slate-100 dark:bg-slate-800" />
      </td>
      <td className="px-4 py-4">
        <div className="h-7 w-16 rounded-full bg-slate-200 dark:bg-slate-700" />
      </td>
      <td className="px-4 py-4">
        <div className="h-6 w-24 rounded-full bg-slate-200 dark:bg-slate-700" />
      </td>
    </tr>
  );
}

export default function RetourenAnalyseView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeBand = parseBand(searchParams.get("band"));
  const [query, setQuery] = useState("");
  const [desc, setDesc] = useState(true);
  const [tagFilter, setTagFilter] = useState<TagFilter>("Alle Artikel");

  const [articlesState, setArticlesState] = useState<ArticlesState>({ status: "loading" });
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [thresholds, setThresholds] = useState<ThresholdsState>({
    yellow: DEFAULT_YELLOW_THRESHOLD,
    red: DEFAULT_RED_THRESHOLD,
    isFallback: false,
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | number | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<ArticleDetailDTO | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  // Kleiner Tooltip, der der Maus folgt, solange über einer Tabellenzeile gehovert wird - wie im
  // Aktionsplan, damit sofort klar ist, dass die Zeile anklickbar ist.
  const [hoverTip, setHoverTip] = useState<{ id: string | number; x: number; y: number } | null>(
    null,
  );

  const fetchArticleDetail = async (id: string | number): Promise<ArticleDetailDTO | null> => {
    setDetailError(null);
    setDetailLoading(true);
    try {
      const res = await apiFetch(`/api/articles/${encodeURIComponent(String(id))}`);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text}`);
      }
      const dto = (await res.json()) as ArticleDetailDTO;
      setSelectedDetail(dto);
      return dto;
    } catch (e) {
      console.error("Fehler beim Laden der Artikeldetails:", e);
      setDetailError(
        e instanceof Error ? e.message : "Die Artikeldetails konnten nicht geladen werden.",
      );
      setSelectedDetail(null);
      return null;
    } finally {
      setDetailLoading(false);
    }
  };

  const refetchSelectedDetail = async (): Promise<ArticleDetailDTO | null> => {
    if (selectedId === null) return null;
    return await fetchArticleDetail(selectedId);
  };

  useEffect(() => {
    const searchQuery = searchParams.get("search");
    if (searchQuery !== null) {
      setQuery(searchQuery);
    }
  }, [searchParams]);

  // Deep-Link vom Aktionsplan (/retouren-analyse?open=<articleId>) - öffnet automatisch das
  // Review-Modal für den Artikel, sobald die Tabelle geladen ist. Wartet bewusst auf "ready",
  // sonst gibt es beim ersten Render noch keine Zeilen zum Matchen.
  useEffect(() => {
    const openId = searchParams.get("open");
    if (!openId || articlesState.status !== "ready") return;

    const match = articlesState.data.find(
      (item) => String(item.id ?? item.articleNumber) === openId,
    );
    if (!match) return;

    const id = match.id ?? match.articleNumber;
    setSelectedId(id);
    setSelectedDetail(null);
    setIsModalOpen(true);
    void fetchArticleDetail(id);

    const next = new URLSearchParams(searchParams);
    next.delete("open");
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, articlesState]);

  // Also re-run after modal saves so KI-Status stays in sync.
  const loadArticles = async (band: RiskBand | null) => {
    const hasVisibleData =
      articlesState.status === "ready" ||
      (articlesState.status === "error" && articlesState.staleData.length > 0);

    if (hasVisibleData) {
      setIsRefreshing(true);
    } else {
      setArticlesState({ status: "loading" });
    }

    try {
      const response = await apiFetch(buildReturnsApiUrl(band));
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
      setArticlesState({ status: "ready", data });
    } catch (error) {
      console.error("Fehler beim Laden der Retourendaten:", error);
      const message =
        error instanceof Error ? error.message : "Die Retourendaten konnten nicht geladen werden.";
      setArticlesState((prev) => ({
        status: "error",
        message,
        staleData:
          prev.status === "ready" ? prev.data : prev.status === "error" ? prev.staleData : [],
      }));
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    void loadArticles(activeBand);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBand]);

  useEffect(() => {
    const loadThresholds = async () => {
      try {
        const response = await apiFetch("/api/settings");
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const data = (await response.json()) as SettingsApiDto;
        setThresholds({
          yellow: Number(data.thresholdYellow),
          red: Number(data.thresholdRed),
          isFallback: false,
        });
      } catch (error) {
        console.error("Fehler beim Laden der Schwellenwerte:", error);
        setThresholds({
          yellow: DEFAULT_YELLOW_THRESHOLD,
          red: DEFAULT_RED_THRESHOLD,
          isFallback: true,
        });
      }
    };

    void loadThresholds();
  }, []);

  const clearBandFilter = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("band");
    setSearchParams(next);
  };

  const articles =
    articlesState.status === "ready"
      ? articlesState.data
      : articlesState.status === "error"
        ? articlesState.staleData
        : [];

  const hasError = articlesState.status === "error";
  const isInitialLoading = articlesState.status === "loading";

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();

    const filtered = articles.filter(
      (d) =>
        (d.name.toLowerCase().includes(q) ||
          d.articleNumber.toLowerCase().includes(q) ||
          d.category.toLowerCase().includes(q)) &&
        matchesTagFilter(d, tagFilter),
    );

    return [...filtered].sort((a, b) =>
      desc ? b.returnRate - a.returnRate : a.returnRate - b.returnRate,
    );
  }, [articles, query, desc, tagFilter]);

  const hasActiveQuery = query.trim().length > 0;
  const hasActiveTagFilter = tagFilter !== "Alle Artikel";

  const emptyMessage = activeBand
    ? `Keine Artikel in der Risikoklasse „${BAND_LABELS[activeBand]}“.`
    : "Keine zurückgesendeten Artikel gefunden.";

  return (
    <>
      <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
            <div className="flex items-center gap-3 flex-wrap">
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
              {activeBand && (
                <div
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${BAND_CHIP_CLASSES[activeBand]}`}
                  data-testid="active-band-filter"
                >
                  <span className="font-medium">{BAND_LABELS[activeBand]}</span>
                  <button
                    type="button"
                    onClick={clearBandFilter}
                    className="rounded-full px-1.5 text-xs font-semibold hover:opacity-70"
                    aria-label="Ampelfilter entfernen"
                  >
                    ×
                  </button>
                </div>
              )}
              {thresholds.isFallback && (
                <span
                  className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300"
                  title={`Schwellenwerte konnten nicht geladen werden – Standardwerte (${DEFAULT_YELLOW_THRESHOLD}% / ${DEFAULT_RED_THRESHOLD}%) werden verwendet.`}
                  data-testid="thresholds-fallback-badge"
                >
                  Standard-Schwellenwerte aktiv
                </span>
              )}
            </div>
            {activeBand && <Button label="Filter löschen" onClick={clearBandFilter} />}
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="text-sm text-slate-500 dark:text-slate-400">Filter:</span>
            {TAG_FILTERS.map((tag) => (
              <Button
                key={tag}
                label={tag}
                variant={tagFilter === tag ? "highlight" : "ghost"}
                onClick={() => setTagFilter(tag)}
              />
            ))}
          </div>

          <Card className="dark:bg-slate-900 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="dark:text-slate-100">
                {activeBand ? `Artikelübersicht – ${BAND_LABELS[activeBand]}` : "Artikelübersicht"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {hasError && articles.length > 0 && (
                <div
                  className="mb-4 flex items-center justify-between gap-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
                  role="alert"
                  data-testid="returns-error-banner"
                >
                  <span>
                    {articlesState.status === "error" ? articlesState.message : ""} — zuletzt
                    geladene Daten werden weiter angezeigt.
                  </span>
                  <Button
                    label={isRefreshing ? "Lädt…" : "Erneut versuchen"}
                    onClick={() => void loadArticles(activeBand)}
                    disabled={isRefreshing}
                  />
                </div>
              )}

              <div className="overflow-x-auto">
                {isInitialLoading ? (
                  <table className="min-w-full divide-y divide-gray-100 dark:divide-slate-700">
                    <tbody className="bg-white divide-y divide-gray-100 dark:bg-slate-900 dark:divide-slate-700">
                      {Array.from({ length: 6 }, (_, index) => (
                        <TableRowSkeleton key={`table-skeleton-${index}`} />
                      ))}
                    </tbody>
                  </table>
                ) : hasError && articles.length === 0 ? (
                  <div className="p-8 text-center text-sm" data-testid="returns-error-state">
                    <p className="mb-3 text-red-600 dark:text-red-400">
                      {articlesState.status === "error"
                        ? articlesState.message
                        : "Unbekannter Fehler."}
                    </p>
                    <Button
                      label={isRefreshing ? "Lädt…" : "Erneut versuchen"}
                      onClick={() => void loadArticles(activeBand)}
                      disabled={isRefreshing}
                    />
                  </div>
                ) : articles.length === 0 ? (
                  <div
                    className="p-8 text-center text-sm text-slate-500 dark:text-slate-400"
                    data-testid="returns-empty-state"
                  >
                    {emptyMessage}
                  </div>
                ) : visible.length === 0 ? (
                  <div
                    className="p-8 text-center text-sm text-slate-500 dark:text-slate-400"
                    data-testid="returns-empty-search-state"
                  >
                    <p className="mb-3">
                      {hasActiveQuery
                        ? `Keine Treffer für den Suchbegriff „${query}“.`
                        : "Keine Artikel für diesen Filter."}
                    </p>
                    <Button
                      label={hasActiveQuery || hasActiveTagFilter ? "Filter zurücksetzen" : "Suche zurücksetzen"}
                      onClick={() => {
                        setQuery("");
                        setTagFilter("Alle Artikel");
                      }}
                    />
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
                          Retourenquote
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-slate-300">
                          KI-Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100 dark:bg-slate-900 dark:divide-slate-700">
                      {visible.map((row) => {
                        const rc = rateClasses(row.returnRate, thresholds.yellow, thresholds.red);
                        const rowId = row.id ?? row.articleNumber;
                        return (
                          <tr
                            key={rowId}
                            className="relative cursor-pointer transition-all duration-150 hover:bg-blue-50 hover:shadow-[inset_0_0_0_1px_rgba(59,130,246,0.4),0_0_20px_-4px_rgba(59,130,246,0.5)] dark:hover:bg-blue-950/30 dark:hover:shadow-[inset_0_0_0_1px_rgba(96,165,250,0.5),0_0_24px_-4px_rgba(96,165,250,0.65)]"
                            onMouseMove={(e) => setHoverTip({ id: rowId, x: e.clientX, y: e.clientY })}
                            onMouseLeave={() =>
                              setHoverTip((current) => (current?.id === rowId ? null : current))
                            }
                            onClick={async () => {
                              const id = row.id ?? row.articleNumber;

                              if (id === undefined || id === null) {
                                console.error(
                                  "Retouren-Analyse: Artikel-ID und articleNumber fehlen für row",
                                  row,
                                );
                                setSelectedId(null);
                                setSelectedDetail(null);
                                setDetailError(
                                  "Keine gültige Artikelkennung verfügbar. Bitte Backend /api/articles/returns prüfen.",
                                );
                                setDetailLoading(false);
                                setIsModalOpen(true);
                                return;
                              }

                              setSelectedId(id);
                              setSelectedDetail(null);
                              setIsModalOpen(true);
                              await fetchArticleDetail(id);
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
                            <td className="px-4 py-4 text-sm">
                              {row.aiStatus === "Keine Empfehlung" ? (
                                <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                  {row.aiStatus}
                                </span>
                              ) : (
                                <ArticleStatusToggle isFullyResolved={Boolean(row.isFullyResolved)} />
                              )}
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

      <QualityReviewModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedId(null);
          setSelectedDetail(null);
          setDetailError(null);
          setDetailLoading(false);
        }}
        articleDetail={selectedDetail}
        isLoading={detailLoading}
        error={detailError}
        onArticleUpdated={() => void loadArticles(activeBand)}
        onRefetchDetail={refetchSelectedDetail}
      />

      {hoverTip && (
        <div
          className="pointer-events-none fixed z-50 rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg dark:bg-slate-700"
          style={{ left: hoverTip.x + 16, top: hoverTip.y + 16 }}
        >
          Hier zur KI-Analyse navigieren →
        </div>
      )}
    </>
  );
}
