namespace RevolvAPI.Services
{
    public enum ArticleAnalysisStatus
    {
        Success,
        ArticleNotFound,
        EmptyOrInvalidAiResult,
    }

    /// <summary>
    /// Outcome of <see cref="IArticleAnalysisService.AnalyzeArticleAsync"/>.
    /// <see cref="RecommendationId"/> is set only on <see cref="ArticleAnalysisStatus.Success"/>.
    /// </summary>
    public readonly record struct ArticleAnalysisResult(ArticleAnalysisStatus Status, int? RecommendationId)
    {
        public static ArticleAnalysisResult Ok(int recommendationId) =>
            new(ArticleAnalysisStatus.Success, recommendationId);

        public static ArticleAnalysisResult NotFound() =>
            new(ArticleAnalysisStatus.ArticleNotFound, null);

        public static ArticleAnalysisResult EmptyOrInvalidAiResult() =>
            new(ArticleAnalysisStatus.EmptyOrInvalidAiResult, null);
    }
}
