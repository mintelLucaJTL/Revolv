// Kept in sync with backend AiRecommendationStatuses / AiRecommendationProgressRules.
export const QUALITY_ISSUE_STATUS_RESOLVED = "Erledigt";
export const QUALITY_ISSUE_STATUS_PENDING = "Ausstehend";

export const DESCRIPTION_PROPOSAL_STATUS_ACCEPTED = "Akzeptiert";
export const DESCRIPTION_PROPOSAL_STATUS_REJECTED = "Abgelehnt";
export const DESCRIPTION_PROPOSAL_STATUS_PENDING = "Ausstehend";

export function isQualityIssueResolved(status?: string | null): boolean {
  return status === QUALITY_ISSUE_STATUS_RESOLVED;
}

export function isDescriptionProposalReviewed(status?: string | null): boolean {
  return (
    status === DESCRIPTION_PROPOSAL_STATUS_ACCEPTED ||
    status === DESCRIPTION_PROPOSAL_STATUS_REJECTED
  );
}

export interface ReviewProgressInput {
  qualityIssueStatuses: Array<string | null | undefined>;
  descriptionProposalStatuses: Array<string | null | undefined>;
  actionIsCompletedFlags: boolean[];
}

export interface ReviewProgress {
  openCount: number;
  resolvedCount: number;
  reviewedCount: number;
  totalCount: number;
}

/** Same open/resolved rules as RevolvAPI AiRecommendationProgressRules.Count. */
export function calculateReviewProgress(input: ReviewProgressInput): ReviewProgress {
  const resolvedQuality = input.qualityIssueStatuses.filter(isQualityIssueResolved).length;
  const resolvedProposals = input.descriptionProposalStatuses.filter(isDescriptionProposalReviewed)
    .length;
  const resolvedActions = input.actionIsCompletedFlags.filter(Boolean).length;

  const totalCount =
    input.qualityIssueStatuses.length +
    input.descriptionProposalStatuses.length +
    input.actionIsCompletedFlags.length;
  const resolvedCount = resolvedQuality + resolvedProposals + resolvedActions;
  const openCount = totalCount - resolvedCount;

  return {
    openCount,
    resolvedCount,
    reviewedCount: resolvedCount,
    totalCount,
  };
}
