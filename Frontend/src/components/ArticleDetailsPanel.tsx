import { useEffect, useState } from "react";
import { Box, Text, Card, CardContent, Button, Badge } from "@jtl-software/platform-ui-react";
import ArticleReviewSections from "./ArticleReviewSections";
import { apiFetch } from "../utils/api";
import { useArticleReview } from "../hooks/useArticleReview";
import type { ArticleDetailDTO } from "../types/api";

type ArticleType = {
  id: number;
  image?: string;
  name: string;
  number?: string | number;
  returnRate?: string | number;
  category?: string;
  size?: string;
};

function getReturnRateBadgeVariant(
  returnRate?: string | number,
): "danger" | "warning" | "success" | "secondary" {
  const level =
    typeof returnRate === "number"
      ? returnRate > 25
        ? "high"
        : returnRate >= 10
          ? "medium"
          : "low"
      : returnRate;

  switch (level) {
    case "high":
      return "danger";
    case "medium":
      return "warning";
    case "low":
      return "success";
    default:
      return "secondary";
  }
}

function getReturnRateBadgeLabel(returnRate?: string | number): string {
  if (typeof returnRate === "number") return `${returnRate.toFixed(1)}%`;
  switch (returnRate) {
    case "high":
      return "Hoch";
    case "medium":
      return "Mittel";
    case "low":
      return "Niedrig";
    default:
      return "—";
  }
}

export default function ArticleDetailsPanel({
  article,
  open,
  onClose,
  onArticleUpdated,
}: {
  article: ArticleType | null;
  open: boolean;
  onClose: () => void;
  onArticleUpdated?: () => void;
}) {
  const [articleDetail, setArticleDetail] = useState<ArticleDetailDTO | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const review = useArticleReview(articleDetail, onArticleUpdated);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open && typeof document !== "undefined") {
      document.addEventListener("keydown", onKey);
    }
    return () => {
      if (typeof document !== "undefined") {
        document.removeEventListener("keydown", onKey);
      }
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !article?.id) {
      setArticleDetail(null);
      setDetailError(null);
      setDetailLoading(false);
      return;
    }

    const articleId = article.id;
    let cancelled = false;

    const fetchDetails = async () => {
      setDetailLoading(true);
      setDetailError(null);

      try {
        const response = await apiFetch(`/api/articles/${encodeURIComponent(String(articleId))}`);

        if (!response.ok) {
          throw new Error(`Artikeldetails konnten nicht geladen werden (${response.status})`);
        }

        const dto = (await response.json()) as ArticleDetailDTO;
        if (!cancelled) {
          setArticleDetail(dto);
        }
      } catch (err) {
        console.error("Fetch article details error:", err);
        if (!cancelled) {
          setDetailError(
            err instanceof TypeError
              ? "Backend nicht erreichbar."
              : err instanceof Error
                ? err.message
                : "Die Artikeldetails konnten nicht geladen werden.",
          );
          setArticleDetail(null);
        }
      } finally {
        if (!cancelled) {
          setDetailLoading(false);
        }
      }
    };

    void fetchDetails();

    return () => {
      cancelled = true;
    };
  }, [open, article?.id, reloadToken]);

  if (!open || !article) return null;

  const displayName = articleDetail?.name ?? article.name;
  const displayNumber = articleDetail?.articleNumber ?? article.number;
  const displayCategory = articleDetail?.category ?? article.category;
  const aiSummaryText = review.aiRec?.aiSummaryText;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 backdrop-blur-xs p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`KI-Empfehlungen für ${article.name}`}
        className="my-8 w-full max-w-6xl bg-white dark:bg-slate-900 rounded-[28px] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        <Box className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 p-4 flex items-start justify-between z-10">
          <Box className="flex items-center gap-3 min-w-0">
            <img
              src={article.image ?? "/placeholder.png"}
              alt={displayName ?? "Artikel"}
              className="w-14 h-14 object-cover rounded-lg flex-shrink-0 bg-slate-100 dark:bg-slate-800"
            />
            <Box className="min-w-0">
              <Box className="flex items-center gap-1.5 dark:text-slate-500">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500 flex-shrink-0" />
                <Text type="xs" color="muted">
                  ART-{displayNumber ?? "—"}
                </Text>
              </Box>
              <Box className="dark:text-slate-100 truncate">
                <Text weight="bold">{displayName}</Text>
              </Box>
              <Box className="mt-1 flex items-center gap-2 flex-wrap">
                <Badge
                  label={getReturnRateBadgeLabel(article.returnRate)}
                  variant={getReturnRateBadgeVariant(article.returnRate)}
                />
                {(displayCategory || article.size) && (
                  <Text type="xs" color="muted">
                    {[displayCategory, article.size].filter(Boolean).join(" · ")}
                  </Text>
                )}
              </Box>
              {!detailLoading && !detailError && articleDetail && (
                <Box className="mt-1">
                  <Text type="xs" color="muted">
                    {review.reviewProgress.reviewedCount} / {review.reviewProgress.totalCount}{" "}
                    bearbeitet
                  </Text>
                </Box>
              )}
            </Box>
          </Box>
          <Button variant="ghost" size="icon" aria-label="Schließen" onClick={onClose} label="✕" />
        </Box>

        <div className="p-4 overflow-y-auto flex-1">
          {/* KI-Zusammenfassung */}
          <section className="mb-6">
            <Card className="bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 rounded-xl p-0 shadow-none">
              <CardContent className="p-3 flex items-start gap-2 text-blue-900 dark:text-blue-200">
                <span className="mt-0.5 flex-shrink-0">✨</span>
                <div className="text-sm">
                  {detailLoading ? (
                    <div
                      className="flex items-center gap-2 py-1 text-blue-700 dark:text-blue-300"
                      role="status"
                      aria-live="polite"
                      aria-label="Lade KI-Zusammenfassung"
                    >
                      <svg
                        className="h-4 w-4 animate-spin"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        aria-hidden
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      <span>Lade Zusammenfassung…</span>
                    </div>
                  ) : detailError ? (
                    <span className="text-red-600 dark:text-red-400">{detailError}</span>
                  ) : (
                    <span>
                      {aiSummaryText ?? "Noch keine KI-Zusammenfassung für diesen Artikel."}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          </section>

          {detailLoading ? (
            <div className="p-6 text-center text-sm text-slate-600 dark:text-slate-400">
              Lade Artikeldetails…
            </div>
          ) : detailError ? (
            <div className="p-6 text-center text-sm">
              <p className="mb-3 text-red-600 dark:text-red-400">{detailError}</p>
              <Button label="Erneut versuchen" onClick={() => setReloadToken((t) => t + 1)} />
            </div>
          ) : !articleDetail ? (
            <div className="p-6 text-center text-sm text-slate-600 dark:text-slate-400">
              Keine Artikeldaten vorhanden.
            </div>
          ) : (
            <ArticleReviewSections review={review} />
          )}
        </div>
      </div>
    </div>
  );
}
