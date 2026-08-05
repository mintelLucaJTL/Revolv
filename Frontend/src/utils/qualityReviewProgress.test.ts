import { describe, expect, it } from "vitest";
import {
  calculateReviewProgress,
  DESCRIPTION_PROPOSAL_STATUS_ACCEPTED,
  DESCRIPTION_PROPOSAL_STATUS_PENDING,
  DESCRIPTION_PROPOSAL_STATUS_REJECTED,
  isDescriptionProposalReviewed,
  isQualityIssueResolved,
  QUALITY_ISSUE_STATUS_PENDING,
  QUALITY_ISSUE_STATUS_RESOLVED,
} from "./qualityReviewProgress";

describe("qualityReviewProgress", () => {
  it("treats quality issues as resolved only for Erledigt", () => {
    expect(isQualityIssueResolved(QUALITY_ISSUE_STATUS_RESOLVED)).toBe(true);
    expect(isQualityIssueResolved(QUALITY_ISSUE_STATUS_PENDING)).toBe(false);
    expect(isQualityIssueResolved("Akzeptiert")).toBe(false);
  });

  it("treats description proposals as reviewed for Akzeptiert or Abgelehnt", () => {
    expect(isDescriptionProposalReviewed(DESCRIPTION_PROPOSAL_STATUS_ACCEPTED)).toBe(true);
    expect(isDescriptionProposalReviewed(DESCRIPTION_PROPOSAL_STATUS_REJECTED)).toBe(true);
    expect(isDescriptionProposalReviewed(DESCRIPTION_PROPOSAL_STATUS_PENDING)).toBe(false);
    expect(isDescriptionProposalReviewed("Erledigt")).toBe(false);
  });

  it("counts open/resolved with the same rules as the backend overview", () => {
    const progress = calculateReviewProgress({
      qualityIssueStatuses: [QUALITY_ISSUE_STATUS_PENDING, QUALITY_ISSUE_STATUS_RESOLVED],
      descriptionProposalStatuses: [
        DESCRIPTION_PROPOSAL_STATUS_ACCEPTED,
        DESCRIPTION_PROPOSAL_STATUS_REJECTED,
        DESCRIPTION_PROPOSAL_STATUS_PENDING,
      ],
      actionIsCompletedFlags: [true, false],
    });

    expect(progress).toEqual({
      openCount: 3,
      resolvedCount: 4,
      reviewedCount: 4,
      totalCount: 7,
    });
  });
});
