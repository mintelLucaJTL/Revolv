import { useEffect, useMemo, useState } from "react";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@jtl-software/platform-ui-react";
import { ChevronDown, ChevronUp, Sparkles } from "lucide-react";
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

const CATEGORY_FILTER_ALL = "";
const CATEGORY_FILTER_NONE = "__none__";

const RETURN_RATE_THRESHOLDS = [5, 10, 20, 50] as const;

const EMPTY_ARTICLES: ReturnItem[] = [];

const TOOLBAR_SELECT_CLASS =
  "rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-blue-200 focus:outline-none dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 dark:focus:ring-blue-900";

type SortKey = "articleNumber" | "name" | "category" | "returnRate" | "aiStatus";
type SortDir = "asc" | "desc";

const TABLE_COLUMNS: { key: SortKey; label: string }[] = [
  { key: "articleNumber", label: "Artikel-Nr." },
  { key: "name", label: "Produktname" },
  { key: "category", label: "Kategorie" },
  { key: "returnRate", label: "Retourenquote" },
  { key: "aiStatus", label: "KI-Status" },
];

/** JSON may send null for string fields even when the TS type is `string`. */
function asSortText(value: string | null | undefined): string {
  return value ?? "";
}

function asSortNumber(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function parseNumericSortValue(value: string): number | null {
  const trimmed = value.trim().replace(",", ".");
  if (trimmed === "") return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function compareNumericOrText(a: string | null | undefined, b: string | null | undefined): number {
  const textA = asSortText(a);
  const textB = asSortText(b);
  const numericA = parseNumericSortValue(textA);
  const numericB = parseNumericSortValue(textB);
  if (numericA !== null && numericB !== null) {
    return numericA - numericB;
  }
  return textA.localeCompare(textB, "de", { numeric: true, sensitivity: "base" });
}

function compareText(a: string | null | undefined, b: string | null | undefined): number {
  return asSortText(a).localeCompare(asSortText(b), "de", { numeric: true, sensitivity: "base" });
}

function statusSortValue(item: ReturnItem): string {
  if (item.aiStatus === "Keine Empfehlung") return item.aiStatus;
  return item.isFullyResolved ? "Abgeschlossen" : "Offen";
}

function compareRows(a: ReturnItem, b: ReturnItem, key: SortKey): number {
  switch (key) {
    case "returnRate":
      return asSortNumber(a.returnRate) - asSortNumber(b.returnRate);
    case "articleNumber":
      return compareNumericOrText(a.articleNumber, b.articleNumber);
    case "name":
      return compareText(a.name, b.name);
    case "category":
      return compareText(a.category, b.category);
    case "aiStatus":
      return asSortText(statusSortValue(a)).localeCompare(asSortText(statusSortValue(b)), "de", {
        sensitivity: "base",
      });
  }
}

function SortableHeader({
  column,
  label,
  sortKey,
  sortDir,
  onSort,
}: {
  column: SortKey;
  label: string;
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
}) {
  const isActive = sortKey === column;
  const ariaSort = isActive ? (sortDir === "asc" ? "ascending" : "descending") : "none";

  return (
    <th
      scope="col"
      aria-sort={ariaSort}
      className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-slate-300"
    >
      <button
        type="button"
        onClick={() => onSort(column)}
        aria-label={`Nach ${label} sortieren`}
        className="inline-flex cursor-pointer select-none items-center gap-1.5 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-200 dark:hover:text-slate-100 dark:focus-visible:ring-blue-900"
      >
        {label}
        {isActive &&
          (sortDir === "asc" ? (
            <ChevronUp className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
          ))}
      </button>
    </th>
  );
}

// Primäre Sortierung für "Alle Artikel": erst Offen (muss noch bearbeitet werden), dann Artikel
// ohne Empfehlung, ganz unten Abgeschlossene - die gewählte Spaltensortierung bleibt sekundäres
// Kriterium innerhalb jeder Gruppe.
function statusSortPriority(item: ReturnItem): number {
  if (item.aiStatus === "Keine Empfehlung") return 1;
  return item.isFullyResolved ? 2 : 0;
}

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

function categoryKey(value: string | null | undefined): string {
  return asSortText(value).trim();
}

function matchesCategoryFilter(item: ReturnItem, filter: string): boolean {
  if (filter === CATEGORY_FILTER_ALL) return true;
  const category = categoryKey(item.category);
  if (filter === CATEGORY_FILTER_NONE) return category === "";
  return category === filter;
}

function matchesReturnRateFilter(item: ReturnItem, minRate: number | null): boolean {
  if (minRate === null) return true;
  return asSortNumber(item.returnRate) >= minRate;
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
  const [sortKey, setSortKey] = useState<SortKey>("returnRate");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [tagFilter, setTagFilter] = useState<TagFilter>("Alle Artikel");
  const [categoryFilter, setCategoryFilter] = useState(CATEGORY_FILTER_ALL);
  const [minReturnRate, setMinReturnRate] = useState<number | null>(null);

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

  // Deep-Link vom Dashboard (/retouren-analyse?filter=Offen) - wählt den Bearbeitungsstatus-Filter
  // vorab aus, damit die "KI-Empfehlungen offen"-Karte direkt gefiltert ankommt.
  useEffect(() => {
    const filterParam = searchParams.get("filter");
    if (filterParam && (TAG_FILTERS as readonly string[]).includes(filterParam)) {
      setTagFilter(filterParam as TagFilter);
    }
  }, [searchParams]);

  // Deep-Link vom Aktionsplan / von "Letzte Retouren" (/retouren-analyse?open=<articleId oder
  // articleNumber>) - öffnet automatisch das Review-Modal für den Artikel, sobald die Tabelle
  // geladen ist. Matcht auf id ODER articleNumber, da der Aktionsplan die id kennt, "Letzte
  // Retouren" aber nur die articleNumber liefert. Wartet bewusst auf "ready", sonst gibt es beim
  // ersten Render noch keine Zeilen zum Matchen.
  useEffect(() => {
    const openId = searchParams.get("open");
    if (!openId || articlesState.status !== "ready") return;

    const match = articlesState.data.find(
      (item) =>
        (item.id !== undefined && item.id !== null && String(item.id) === openId) ||
        item.articleNumber === openId,
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
        : EMPTY_ARTICLES;

  const hasError = articlesState.status === "error";
  const isInitialLoading = articlesState.status === "loading";

  const categoryOptions = useMemo(() => {
    const unique = new Set<string>();
    let hasEmpty = false;
    for (const item of articles) {
      const category = categoryKey(item.category);
      if (category === "") {
        hasEmpty = true;
      } else {
        unique.add(category);
      }
    }
    return {
      names: [...unique].sort((a, b) => a.localeCompare(b, "de", { sensitivity: "base" })),
      hasEmpty,
    };
  }, [articles]);

  useEffect(() => {
    if (articles.length === 0 || categoryFilter === CATEGORY_FILTER_ALL) return;
    const stillValid =
      (categoryFilter === CATEGORY_FILTER_NONE && categoryOptions.hasEmpty) ||
      categoryOptions.names.includes(categoryFilter);
    if (!stillValid) setCategoryFilter(CATEGORY_FILTER_ALL);
  }, [articles.length, categoryFilter, categoryOptions]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();

    const filtered = articles.filter(
      (d) =>
        (asSortText(d.name).toLowerCase().includes(q) ||
          asSortText(d.articleNumber).toLowerCase().includes(q) ||
          asSortText(d.category).toLowerCase().includes(q)) &&
        matchesTagFilter(d, tagFilter) &&
        matchesCategoryFilter(d, categoryFilter) &&
        matchesReturnRateFilter(d, minReturnRate),
    );

    return [...filtered].sort((a, b) => {
      // Status-Gruppierung nur bei "Alle Artikel" - bei den anderen Filtern haben ohnehin alle
      // sichtbaren Artikel denselben Status, da wäre die zusätzliche Sortierung wirkungslos.
      if (tagFilter === "Alle Artikel") {
        const statusDiff = statusSortPriority(a) - statusSortPriority(b);
        if (statusDiff !== 0) return statusDiff;
      }
      const comparison = compareRows(a, b, sortKey);
      return sortDir === "asc" ? comparison : -comparison;
    });
  }, [articles, query, sortKey, sortDir, tagFilter, categoryFilter, minReturnRate]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir("asc");
  };

  const hasActiveQuery = query.trim().length > 0;
  const hasActiveTagFilter = tagFilter !== "Alle Artikel";
  const hasActiveCategoryFilter = categoryFilter !== CATEGORY_FILTER_ALL;
  const hasActiveRateFilter = minReturnRate !== null;
  const hasActiveListFilters = hasActiveTagFilter || hasActiveCategoryFilter || hasActiveRateFilter;

  const resetListFilters = () => {
    setQuery("");
    setTagFilter("Alle Artikel");
    setCategoryFilter(CATEGORY_FILTER_ALL);
    setMinReturnRate(null);
  };

  const emptyMessage = activeBand
    ? `Keine Artikel in der Risikoklasse „${BAND_LABELS[activeBand]}“.`
    : "Keine zurückgesendeten Artikel gefunden.";

  return (
    <>
      <div className="mb-4 flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900 shadow-[0_0_24px_-8px_rgba(59,130,246,0.6)] dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-200 dark:shadow-[0_0_28px_-6px_rgba(96,165,250,0.5)]">
        <Sparkles size={18} className="mt-0.5 flex-shrink-0" aria-hidden="true" />
        <p>
          Hier siehst du alle Artikel mit Retouren, eingefärbt nach Retourenquote (rot/gelb/grün).
          Filtere nach Suchbegriff, Risikoklasse oder Bearbeitungsstatus und klicke auf einen
          Artikel, um die KI-Analyse mit Qualitätsprüfung, Beschreibungsvorschlag und
          Handlungsempfehlungen zu öffnen.
        </p>
      </div>

      <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
            <div className="flex items-center gap-3 flex-wrap">
              <input
                aria-label="Suche Artikel"
                placeholder="Filter: Name, Artikel-Nr., Kategorie..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="rounded-md border border-gray-200 bg-white px-3 py-2 w-72 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-200 focus:outline-none dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:ring-blue-900"
              />
              <select
                aria-label="Kategorie"
                data-testid="category-filter"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className={`${TOOLBAR_SELECT_CLASS} max-w-[16rem]`}
              >
                <option value={CATEGORY_FILTER_ALL}>Alle Kategorien</option>
                {categoryOptions.hasEmpty && (
                  <option value={CATEGORY_FILTER_NONE}>Ohne Kategorie</option>
                )}
                {categoryOptions.names.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
              <select
                aria-label="Retourenquote"
                data-testid="return-rate-filter"
                value={minReturnRate === null ? "" : String(minReturnRate)}
                onChange={(e) => {
                  const value = e.target.value;
                  setMinReturnRate(value === "" ? null : Number(value));
                }}
                className={TOOLBAR_SELECT_CLASS}
              >
                <option value="">Alle</option>
                {RETURN_RATE_THRESHOLDS.map((threshold) => (
                  <option key={threshold} value={threshold}>
                    {`≥ ${threshold} %`}
                  </option>
                ))}
              </select>
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
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="dark:text-slate-100">
                  {activeBand ? `Artikelübersicht – ${BAND_LABELS[activeBand]}` : "Artikelübersicht"}
                </CardTitle>
                {isRefreshing && (
                  <span
                    className="inline-flex items-center gap-1.5 text-xs font-normal text-slate-500 dark:text-slate-400"
                    role="status"
                    aria-live="polite"
                  >
                    <span
                      className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"
                      aria-hidden="true"
                    />
                    Aktualisiere…
                  </span>
                )}
              </div>
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
                    isLoading={isRefreshing}
                  />
                </div>
              )}

              <div className="overflow-x-auto" aria-busy={isRefreshing || isInitialLoading}>
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
                      isLoading={isRefreshing}
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
                      label={hasActiveQuery || hasActiveListFilters ? "Filter zurücksetzen" : "Suche zurücksetzen"}
                      onClick={resetListFilters}
                    />
                  </div>
                ) : (
                  <table className="min-w-full divide-y divide-gray-100 dark:divide-slate-700">
                    <thead className="bg-gray-50 dark:bg-slate-800">
                      <tr>
                        {TABLE_COLUMNS.map((column) => (
                          <SortableHeader
                            key={column.key}
                            column={column.key}
                            label={column.label}
                            sortKey={sortKey}
                            sortDir={sortDir}
                            onSort={handleSort}
                          />
                        ))}
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
