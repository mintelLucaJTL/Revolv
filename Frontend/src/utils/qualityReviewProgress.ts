// Status values that mark a review item as resolved, kept in sync with the backend
// (see QualityController, AiRecommendationController and the Status defaults on the
// QualityIssue / DescriptionProposal models).
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
    status === DESCRIPTION_PROPOSAL_STATUS_ACCEPTED || status === DESCRIPTION_PROPOSAL_STATUS_REJECTED
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

/**
 * Computes the "n / total bearbeitet" summary shown in the quality review modal.
 *
 * The total/reviewed counts are derived from the three independent review items of the
 * currently open article (quality issues, the description proposal, action recommendations)
 * instead of being a value hard-coded by the caller, so the counter always reflects the real
 * state of THIS article.
 */
export function calculateReviewProgress(input: ReviewProgressInput): ReviewProgress {
  const totalCount =
    input.qualityIssueCount + input.actionRecommendationCount + (input.hasDescriptionProposal ? 1 : 0);

  const reviewedCount =
    input.resolvedQualityIssueCount +
    input.completedActionRecommendationCount +
    (input.hasDescriptionProposal && input.isDescriptionProposalReviewed ? 1 : 0);

  return { reviewedCount, totalCount };
}
