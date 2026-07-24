import { useEffect, useState } from "react";
import { Box, Text, Card, CardContent, Button, Badge, Checkbox } from "@jtl-software/platform-ui-react";
import QualityWarningCard from "./QualityWarningCard";
import { apiFetch } from "../utils/api";

type ArticleType = {
  id: number;
  image?: string;
  name: string;
  number?: string | number;
  returnRate?: string | number;
  category?: string;
  size?: string;
};

type ArticleDetailApiDto = {
  id: number;
  aiRecommendations?: Array<{
    aiSummaryText?: string | null;
  }>;
};

// Dummy-Daten, solange die KI-Endpunkte für Qualitätsprüfung/Beschreibung/Empfehlungen
// noch nicht existieren. Rein zu Demo-/Design-Zwecken, nicht persistiert.
const DUMMY_QUALITY_ISSUES = [
  { id: "dq-1", text: "Starkes Einlaufen nach dem Waschen bei 22% der Fälle" },
  { id: "dq-2", text: "Größentabelle stimmt nicht mit realem Schnitt überein" },
];

const DUMMY_DESCRIPTION_PROPOSAL = {
  current: "Lässige Passform mit Stretch-Anteil für optimalen Komfort.",
  proposed:
    "Lässige Passform mit 2% Stretch für optimalen Komfort. Wichtig: Größe entspricht einer engeren Bundweite als bei vergleichbaren Modellen. Schnitt fällt bewusst weiter aus. Empfehlung für schlanke Figuren: eine Nummer kleiner wählen.",
};

const DUMMY_ACTION_RECOMMENDATIONS = [
  { id: "da-1", text: "Schnitt-Erklärung hinzufügen", impact: "−15% Retouren", priority: "Hoch" },
  { id: "da-2", text: "Maßtabelle korrigieren", impact: "−10% Retouren", priority: "Hoch" },
  { id: "da-3", text: "Einlaufhinweis ergänzen", impact: "−8% Retouren", priority: "Hoch" },
  { id: "da-4", text: "Pflegehinweise aktualisieren", impact: "−5% Retouren", priority: "Mittel" },
];

