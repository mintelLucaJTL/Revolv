import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, Button, Text } from "@jtl-software/platform-ui-react";
import { Sparkles } from "lucide-react";
import ArticleReviewSections from "./ArticleReviewSections";
import { apiFetch } from "../utils/api";
import {
  findAiRecommendation,
  isUsableAiRecommendation,
} from "../utils/aiRecommendation";
import { useToast } from "./Toast";
import { useArticleReview } from "../hooks/useArticleReview";
import type { AnalyzeArticleResponse, ArticleDetailDTO } from "../types/api";

// Placeholder until backend exposes real return comments.
const PLACEHOLDER_CUSTOMER_COMMENTS = [
  "Zurückgeschickt weil Hüftumfang nicht passt.",
  "Farbe wirkt auf dem Foto anders als in echt.",
  "Passt nicht zur angegebenen Größentabelle.",
];

const EMPTY_RESULT_TOAST =
  "Die KI-Analyse lieferte keinen sichtbaren Vorschlag. Bitte erneut versuchen.";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  articleDetail?: ArticleDetailDTO | null;
  isLoading?: boolean;
  error?: string | null;
  onArticleUpdated?: () => void;
  onRefetchDetail?: () => void | Promise<ArticleDetailDTO | null | void>;
}

export default function QualityReviewModal({
  isOpen,
  onClose,
  articleDetail,
  isLoading = false,
  error = null,
  onArticleUpdated,
  onRefetchDetail,
}: Props) {
  const { showToast } = useToast();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  /** Recommendation from the latest analyze POST — drives selection + toast. */
  const [preferredRecommendationId, setPreferredRecommendationId] = useState<
    string | number | null
  >(null);
  /** When set, show feedback toast once this id is present in articleDetail. */
  const [pendingFeedbackId, setPendingFeedbackId] = useState<string | number | null>(null);

  // New article → fall back to newest recommendation ([0]).
  useEffect(() => {
    setPreferredRecommendationId(null);
    setPendingFeedbackId(null);
  }, [articleDetail?.id]);

  const review = useArticleReview(articleDetail, onArticleUpdated, preferredRecommendationId);
  const summaryText = review.aiRec?.aiSummaryText ?? "";
  const isReanalyzeBlocked = articleDetail?.canReanalyze === false;

  // Success/warning only after the matching recommendation is in props (rendered).
  useEffect(() => {
    if (pendingFeedbackId == null) return;

    const matched = findAiRecommendation(articleDetail, pendingFeedbackId);
    if (matched) {
      if (isUsableAiRecommendation(matched)) {
        showToast({ type: "success", message: "KI-Analyse abgeschlossen." });
      } else {
        showToast({ type: "warning", message: EMPTY_RESULT_TOAST });
      }
      setPendingFeedbackId(null);
      return;
    }

    // Refetch may still be flushing into props; warn if the id never appears.
    const timeoutId = window.setTimeout(() => {
      showToast({ type: "warning", message: EMPTY_RESULT_TOAST });
      setPendingFeedbackId(null);
    }, 3000);

    return () => window.clearTimeout(timeoutId);
  }, [pendingFeedbackId, articleDetail, showToast]);

  const handleAnalyze = async () => {
    if (!articleDetail?.id) return;

    setIsAnalyzing(true);
    setPendingFeedbackId(null);
    try {
      const response = await apiFetch(`/api/ai/analyze/${articleDetail.id}`, {
        method: "POST",
      });

      // 409 = Re-Analyse-Sperre (Button ist dafür eigentlich schon deaktiviert, aber z. B. bei
      // zwei offenen Tabs kann der Zustand seit dem letzten Laden noch geändert haben).
      if (response.status === 409) {
        const data = (await response.json().catch(() => null)) as { message?: string } | null;
        showToast({
          type: "warning",
          message: data?.message ?? "Für diesen Artikel ist aktuell keine neue Analyse nötig.",
        });
        onArticleUpdated?.();
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const body = (await response.json()) as AnalyzeArticleResponse;
      const recommendationId = body.recommendationId;

      if (recommendationId == null) {
        showToast({ type: "warning", message: EMPTY_RESULT_TOAST });
        return;
      }

      const refreshed = await onRefetchDetail?.();
      onArticleUpdated?.();

      if (refreshed === null) {
        showToast({ type: "warning", message: EMPTY_RESULT_TOAST });
        return;
      }

      // When refetch returns a DTO, fail fast if the POST id is missing.
      if (refreshed && !findAiRecommendation(refreshed, recommendationId)) {
        showToast({ type: "warning", message: EMPTY_RESULT_TOAST });
        return;
      }

      // Select by POST recommendationId; toast waits until it appears in rendered props.
      setPreferredRecommendationId(recommendationId);
      setPendingFeedbackId(recommendationId);
    } catch (err) {
      console.error("Failed to trigger AI analysis:", err);
      showToast({
        type: "error",
        message: "KI-Analyse konnte nicht gestartet werden. Bitte erneut versuchen.",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (!isOpen) return null;

  const customerCommentsSection =
    articleDetail && !isLoading && !error ? (
      <div className="mt-6">
        <Text weight="bold">Kundenkommentare</Text>

        <div className="mt-3 space-y-2">
          {PLACEHOLDER_CUSTOMER_COMMENTS.map((comment, index) => (
            <div
              key={index}
              className="rounded-2xl rounded-tl-sm border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 px-4 py-3"
            >
              <p className="text-sm italic text-slate-600 dark:text-slate-300">
                &ldquo;{comment}&rdquo;
              </p>
            </div>
          ))}
        </div>
      </div>
    ) : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 backdrop-blur-xs p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="my-8 w-full max-w-6xl bg-white dark:bg-slate-900 rounded-[28px] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
        <Card className="rounded-none border-none shadow-none bg-transparent">
          <CardHeader className="px-6 py-5">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <CardTitle>KI-Prüfung</CardTitle>
                <div className="flex flex-shrink-0 items-center gap-2">
                  <Button
                    label={isAnalyzing ? "Analysiert…" : "KI-Analyse generieren"}
                    variant="highlight"
                    onClick={handleAnalyze}
                    isLoading={isAnalyzing}
                    disabled={isAnalyzing || !articleDetail?.id || isReanalyzeBlocked}
                  />
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Modal schließen"
                    className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      className="h-5 w-5"
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Re-Analyse-Sperre wird nicht hier, sondern direkt beim KI-Vorschlag im
                  Beschreibungs-Tab angezeigt (ArticleReviewSections) - dort, wo sie inhaltlich
                  hingehört, statt zusätzlich oben im Header zu stehen. */}
              {summaryText ? (
                <div className="flex items-start gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-900 dark:bg-blue-950/30 dark:text-blue-200">
                  <Sparkles size={16} className="mt-0.5 flex-shrink-0" aria-hidden="true" />
                  <Text>{summaryText}</Text>
                </div>
              ) : null}
            </div>
          </CardHeader>

          <CardContent className="px-6 pb-6">
            {isLoading ? (
              <div className="p-6 text-center text-sm text-slate-600 dark:text-slate-400">
                Lade Artikeldetails…
              </div>
            ) : error ? (
              <div className="p-6 text-center text-sm text-red-600 dark:text-red-400">{error}</div>
            ) : !articleDetail ? (
              <div className="p-6 text-center text-sm text-slate-600 dark:text-slate-400">
                Keine Artikeldaten vorhanden.
              </div>
            ) : (
              <ArticleReviewSections
                review={review}
                isAnalyzing={isAnalyzing}
                onStartAnalysis={handleAnalyze}
                canReanalyze={articleDetail.canReanalyze}
                reanalyzeBlockedReason={articleDetail.reanalyzeBlockedReason}
              />
            )}

            {customerCommentsSection}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
