import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, Button, Text, Box } from "@jtl-software/platform-ui-react";
import ArticleReviewSections from "./ArticleReviewSections";
import { apiFetch } from "../utils/api";
import { useToast } from "./Toast";
import { useArticleReview } from "../hooks/useArticleReview";
import type { ArticleDetailDTO } from "../types/api";

// Placeholder until backend exposes real return comments.
const PLACEHOLDER_CUSTOMER_COMMENTS = [
  "Zurückgeschickt weil Hüftumfang nicht passt.",
  "Farbe wirkt auf dem Foto anders als in echt.",
  "Passt nicht zur angegebenen Größentabelle.",
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  articleDetail?: ArticleDetailDTO | null;
  isLoading?: boolean;
  error?: string | null;
  onArticleUpdated?: () => void;
  onRefetchDetail?: () => void | Promise<void>;
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

  const review = useArticleReview(articleDetail, onArticleUpdated);
  const summaryText = review.aiRec?.aiSummaryText ?? "";

  const handleAnalyze = async () => {
    if (!articleDetail?.id) return;

    setIsAnalyzing(true);
    try {
      const response = await apiFetch(`/api/ai/analyze/${articleDetail.id}`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      await onRefetchDetail?.();
      onArticleUpdated?.();
      showToast({ type: "success", message: "KI-Analyse abgeschlossen." });
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
                <div>
                  <CardTitle>Qualitätsprüfung</CardTitle>
                  <Text>Prüfe den Artikel und vergleiche aktuellen Text mit KI-Vorschlag.</Text>
                </div>
                <div className="flex flex-shrink-0 items-center gap-2">
                  <Button
                    label={isAnalyzing ? "Analysiert…" : "KI-Analyse generieren"}
                    variant="highlight"
                    onClick={handleAnalyze}
                    isLoading={isAnalyzing}
                    disabled={isAnalyzing || !articleDetail?.id}
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

              {summaryText ? (
                <Box className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  <Text weight="semibold">Zusammenfassung</Text>
                  <Box className="mt-1">
                    <Text>{summaryText}</Text>
                  </Box>
                </Box>
              ) : null}

              <Box className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                <span>
                  {review.reviewProgress.reviewedCount} / {review.reviewProgress.totalCount} bearbeitet
                </span>
              </Box>
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
              <ArticleReviewSections review={review} />
            )}

            {customerCommentsSection}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
