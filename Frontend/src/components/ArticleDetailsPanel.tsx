import React, { useEffect, useState } from "react";
import { apiFetch } from "../utils/api";

type ArticleType = {
  id: number;
  image?: string;
  name: string;
  number?: string | number;
  returnRate?: string | number;
};

type ArticleDetailApiDto = {
  id: number;
  aiRecommendations?: Array<{
    aiSummaryText?: string | null;
  }>;
};

export default function ArticleDetailsPanel({
  article,
  open,
  onClose,
}: {
  article: ArticleType | null;
  open: boolean;
  onClose: () => void;
}) {
  const [aiSummaryText, setAiSummaryText] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

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
      setAiSummaryText(null);
      setDetailError(null);
      setDetailLoading(false);
      return;
    }

    const articleId = article.id;
    let cancelled = false;

    const fetchDetails = async () => {
      setDetailLoading(true);
      setDetailError(null);
      setAiSummaryText(null);

      try {
        const response = await apiFetch(`/api/articles/${encodeURIComponent(String(articleId))}`);

        if (!response.ok) {
          throw new Error(`Artikeldetails konnten nicht geladen werden (${response.status})`);
        }

        const data = (await response.json()) as ArticleDetailApiDto;
        const summary =
          data.aiRecommendations?.find((r) => r.aiSummaryText)?.aiSummaryText ??
          data.aiRecommendations?.[0]?.aiSummaryText ??
          null;

        if (!cancelled) {
          setAiSummaryText(summary);
        }
      } catch (err) {
        console.error("Fetch article details error:", err);
        if (!cancelled) {
          setDetailError(
            err instanceof TypeError
              ? "Backend nicht erreichbar."
              : err instanceof Error
                ? err.message
                : "Die KI-Zusammenfassung konnte nicht geladen werden.",
          );
          setAiSummaryText(null);
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
  }, [open, article?.id]);

  if (!open || !article) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} aria-hidden />
      <aside
        role="dialog"
        aria-modal="true"
        className="fixed right-0 top-0 h-full w-full md:w-1/3 bg-white z-50 shadow-lg transform transition-transform"
      >
        <header className="sticky top-0 bg-white p-4 border-b flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <img
              src={article.image ?? "/placeholder.png"}
              alt={article.name ?? "Artikel"}
              className="w-12 h-12 object-cover rounded"
            />
            <div>
              <div className="font-bold">{article.name}</div>
              <div className="text-sm text-slate-500">
                Nr. {article.number ?? "—"} · Retouren: {article.returnRate ?? "—"}
              </div>
            </div>
          </div>
          <button aria-label="Schließen" onClick={onClose} className="p-2">
            ✕
          </button>
        </header>

        <div className="p-4 overflow-auto h-[calc(100%-64px)]">
          <section className="mb-4">
            <div className="bg-blue-50 border-l-4 border-blue-300 p-3">
              <div className="font-semibold">KI‑Zusammenfassung</div>
              <div className="text-sm text-slate-600 mt-2">
                {detailLoading ? (
                  <div
                    className="flex items-center gap-2 py-2"
                    role="status"
                    aria-live="polite"
                    aria-label="Lade KI-Zusammenfassung"
                  >
                    <svg
                      className="h-5 w-5 animate-spin text-blue-500"
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
                  <span className="text-red-600">{detailError}</span>
                ) : aiSummaryText ? (
                  aiSummaryText
                ) : (
                  "Keine KI-Zusammenfassung vorhanden."
                )}
              </div>
            </div>
          </section>

          {/* weitere Sektionen: Details, Vorschläge, Aktionen */}
        </div>
      </aside>
    </>
  );
}
