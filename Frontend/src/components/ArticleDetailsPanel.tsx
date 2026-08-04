import { useEffect, useState } from "react";
import {
  Box,
  Text,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Checkbox,
} from "@jtl-software/platform-ui-react";
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

// Demo UI placeholders (not persisted) until live AI detail sections are wired here.
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

  const [checkedIssueIds, setCheckedIssueIds] = useState<Set<string>>(new Set());
  const [checkedActionIds, setCheckedActionIds] = useState<Set<string>>(new Set());
  const [proposalDecision, setProposalDecision] = useState<"accepted" | "rejected" | null>(null);
  const [isEditingProposal, setIsEditingProposal] = useState(false);
  const [draftProposedText, setDraftProposedText] = useState(DUMMY_DESCRIPTION_PROPOSAL.proposed);
  const [proposedText, setProposedText] = useState(DUMMY_DESCRIPTION_PROPOSAL.proposed);

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

    setCheckedIssueIds(new Set());
    setCheckedActionIds(new Set());
    setProposalDecision(null);
    setIsEditingProposal(false);
    setProposedText(DUMMY_DESCRIPTION_PROPOSAL.proposed);
    setDraftProposedText(DUMMY_DESCRIPTION_PROPOSAL.proposed);

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
  const totalReviewItems =
    DUMMY_QUALITY_ISSUES.length + DUMMY_ACTION_RECOMMENDATIONS.length + 1;
  const reviewedCount =
    reviewedIssueCount + completedActionCount + (proposalDecision !== null ? 1 : 0);

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
        <Card className="rounded-none border-none shadow-none bg-transparent">
          <CardHeader className="px-6 py-5">
            <div className="flex flex-col gap-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <img
                    src={article.image ?? "/placeholder.png"}
                    alt={article.name ?? "Artikel"}
                    className="w-16 h-16 object-cover rounded-xl flex-shrink-0 bg-slate-100 dark:bg-slate-800"
                  />
                  <div className="min-w-0">
                    <CardTitle className="truncate">{article.name}</CardTitle>
                    <div className="mt-1 flex items-center gap-2 flex-wrap">
                      <Text type="xs" color="muted">
                        ART-{article.number ?? "—"}
                      </Text>
                      <Badge
                        label={getReturnRateBadgeLabel(article.returnRate)}
                        variant={getReturnRateBadgeVariant(article.returnRate)}
                      />
                      {(article.category || article.size) && (
                        <Text type="xs" color="muted">
                          {[article.category, article.size].filter(Boolean).join(" · ")}
                        </Text>
                      )}
                    </div>
                    <Box className="mt-1">
                      <Text type="xs" color="muted">
                        Prüfe den Artikel und vergleiche aktuellen Text mit KI-Vorschlag.
                      </Text>
                    </Box>
                  </div>
                </div>

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

              <Card className="bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 rounded-xl p-0 shadow-none">
                <CardContent className="p-3 flex items-start gap-2 text-blue-900 dark:text-blue-200">
                  <span className="mt-0.5 flex-shrink-0" aria-hidden>
                    ✨
                  </span>
                  <div className="text-sm min-w-0">
                    <Text weight="semibold">Zusammenfassung</Text>
                    <Box className="mt-1">
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
                    </Box>
                  </div>
                </CardContent>
              </Card>

              <Box className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                <span>
                  {reviewedCount} / {totalReviewItems} bearbeitet
                </span>
              </Box>
            </div>
          </CardHeader>

          <CardContent className="px-6 pb-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Text weight="bold">Qualitätsprüfung</Text>
                  <Text type="xs" color="muted">
                    {reviewedIssueCount} / {DUMMY_QUALITY_ISSUES.length} bearbeitet
                  </Text>
                </div>

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

              <div className="space-y-4">
                <Text weight="bold">Produktbeschreibung</Text>

                <Card className="border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                  <CardContent className="p-4">
                    <Text weight="bold">Aktuell</Text>
                    <Box className="mt-2 mb-4">
                      <Text>{DUMMY_DESCRIPTION_PROPOSAL.current}</Text>
                    </Box>

                    <Text weight="bold">KI-VORSCHLAG</Text>
                    <Box className="mt-2">
                      {isEditingProposal ? (
                        <textarea
                          value={draftProposedText}
                          onChange={(e) => setDraftProposedText(e.target.value)}
                          rows={5}
                          className="w-full rounded-lg border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-950 p-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      ) : (
                        <Text>{proposedText}</Text>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </div>
            </div>

            <div className="mt-6">
              <div className="flex items-center justify-between">
                <Text weight="bold">Weitere Empfehlungen</Text>
                <Text type="xs" color="muted">
                  {completedActionCount} / {DUMMY_ACTION_RECOMMENDATIONS.length} erledigt
                </Text>
              </div>

              <div className="mt-3 space-y-2">
                {DUMMY_ACTION_RECOMMENDATIONS.map((rec) => {
                  const isChecked = checkedActionIds.has(rec.id);
                  return (
                    <label
                      key={rec.id}
                      className="flex items-center gap-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 shadow-sm cursor-pointer transition-colors hover:border-blue-400 dark:hover:border-blue-600"
                    >
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
                      <div className="flex flex-shrink-0 items-center gap-2">
                        <Badge label={rec.impact} variant="success" />
                        <Badge
                          label={rec.priority}
                          variant={getPriorityBadgeVariant(rec.priority)}
                        />
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="mt-6 flex flex-col items-end gap-2">
              {proposalDecision !== null && !isEditingProposal ? (
                <div className="flex items-center gap-3">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      proposalDecision === "accepted"
                        ? "bg-green-50 text-green-700 dark:bg-green-950/60 dark:text-green-300"
                        : "bg-red-50 text-red-600 dark:bg-red-950/60 dark:text-red-300"
                    }`}
                  >
                    {proposalDecision === "accepted"
                      ? "Vorschlag übernommen"
                      : "Vorschlag abgelehnt"}
                  </span>
                  <Button
                    label="Rückgängig"
                    variant="ghost"
                    onClick={() => setProposalDecision(null)}
                  />
                </div>
              ) : isEditingProposal ? (
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <Button
                    label="Abbrechen"
                    variant="ghost"
                    onClick={() => {
                      setIsEditingProposal(false);
                      setDraftProposedText(proposedText);
                    }}
                  />
                  <Button
                    label="Speichern"
                    variant="highlight"
                    onClick={() => {
                      setProposedText(draftProposedText);
                      setIsEditingProposal(false);
                    }}
                  />
                </div>
              ) : (
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <Button
                    label="Ablehnen"
                    variant="ghost"
                    onClick={() => setProposalDecision("rejected")}
                  />
                  <Button
                    label="Bearbeiten"
                    variant="secondary"
                    onClick={() => {
                      setDraftProposedText(proposedText);
                      setIsEditingProposal(true);
                    }}
                  />
                  <Button
                    label="Übernehmen"
                    variant="highlight"
                    onClick={() => setProposalDecision("accepted")}
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
