import { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Text,
  Box,
} from "@jtl-software/platform-ui-react";
import QualityWarningCard from "./QualityWarningCard";
import {
  calculateReviewProgress,
  isDescriptionProposalReviewed as isDescriptionProposalStatusReviewed,
  isQualityIssueResolved,
  QUALITY_ISSUE_STATUS_PENDING,
  QUALITY_ISSUE_STATUS_RESOLVED,
} from "../utils/qualityReviewProgress";

// Base URL of the backend API, matching the convention used across the rest of the frontend.
const API_BASE_URL = "http://localhost:5215";

// DTO from the backend with the required fields (matches QualityIssueDTO)
interface QualityIssue {
  id: string | number;
  issueText?: string;
  status?: string;
}

export interface DescriptionProposal {
  id: string | number;
  currentText?: string;
  proposedText?: string;
  status?: string;
}

// Actionable recommendation, e.g. "Add size hint" with an impact/priority badge
export interface ActionRecommendation {
  id: string | number;
  actionText?: string;
  impactBadge?: string;
  priority?: string;
  isCompleted?: boolean;
}

export interface AiRecommendation {
  id: string | number;
  returnRate?: number;
  aiSummaryText?: string;
  isFullyResolved?: boolean;
  qualityIssues?: QualityIssue[];
  descriptionProposals?: DescriptionProposal[];
  actionRecommendations?: ActionRecommendation[];
}

// Placeholder customer quotes shown until the backend exposes real return comments
const PLACEHOLDER_CUSTOMER_COMMENTS = [
  "Zurückgeschickt weil Hüftumfang nicht passt.",
  "Farbe wirkt auf dem Foto anders als in echt.",
  "Passt nicht zur angegebenen Größentabelle.",
];

// Statuses that mark a description proposal as reviewed (kept in sync with AiRecommendationController).
const PROPOSAL_STATUS_ACCEPTED = "Akzeptiert";
const PROPOSAL_STATUS_REJECTED = "Abgelehnt";
// Default status of a freshly seeded/unreviewed proposal (matches DescriptionProposal.Status default).
const PROPOSAL_STATUS_PENDING = "Ausstehend";

function getPriorityBadgeClasses(priority?: string): string {
  const normalized = priority?.toLowerCase() ?? "";
  if (normalized.includes("hoch") || normalized.includes("high")) {
    return "bg-red-50 text-red-600 border border-red-100";
  }
  if (normalized.includes("mittel") || normalized.includes("medium")) {
    return "bg-amber-50 text-amber-600 border border-amber-100";
  }
  return "bg-slate-100 text-slate-500 border border-slate-200";
}

export interface ArticleDetailDTO {
  id: string;
  articleNumber?: string;
  name?: string;
  category?: string;
  size?: string;
  color?: string;
  aiRecommendations?: AiRecommendation[];
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  articleDetail?: ArticleDetailDTO | null;
  isLoading?: boolean;
  error?: string | null;
  // Called after a change (checkbox, accept/reject, edit) was successfully persisted to the
  // backend, so the parent view can refresh e.g. the "KI-Status" table column.
  onArticleUpdated?: () => void;
}

