namespace RevolvAPI.Services
{
    public enum ArticleAnalysisStatus
    {
        Success,
        ArticleNotFound,
        EmptyOrInvalidAiResult,
        Blocked,
    }

    /// <summary>
    /// Outcome of <see cref="IArticleAnalysisService.AnalyzeArticleAsync"/>.
    /// <see cref="RecommendationId"/> is set only on <see cref="ArticleAnalysisStatus.Success"/>.
    /// <see cref="BlockedReason"/> is set only on <see cref="ArticleAnalysisStatus.Blocked"/>.
    /// </summary>
    public readonly record struct ArticleAnalysisResult(
        ArticleAnalysisStatus Status,
        int? RecommendationId,
        string? BlockedReason = null)
    {
        public static ArticleAnalysisResult Ok(int recommendationId) =>
            new(ArticleAnalysisStatus.Success, recommendationId);

        public static ArticleAnalysisResult NotFound() =>
            new(ArticleAnalysisStatus.ArticleNotFound, null);

        public static ArticleAnalysisResult EmptyOrInvalidAiResult() =>
            new(ArticleAnalysisStatus.EmptyOrInvalidAiResult, null);

        // Re-Analyse-Sperre (siehe ReturnAnalyticsService.GetReanalyzeGateAsync) - spart unnötige
        // KI-Anfragen für Artikel, deren Beschreibung gerade erst überarbeitet wurde.
        public static ArticleAnalysisResult Blocked(string reason) =>
            new(ArticleAnalysisStatus.Blocked, null, reason);
    }
}
