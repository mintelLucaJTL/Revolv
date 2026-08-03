// Kept in sync with backend status strings on QualityIssue / DescriptionProposal.
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
  qualityIssueCount: number;
  resolvedQualityIssueCount: number;
  actionRecommendationCount: number;
  completedActionRecommendationCount: number;
  hasDescriptionProposal: boolean;
  isDescriptionProposalReviewed: boolean;
}

export interface ReviewProgress {
  reviewedCount: number;
  totalCount: number;
}

export function calculateReviewProgress(input: ReviewProgressInput): ReviewProgress {
  const totalCount =
    input.qualityIssueCount +
    input.actionRecommendationCount +
    (input.hasDescriptionProposal ? 1 : 0);

  const reviewedCount =
    input.resolvedQualityIssueCount +
    input.completedActionRecommendationCount +
    (input.hasDescriptionProposal && input.isDescriptionProposalReviewed ? 1 : 0);

  return { reviewedCount, totalCount };
}