export default function QualityReviewModal({
  isOpen,
  onClose,
  articleDetail,
  isLoading = false,
  error = null,
  onArticleUpdated,
}: Props) {
  const aiRec = articleDetail?.aiRecommendations?.[0];
  const issues = aiRec?.qualityIssues ?? [];
  const actionRecommendations = aiRec?.actionRecommendations ?? [];
  const descriptionProposal = aiRec?.descriptionProposals?.[0];
  const descriptionProposalId = descriptionProposal?.id;

  // Local checkbox state so the UI can react instantly; every toggle is also persisted to the backend
  // via PATCH /api/ai/action/{id}/complete so the state is shared across all users of the dashboard.
  const [completedActionIds, setCompletedActionIds] = useState<Set<string | number>>(new Set());
  const [actionSaveError, setActionSaveError] = useState<string | null>(null);

  // Same pattern as the action recommendations above, but for the quality issue "Überprüft"
  // toggle, persisted via PATCH /api/ai/quality/{id}/status so it is shared across all users.
  const [completedQualityIssueIds, setCompletedQualityIssueIds] = useState<Set<string | number>>(
    new Set(),
  );
  const [qualityIssueSaveError, setQualityIssueSaveError] = useState<string | null>(null);

  // Local state for the description proposal review (accept / reject / edit).
  const [proposalStatus, setProposalStatus] = useState<string>("");
  const [proposedTextValue, setProposedTextValue] = useState("");
  const [isEditingProposal, setIsEditingProposal] = useState(false);
  const [draftProposedText, setDraftProposedText] = useState("");
  const [isSavingProposalText, setIsSavingProposalText] = useState(false);
  const [savingProposalAction, setSavingProposalAction] = useState<
    "accept" | "reject" | "undo" | null
  >(null);
  const [proposalActionError, setProposalActionError] = useState<string | null>(null);

  useEffect(() => {
    const initiallyCompleted = actionRecommendations
      .filter((rec) => rec.isCompleted)
      .map((rec) => rec.id);
    setCompletedActionIds(new Set(initiallyCompleted));
    setActionSaveError(null);

    const initiallyResolvedIssues = issues
      .filter((iss) => isQualityIssueResolved(iss.status))
      .map((iss) => iss.id);
    setCompletedQualityIssueIds(new Set(initiallyResolvedIssues));
    setQualityIssueSaveError(null);

    setProposalStatus(descriptionProposal?.status ?? "");
    setProposedTextValue(descriptionProposal?.proposedText?.trim() ?? "");
    setIsEditingProposal(false);
    setProposalActionError(null);
    // Only re-sync when a different article/recommendation is loaded into the modal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiRec?.id]);

  const toggleActionRecommendation = async (rec: ActionRecommendation) => {
    const nextIsCompleted = !completedActionIds.has(rec.id);

    // Optimistic update so the checkbox reacts immediately.
    setCompletedActionIds((prev) => {
      const next = new Set(prev);
      if (nextIsCompleted) {
        next.add(rec.id);
      } else {
        next.delete(rec.id);
      }
      return next;
    });
    setActionSaveError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/ai/action/${rec.id}/complete`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isCompleted: nextIsCompleted }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      onArticleUpdated?.();
    } catch (err) {
      console.error("Failed to save action recommendation completion:", err);

      // Roll back the optimistic update on failure.
      setCompletedActionIds((prev) => {
        const next = new Set(prev);
        if (nextIsCompleted) {
          next.delete(rec.id);
        } else {
          next.add(rec.id);
        }
        return next;
      });
      setActionSaveError("Änderung konnte nicht gespeichert werden. Bitte erneut versuchen.");
    }
  };

  const toggleQualityIssue = async (issue: QualityIssue) => {
    const nextIsResolved = !completedQualityIssueIds.has(issue.id);

    // Optimistic update so the button reacts immediately.
    setCompletedQualityIssueIds((prev) => {
      const next = new Set(prev);
      if (nextIsResolved) {
        next.add(issue.id);
      } else {
        next.delete(issue.id);
      }
      return next;
    });
    setQualityIssueSaveError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/ai/quality/${issue.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: nextIsResolved ? QUALITY_ISSUE_STATUS_RESOLVED : QUALITY_ISSUE_STATUS_PENDING,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      onArticleUpdated?.();
    } catch (err) {
      console.error("Failed to save quality issue status:", err);

      // Roll back the optimistic update on failure.
      setCompletedQualityIssueIds((prev) => {
        const next = new Set(prev);
        if (nextIsResolved) {
          next.delete(issue.id);
        } else {
          next.add(issue.id);
        }
        return next;
      });
      setQualityIssueSaveError("Änderung konnte nicht gespeichert werden. Bitte erneut versuchen.");
    }
  };

  const startEditingProposal = () => {
    setDraftProposedText(proposedTextValue);
    setIsEditingProposal(true);
    setProposalActionError(null);
  };

  const cancelEditingProposal = () => {
    setIsEditingProposal(false);
    setProposalActionError(null);
  };

  const saveProposedText = async () => {
    if (descriptionProposalId === undefined) return;

    setIsSavingProposalText(true);
    setProposalActionError(null);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/ai/description/${descriptionProposalId}/text`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ proposedText: draftProposedText }),
        },
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      setProposedTextValue(draftProposedText);
      setIsEditingProposal(false);
      onArticleUpdated?.();
    } catch (err) {
      console.error("Failed to save edited proposal text:", err);
      setProposalActionError("Der bearbeitete Vorschlag konnte nicht gespeichert werden.");
    } finally {
      setIsSavingProposalText(false);
    }
  };

  const updateProposalStatus = async (status: string, action: "accept" | "reject" | "undo") => {
    if (descriptionProposalId === undefined) return;

    setSavingProposalAction(action);
    setProposalActionError(null);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/ai/description/${descriptionProposalId}/status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        },
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      setProposalStatus(status);
      onArticleUpdated?.();
    } catch (err) {
      console.error("Failed to update description proposal status:", err);
      setProposalActionError("Die Aktion konnte nicht gespeichert werden. Bitte erneut versuchen.");
    } finally {
      setSavingProposalAction(null);
    }
  };

  const hasIssues = issues.length > 0;

  const currentText = descriptionProposal?.currentText?.trim() ?? "";
  const summaryText = aiRec?.aiSummaryText ?? "";
  const mainContent = isLoading ? (
    <div className="p-6 text-center text-sm text-slate-600">Lade Artikeldetails…</div>
  ) : error ? (
    <div className="p-6 text-center text-sm text-red-600">{error}</div>
  ) : !articleDetail ? (
    <div className="p-6 text-center text-sm text-slate-600">Keine Artikeldaten vorhanden.</div>
  ) : (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <Text weight="bold">Qualitätsprüfung</Text>

        {hasIssues ? (
          issues.map((iss) => (
            <QualityWarningCard
              key={iss.id}
              title="Qualitätswarnung"
              description={iss.issueText ?? "Keine Beschreibung verfügbar."}
              isChecked={completedQualityIssueIds.has(iss.id)}
              onToggleChecked={() => toggleQualityIssue(iss)}
              onCreateTicket={() => {}}
            />
          ))
        ) : (
          <Card className="border border-gray-100 bg-slate-50">
            <CardContent className="p-4">
              <Text>Keine Qualitätswarnungen</Text>
            </CardContent>
          </Card>
        )}

        {qualityIssueSaveError ? (
          <p className="text-xs text-red-600">{qualityIssueSaveError}</p>
        ) : null}
      </div>

      <div className="space-y-4">
        <Text weight="bold">Produktbeschreibung</Text>

        <Card className="border border-gray-100 bg-slate-50">
          <CardContent className="p-4">
            <Text weight="bold">Aktuell</Text>
            <Box className="mt-2 mb-4">
              {currentText ? (
                <Text>{currentText}</Text>
              ) : (
                <Text color="muted">Keine Beschreibung vorhanden</Text>
              )}
            </Box>

            <Text weight="bold">KI-VORSCHLAG</Text>
            <Box className="mt-2">
              {isEditingProposal ? (
                <textarea
                  value={draftProposedText}
                  onChange={(e) => setDraftProposedText(e.target.value)}
                  rows={5}
                  className="w-full rounded-lg border border-blue-200 p-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              ) : proposedTextValue ? (
                <Text>{proposedTextValue}</Text>
              ) : (
                <Text color="muted">Keine Vorschläge</Text>
              )}
            </Box>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const completedActionCount = actionRecommendations.filter((rec) =>
    completedActionIds.has(rec.id),
  ).length;

  const actionRecommendationsSection =
    articleDetail && !isLoading && !error && actionRecommendations.length > 0 ? (
      <div className="mt-6">
        <div className="flex items-center justify-between">
          <Text weight="bold">Weitere Empfehlungen</Text>
          <Text type="xs" color="muted">
            {completedActionCount} / {actionRecommendations.length} erledigt
          </Text>
        </div>

        <div className="mt-3 space-y-2">
          {actionRecommendations.map((rec) => {
            const isChecked = completedActionIds.has(rec.id);
            return (
              <label
                key={rec.id}
                className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-sm cursor-pointer transition-colors hover:border-blue-200"
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleActionRecommendation(rec)}
                  className="h-4 w-4 flex-shrink-0 accent-blue-600"
                />

                <span
                  className={`flex-1 text-sm ${
                    isChecked ? "text-slate-400 line-through" : "text-slate-900"
                  }`}
                >
                  {rec.actionText ?? "Empfehlung"}
                </span>

                <div className="flex flex-shrink-0 items-center gap-2">
                  {rec.impactBadge ? (
                    <span className="rounded-full border border-green-100 bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 transition-colors hover:bg-green-100">
                      {rec.impactBadge}
                    </span>
                  ) : null}
                  {rec.priority ? (
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold transition-colors ${getPriorityBadgeClasses(
                        rec.priority,
                      )}`}
                    >
                      {rec.priority}
                    </span>
                  ) : null}
                </div>
              </label>
            );
          })}
        </div>

        {actionSaveError ? <p className="mt-2 text-xs text-red-600">{actionSaveError}</p> : null}
      </div>
    ) : null;

  const customerCommentsSection =
    articleDetail && !isLoading && !error ? (
      <div className="mt-6">
        <Text weight="bold">Kundenkommentare</Text>

        <div className="mt-3 space-y-2">
          {PLACEHOLDER_CUSTOMER_COMMENTS.map((comment, index) => (
            <div
              key={index}
              className="rounded-2xl rounded-tl-sm border border-gray-100 bg-slate-50 px-4 py-3"
            >
              <p className="text-sm italic text-slate-600">&ldquo;{comment}&rdquo;</p>
            </div>
          ))}
        </div>
      </div>
    ) : null;

  const isProposalReviewed = isDescriptionProposalStatusReviewed(proposalStatus);

  // Derived (not hard-coded) "n / total bearbeitet" summary counter for the current article.
  // Recomputed from the actual quality issues, action recommendations and description proposal
  // state, so it always matches what is really reviewed instead of a static parent-supplied value.
  const reviewProgress = useMemo(
    () =>
      calculateReviewProgress({
        qualityIssueCount: issues.length,
        resolvedQualityIssueCount: issues.filter((iss) => completedQualityIssueIds.has(iss.id))
          .length,
        actionRecommendationCount: actionRecommendations.length,
        completedActionRecommendationCount: completedActionCount,
        hasDescriptionProposal: descriptionProposalId !== undefined,
        isDescriptionProposalReviewed: isProposalReviewed,
      }),
    [
      issues,
      completedQualityIssueIds,
      actionRecommendations.length,
      completedActionCount,
      descriptionProposalId,
      isProposalReviewed,
    ],
  );

  if (!isOpen) return null;

  const proposalActionsFooter =
    articleDetail && !isLoading && !error ? (
      <div className="mt-6 flex flex-col items-end gap-2">
        {proposalActionError ? <p className="text-xs text-red-600">{proposalActionError}</p> : null}

        {descriptionProposalId === undefined ? (
          // No AI description proposal exists for this article, so there is nothing to accept/reject/edit.
          <p className="text-xs text-slate-400">
            Kein KI-Textvorschlag für diesen Artikel vorhanden – nichts zu prüfen.
          </p>
        ) : isProposalReviewed ? (
          <div className="flex items-center gap-3">
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                proposalStatus === PROPOSAL_STATUS_ACCEPTED
                  ? "bg-green-50 text-green-700"
                  : "bg-red-50 text-red-600"
              }`}
            >
              {proposalStatus === PROPOSAL_STATUS_ACCEPTED
                ? "Vorschlag übernommen"
                : "Vorschlag abgelehnt"}
            </span>
            <Button
              label={savingProposalAction === "undo" ? "Setzt zurück…" : "Rückgängig"}
              variant="ghost"
              onClick={() => updateProposalStatus(PROPOSAL_STATUS_PENDING, "undo")}
              disabled={savingProposalAction !== null}
            />
          </div>
        ) : isEditingProposal ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button
              label="Abbrechen"
              variant="ghost"
              onClick={cancelEditingProposal}
              disabled={isSavingProposalText}
            />
            <Button
              label={isSavingProposalText ? "Speichert…" : "Speichern"}
              variant="highlight"
              onClick={saveProposedText}
              disabled={isSavingProposalText}
            />
          </div>
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button
              label={savingProposalAction === "reject" ? "Speichert…" : "Ablehnen"}
              variant="ghost"
              onClick={() => updateProposalStatus(PROPOSAL_STATUS_REJECTED, "reject")}
              disabled={savingProposalAction !== null}
            />
            <Button
              label="Bearbeiten"
              variant="secondary"
              onClick={startEditingProposal}
              disabled={savingProposalAction !== null}
            />
            <Button
              label={savingProposalAction === "accept" ? "Speichert…" : "Übernehmen"}
              variant="highlight"
              onClick={() => updateProposalStatus(PROPOSAL_STATUS_ACCEPTED, "accept")}
              disabled={savingProposalAction !== null}
            />
          </div>
        )}
      </div>
    ) : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/30 p-4"
      onClick={(e) => {
        // Close only when the backdrop itself (not a modal child) was clicked.
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="my-8 w-full max-w-6xl bg-white rounded-[28px] shadow-2xl overflow-hidden">
        <Card className="rounded-none border-none shadow-none">
          <CardHeader className="px-6 py-5">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Qualitätsprüfung</CardTitle>
                  <Text>Prüfe den Artikel und vergleiche aktuellen Text mit KI-Vorschlag.</Text>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Modal schließen"
                  className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
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

              {summaryText ? (
                <Box className="mt-2 text-sm text-slate-600">
                  <Text weight="semibold">Zusammenfassung</Text>
                  <Box className="mt-1">
                    <Text>{summaryText}</Text>
                  </Box>
                </Box>
              ) : null}

              <Box className="flex items-center gap-2 text-sm text-slate-500">
                <span>
                  {reviewProgress.reviewedCount} / {reviewProgress.totalCount} bearbeitet
                </span>
              </Box>
            </div>
          </CardHeader>

          <CardContent className="px-6 pb-6">
            {mainContent}

            {actionRecommendationsSection}

            {customerCommentsSection}

            {proposalActionsFooter}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
