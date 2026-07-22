import React, { useEffect } from "react";

type ArticleType = {
  image?: string;
  name: string;
  number?: string | number;
  returnRate?: string | number;
  // bei Bedarf weitere Felder hinzufügen
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

  if (!open || !article) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
        aria-hidden
      />
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
                Platzhaltertext für die KI‑Zusammenfassung...
              </div>
            </div>
          </section>

          {/* weitere Sektionen: Details, Vorschläge, Aktionen */}
        </div>
      </aside>
    </>
  );
}