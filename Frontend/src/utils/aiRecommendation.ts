import type { AiRecommendation, ArticleDetailDTO } from "../types/api";

/** Find a recommendation by id (string/number-safe). */
export function findAiRecommendation(
  articleDetail: ArticleDetailDTO | null | undefined,
  recommendationId: string | number,
): AiRecommendation | undefined {
  return articleDetail?.aiRecommendations?.find(
    (rec) => String(rec.id) === String(recommendationId),
  );
}

/**
 * A recommendation is usable when it has at least one visible piece of content
 * the review UI can render (summary, issues, description proposal, or actions).
 */
export function isUsableAiRecommendation(
  recommendation: AiRecommendation | null | undefined,
): boolean {
  if (!recommendation) return false;

  if (recommendation.aiSummaryText?.trim()) return true;
  if ((recommendation.qualityIssues?.length ?? 0) > 0) return true;
  if ((recommendation.descriptionProposals?.length ?? 0) > 0) return true;
  if ((recommendation.actionRecommendations?.length ?? 0) > 0) return true;

  return false;
}
