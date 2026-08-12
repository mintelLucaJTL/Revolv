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

export type ReviewSectionTone = "good" | "warn" | "neutral";

export interface ReviewSectionStatus {
  label: string;
  tone: ReviewSectionTone;
}

/**
 * Shared review state/logic for one article's active AI recommendation.
 * Prefers `preferredRecommendationId` when set (e.g. after analyze POST);
 * otherwise uses aiRecommendations[0] (backend returns newest first).
 * Used by QualityReviewModal (Retouren-Analyse); kept separate from
 * ArticleReviewSections so the persistence logic and the presentation stay decoupled.
 */
export function useArticleReview(
  articleDetail: ArticleDetailDTO | null | undefined,
  onArticleUpdated?: () => void,
  preferredRecommendationId?: string | number | null,
) {
  const recommendations = articleDetail?.aiRecommendations;
  const aiRec =
    preferredRecommendationId != null
      ? recommendations?.find((rec) => String(rec.id) === String(preferredRecommendationId))
      : recommendations?.[0];
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

  // "In WAWI übernehmen" - separat vom Akzeptieren/Ablehnen, da das die live, kundensichtbare
  // Artikelbeschreibung überschreibt und nicht automatisch rückgängig gemacht werden kann.
  const [pushedToWawiAt, setPushedToWawiAt] = useState<string | null>(null);
  const [isPushingToWawi, setIsPushingToWawi] = useState(false);
  const [pushToWawiError, setPushToWawiError] = useState<string | null>(null);
  // Lokaler Sofort-Zustand für "gerade eben in dieser Sitzung übernommen" - articleDetail.canReanalyze
  // kommt vom Server und ist erst nach einem Refetch aktuell; unmittelbar nach einem eigenen Push
  // steht aber (per Re-Analyse-Sperre: mind. 3 neue Retouren nötig) mathematisch fest, dass eine
  // neue Analyse gerade nicht sinnvoll ist - das muss nicht erst per Netzwerk-Roundtrip bestätigt
  // werden, um sofort im UI zu greifen.
  const [justPushedToWawi, setJustPushedToWawi] = useState(false);

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
    setPushedToWawiAt(descriptionProposal?.pushedToWawiAt ?? null);
    setPushToWawiError(null);
    setJustPushedToWawi(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiRec?.id]);

  // Sobald der Server explizit bestätigt, dass wieder analysiert werden darf (z. B. nach einem
  // Refetch, wenn inzwischen genug neue Retouren mit verschobener Gewichtung eingetrudelt sind),
  // darf der lokale Sofort-Zustand das nicht länger überstimmen.
  useEffect(() => {
    if (articleDetail?.canReanalyze === true) {
      setJustPushedToWawi(false);
    }
  }, [articleDetail?.canReanalyze]);

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

  const updateProposalStatus = async (
    status: string,
    action: "accept" | "reject" | "undo",
  ): Promise<boolean> => {
    if (descriptionProposalId === undefined) return false;

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
      return true;
    } catch (err) {
      console.error("Failed to update description proposal status:", err);
      setProposalActionError("Die Aktion konnte nicht gespeichert werden. Bitte erneut versuchen.");
      return false;
    } finally {
      setSavingProposalAction(null);
    }
  };

  // POST statt PATCH: das ist eine einmalige Aktion (schreibt in eine externe DB), keine
  // Zustandsänderung, die beliebig wiederholt werden kann. Gibt zurück, ob es geklappt hat, damit
  // der Aufrufer (das Bestätigungsmodal) bei einem Fehler offen bleiben und die Meldung zeigen
  // kann, statt sich zu schließen, bevor der Nutzer sie liest.
  const pushDescriptionToWawi = async (): Promise<boolean> => {
    if (descriptionProposalId === undefined) return false;

    setIsPushingToWawi(true);
    setPushToWawiError(null);

    try {
      const response = await apiFetch(`/api/ai/description/${descriptionProposalId}/push-to-wawi`, {
        method: "POST",
      });

      // 409 = bereits übernommen (z. B. durch einen zweiten Tab) - kein Fehler, nur ein anderer
      // Zeitpunkt als der, den wir hier grade ausgelöst haben.
      if (response.ok || response.status === 409) {
        const data = (await response.json()) as { pushedAt?: string | null };
        setPushedToWawiAt(data.pushedAt ?? new Date().toISOString());
        setJustPushedToWawi(true);
        onArticleUpdated?.();
        return true;
      }

      if (response.status === 422) {
        const data = (await response.json().catch(() => null)) as { message?: string } | null;
        setPushToWawiError(
          data?.message ?? "Der Vorschlag muss erst akzeptiert werden.",
        );
        return false;
      }

      throw new Error(`HTTP ${response.status}`);
    } catch (err) {
      console.error("Failed to push description to WAWI:", err);
      setPushToWawiError(
        "Die Übernahme in WAWI ist fehlgeschlagen. Bitte erneut versuchen oder das Team informieren.",
      );
      return false;
    } finally {
      setIsPushingToWawi(false);
    }
  };

  // Ein Klick, ein Ergebnis: akzeptiert den Vorschlag (falls noch nicht geschehen - z. B. nach
  // einem vorherigen fehlgeschlagenen Push) und übernimmt ihn direkt live in WAWI. Vorher zwei
  // getrennte Buttons ("Übernehmen" -> "In WAWI übernehmen"), was in der Praxis dazu geführt hat,
  // dass Nutzer nach dem ersten Klick die WAWI-Bestätigung vermisst haben.
  const acceptAndPushToWawi = async (): Promise<boolean> => {
    if (proposalStatus !== PROPOSAL_STATUS_ACCEPTED) {
      const accepted = await updateProposalStatus(PROPOSAL_STATUS_ACCEPTED, "accept");
      if (!accepted) return false;
    }

    return pushDescriptionToWawi();
  };

  const completedActionCount = actionRecommendations.filter((rec) =>
    completedActionIds.has(rec.id),
  ).length;

  const isProposalReviewed = isDescriptionProposalReviewed(proposalStatus);

  // Per-section status for a compact, scannable checklist (ReviewStatusChecklist) instead of
  // one opaque "X/Y bearbeitet" number — new users see at a glance what needs attention.
  const resolvedIssueCount = issues.filter((iss) => completedQualityIssueIds.has(iss.id)).length;
  const qualitySectionStatus: ReviewSectionStatus =
    issues.length === 0
      ? { label: "Keine Probleme", tone: "good" }
      : resolvedIssueCount === issues.length
        ? { label: `${resolvedIssueCount}/${issues.length} gelöst`, tone: "good" }
        : { label: `${issues.length - resolvedIssueCount} offen`, tone: "warn" };

  const descriptionSectionStatus: ReviewSectionStatus =
    descriptionProposalId === undefined
      ? { label: "Kein Vorschlag", tone: "neutral" }
      : isProposalReviewed
        ? { label: proposalStatus === PROPOSAL_STATUS_ACCEPTED ? "Übernommen" : "Abgelehnt", tone: "good" }
        : { label: "Ausstehend", tone: "warn" };

  const actionsSectionStatus: ReviewSectionStatus =
    actionRecommendations.length === 0
      ? { label: "Keine Empfehlungen", tone: "neutral" }
      : completedActionCount === actionRecommendations.length
        ? { label: `${completedActionCount}/${actionRecommendations.length} erledigt`, tone: "good" }
        : { label: `${actionRecommendations.length - completedActionCount} offen`, tone: "warn" };

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
    pushedToWawiAt,
    isPushingToWawi,
    pushToWawiError,
    justPushedToWawi,
    reviewProgress,
    sectionStatus: {
      quality: qualitySectionStatus,
      description: descriptionSectionStatus,
      actions: actionsSectionStatus,
    },
    toggleActionRecommendation,
    toggleQualityIssue,
    startEditingProposal,
    cancelEditingProposal,
    saveProposedText,
    updateProposalStatus,
    pushDescriptionToWawi,
    acceptAndPushToWawi,
  };
}

export type ArticleReview = ReturnType<typeof useArticleReview>;