function getReturnRateBadgeVariant(returnRate?: string | number): "danger" | "warning" | "success" | "secondary" {
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

function getPriorityBadgeVariant(priority: string): "danger" | "warning" | "secondary" {
  const normalized = priority.toLowerCase();
  if (normalized.includes("hoch")) return "danger";
  if (normalized.includes("mittel")) return "warning";
  return "secondary";
}

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

  // Lokaler (nicht persistierter) UI-Zustand für die Dummy-Sektionen.
  const [checkedIssueIds, setCheckedIssueIds] = useState<Set<string>>(new Set());
  const [checkedActionIds, setCheckedActionIds] = useState<Set<string>>(new Set());
  const [proposalDecision, setProposalDecision] = useState<"accepted" | "rejected" | null>(null);

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

    // Dummy-Zustand pro Artikel zurücksetzen, wenn ein neuer Artikel geöffnet wird.
    setCheckedIssueIds(new Set());
    setCheckedActionIds(new Set());
    setProposalDecision(null);

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

  const toggleIssue = (id: string) => {
    setCheckedIssueIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAction = (id: string) => {
    setCheckedActionIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const reviewedIssueCount = checkedIssueIds.size;
  const completedActionCount = checkedActionIds.size;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} aria-hidden />
      <aside
        role="dialog"
        aria-modal="true"
        className="fixed right-0 top-0 h-full w-full md:w-1/3 bg-white dark:bg-slate-900 z-50 shadow-lg transform transition-transform overflow-hidden flex flex-col"
      >
        <Box className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 p-4 flex items-start justify-between z-10">
          <Box className="flex items-center gap-3 min-w-0">
            <img
              src={article.image ?? "/placeholder.png"}
              alt={article.name ?? "Artikel"}
              className="w-14 h-14 object-cover rounded-lg flex-shrink-0 bg-slate-100 dark:bg-slate-800"
            />
            <Box className="min-w-0">
              <Box className="flex items-center gap-1.5 dark:text-slate-500">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500 flex-shrink-0" />
                <Text type="xs" color="muted">
                  ART-{article.number ?? "—"}
                </Text>
              </Box>
              <Box className="dark:text-slate-100 truncate">
                <Text weight="bold">{article.name}</Text>
              </Box>
              <Box className="mt-1 flex items-center gap-2 flex-wrap">
                <Badge
                  label={getReturnRateBadgeLabel(article.returnRate)}
                  variant={getReturnRateBadgeVariant(article.returnRate)}
                />
                {(article.category || article.size) && (
                  <Text type="xs" color="muted">
                    {[article.category, article.size].filter(Boolean).join(" · ")}
                  </Text>
                )}
              </Box>
            </Box>
          </Box>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Schließen"
            onClick={onClose}
            label="✕"
          />
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
                    (aiSummaryText ??
                      "Höchste Retourenquote im Sortiment. Die Beschreibung weicht spürbar vom tatsächlichen Produkt ab, was zu vermehrten Rücksendungen führt. Sofortiger Handlungsbedarf.")
                  )}
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Qualitätsprüfung */}
          <section className="mb-6">
            <Box className="flex items-center justify-between mb-3">
              <Box className="flex items-center gap-2 dark:text-slate-100">
                <span aria-hidden>🛡️</span>
                <Text weight="bold">Qualitätsprüfung</Text>
              </Box>
              <Text type="xs" color="muted">
                {reviewedIssueCount} / {DUMMY_QUALITY_ISSUES.length} bearbeitet
              </Text>
            </Box>

            <div className="space-y-3">
              {DUMMY_QUALITY_ISSUES.map((issue) => (
                <QualityWarningCard
                  key={issue.id}
                  title="Qualitätswarnung"
                  description={issue.text}
                  isChecked={checkedIssueIds.has(issue.id)}
                  onToggleChecked={() => toggleIssue(issue.id)}
                  onCreateTicket={() => {}}
                />
              ))}
            </div>
          </section>

          {/* Produktbeschreibung */}
          <section className="mb-6">
            <Box className="flex items-center gap-2 dark:text-slate-100 mb-3">
              <span aria-hidden>📄</span>
              <Text weight="bold">Produktbeschreibung</Text>
            </Box>

            <Card className="p-0 rounded-xl border border-slate-200 dark:border-slate-700 shadow-none overflow-hidden">
              <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 dark:divide-slate-700">
                <CardContent className="p-3">
                  <Text type="xs" weight="semibold" color="muted">
                    AKTUELL
                  </Text>
                  <Box className="mt-1.5 dark:text-slate-300">
                    <Text>{DUMMY_DESCRIPTION_PROPOSAL.current}</Text>
                  </Box>
                </CardContent>
                <CardContent className="p-3 bg-blue-50/60 dark:bg-blue-950/20">
                  <Box className="flex items-center gap-1 text-blue-600 dark:text-blue-300">
                    <span aria-hidden>✨</span>
                    <Text type="xs" weight="semibold">
                      KI-VORSCHLAG
                    </Text>
                  </Box>
                  <Box className="mt-1.5 dark:text-slate-300">
                    <Text>{DUMMY_DESCRIPTION_PROPOSAL.proposed}</Text>
                  </Box>
                </CardContent>
              </div>

              <div className="flex border-t border-slate-200 dark:border-slate-700">
                <div className="flex-1">
                  <Button
                    fullWidth
                    variant={proposalDecision === "accepted" ? "highlight" : "ghost"}
                    onClick={() => setProposalDecision("accepted")}
                    label="✓ Übernehmen"
                  />
                </div>
                <div className="flex-1 border-l border-slate-200 dark:border-slate-700">
                  <Button fullWidth variant="ghost" label="✎ Bearbeiten" />
                </div>
                <div className="flex-1 border-l border-slate-200 dark:border-slate-700">
                  <Button
                    fullWidth
                    variant={proposalDecision === "rejected" ? "secondary" : "ghost"}
                    onClick={() => setProposalDecision("rejected")}
                    label="✕ Ablehnen"
                  />
                </div>
              </div>
            </Card>
          </section>

          {/* Weitere Empfehlungen */}
          <section className="mb-2">
            <Box className="flex items-center justify-between mb-3">
              <Box className="flex items-center gap-2 dark:text-slate-100">
                <span aria-hidden>✨</span>
                <Text weight="bold">Weitere Empfehlungen</Text>
              </Box>
              <Text type="xs" color="muted">
                {completedActionCount} / {DUMMY_ACTION_RECOMMENDATIONS.length} erledigt
              </Text>
            </Box>

            <div className="space-y-2">
              {DUMMY_ACTION_RECOMMENDATIONS.map((rec) => {
                const isChecked = checkedActionIds.has(rec.id);
                return (
                  <Card
                    key={rec.id}
                    className="p-0 rounded-xl border border-slate-200 dark:border-slate-700 shadow-none hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
                  >
                    <CardContent className="flex items-center gap-3 px-3 py-2.5">
                      <Checkbox value={isChecked} onChange={() => toggleAction(rec.id)} />
                      <span
                        className={`flex-1 text-sm ${
                          isChecked
                            ? "text-slate-400 dark:text-slate-500 line-through"
                            : "text-slate-900 dark:text-slate-100"
                        }`}
                      >
                        {rec.text}
                      </span>
                      <Badge label={rec.impact} variant="success" />
                      <Badge label={rec.priority} variant={getPriorityBadgeVariant(rec.priority)} />
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        </div>
      </aside>
    </>
  );
}
