import { useEffect, useState } from "react";
import { apiFetch } from "../utils/api";
import {
  calculateReviewProgress,
  isDescriptionProposalReviewed,
  isQualityIssueResolved,
  QUALITY_ISSUE_STATUS_PENDING,
  QUALITY_ISSUE_STATUS_RESOLVED,
} from "../utils/qualityReviewProgress";
import type { ActionRecommendation, ArticleDetailDTO, QualityIssue } from "../types/api";

const PROPOSAL_STATUS_ACCEPTED = "Akzeptiert";
const PROPOSAL_STATUS_REJECTED = "Abgelehnt";
const PROPOSAL_STATUS_PENDING = "Ausstehend";

export {
  PROPOSAL_STATUS_ACCEPTED,
  PROPOSAL_STATUS_REJECTED,
  PROPOSAL_STATUS_PENDING,
};

/**
 * Shared review state/logic for one article's active AI recommendation
 * (aiRecommendations[0] — the backend returns newest first). Used by both
 * QualityReviewModal and ArticleDetailsPanel so quality-issue/action/proposal
 * persistence isn't implemented twice.
 */
export function useArticleReview(
  articleDetail: ArticleDetailDTO | null | undefined,
  onArticleUpdated?: () => void,
) {
  const aiRec = articleDetail?.aiRecommendations?.[0];
  const issues = aiRec?.qualityIssues ?? [];
  const actionRecommendations = aiRec?.actionRecommendations ?? [];
  const descriptionProposals = aiRec?.descriptionProposals ?? [];
  const descriptionProposal = descriptionProposals[0];
  const descriptionProposalId = descriptionProposal?.id;

  const [completedActionIds, setCompletedActionIds] = useState<Set<string | number>>(new Set());
  const [actionSaveError, setActionSaveError] = useState<string | null>(null);

  const [completedQualityIssueIds, setCompletedQualityIssueIds] = useState<Set<string | number>>(
    new Set(),
  );
  const [qualityIssueSaveError, setQualityIssueSaveError] = useState<string | null>(null);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiRec?.id]);

  // Optimistic UI with rollback if the PATCH fails.
  const toggleActionRecommendation = async (rec: ActionRecommendation) => {
    const nextIsCompleted = !completedActionIds.has(rec.id);

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
      const response = await apiFetch(`/api/ai/action/${rec.id}/complete`, {
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

  // Optimistic UI with rollback if the PATCH fails.
  const toggleQualityIssue = async (issue: QualityIssue) => {
    const nextIsResolved = !completedQualityIssueIds.has(issue.id);

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
      const response = await apiFetch(`/api/ai/quality/${issue.id}/status`, {
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
      const response = await apiFetch(`/api/ai/description/${descriptionProposalId}/text`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposedText: draftProposedText }),
      });

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
      const response = await apiFetch(`/api/ai/description/${descriptionProposalId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

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

  const completedActionCount = actionRecommendations.filter((rec) =>
    completedActionIds.has(rec.id),
  ).length;

  const isProposalReviewed = isDescriptionProposalReviewed(proposalStatus);

  // Mirror overview counting: every proposal/issue/action is one progress item.
  // Local proposalStatus overrides the first proposal so accept/reject updates the bar immediately.
  const proposalStatusesForProgress = descriptionProposals.map((p, index) =>
    index === 0 ? proposalStatus : (p.status ?? ""),
  );

  const reviewProgress = calculateReviewProgress({
    qualityIssueStatuses: issues.map((iss) =>
      completedQualityIssueIds.has(iss.id)
        ? QUALITY_ISSUE_STATUS_RESOLVED
        : QUALITY_ISSUE_STATUS_PENDING,
    ),
    descriptionProposalStatuses: proposalStatusesForProgress,
    actionIsCompletedFlags: actionRecommendations.map((rec) => completedActionIds.has(rec.id)),
  });

  return {
    aiRec,
    issues,
    actionRecommendations,
    descriptionProposals,
    descriptionProposal,
    descriptionProposalId,
    completedActionIds,
    completedQualityIssueIds,
    completedActionCount,
    actionSaveError,
    qualityIssueSaveError,
    proposalStatus,
    proposedTextValue,
    isEditingProposal,
    draftProposedText,
    setDraftProposedText,
    isSavingProposalText,
    savingProposalAction,
    proposalActionError,
    isProposalReviewed,
    reviewProgress,
    toggleActionRecommendation,
    toggleQualityIssue,
    startEditingProposal,
    cancelEditingProposal,
    saveProposedText,
    updateProposalStatus,
  };
}

export type ArticleReview = ReturnType<typeof useArticleReview>;
