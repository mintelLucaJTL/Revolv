import { describe, expect, it } from "vitest";
import {
  findAiRecommendation,
  isUsableAiRecommendation,
} from "./aiRecommendation";
import type { AiRecommendation, ArticleDetailDTO } from "../types/api";

describe("findAiRecommendation", () => {
  const detail: ArticleDetailDTO = {
    id: "1",
    aiRecommendations: [
      { id: 10, aiSummaryText: "newest" },
      { id: 5, aiSummaryText: "older" },
    ],
  };

  it("finds by numeric id", () => {
    expect(findAiRecommendation(detail, 5)?.aiSummaryText).toBe("older");
  });

  it("matches string and number ids", () => {
    expect(findAiRecommendation(detail, "10")?.aiSummaryText).toBe("newest");
  });

  it("returns undefined when missing", () => {
    expect(findAiRecommendation(detail, 99)).toBeUndefined();
    expect(findAiRecommendation(null, 1)).toBeUndefined();
  });
});

describe("isUsableAiRecommendation", () => {
  it("rejects empty or missing recommendations", () => {
    expect(isUsableAiRecommendation(undefined)).toBe(false);
    expect(isUsableAiRecommendation(null)).toBe(false);
    expect(isUsableAiRecommendation({ id: 1 })).toBe(false);
    expect(isUsableAiRecommendation({ id: 1, aiSummaryText: "   " })).toBe(false);
    expect(
      isUsableAiRecommendation({
        id: 1,
        qualityIssues: [],
        descriptionProposals: [],
        actionRecommendations: [],
      }),
    ).toBe(false);
  });

  it("accepts recommendations with visible content", () => {
    expect(isUsableAiRecommendation({ id: 1, aiSummaryText: "Summary" })).toBe(true);
    expect(
      isUsableAiRecommendation({
        id: 1,
        qualityIssues: [{ id: 1, issueText: "Issue" }],
      }),
    ).toBe(true);
    expect(
      isUsableAiRecommendation({
        id: 1,
        descriptionProposals: [{ id: 1, proposedText: "Text" }],
      }),
    ).toBe(true);
    expect(
      isUsableAiRecommendation({
        id: 1,
        actionRecommendations: [{ id: 1, actionText: "Do something" }],
      }),
    ).toBe(true);
  });

  it("treats typed empty shells as unusable", () => {
    const empty: AiRecommendation = {
      id: 42,
      aiSummaryText: "",
      qualityIssues: [],
      descriptionProposals: [],
      actionRecommendations: [],
    };
    expect(isUsableAiRecommendation(empty)).toBe(false);
  });
});
