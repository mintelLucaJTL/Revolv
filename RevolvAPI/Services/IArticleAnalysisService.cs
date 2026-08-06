namespace RevolvAPI.Services
{
    // Der eigentliche KI-Analyse-Use-Case für einen Artikel, extrahiert aus
    // AiRecommendationController (Ticket #252), damit sowohl der manuelle
    // "Analyse starten"-Button als auch der automatische Background-Job
    // (AutoAnalysisBackgroundService) über denselben Code laufen.
    public interface IArticleAnalysisService
    {
        /// <summary>
        /// Starts AI analysis for an article and persists a new AiRecommendation when the
        /// result is usable. Returns NotFound / EmptyOrInvalidAiResult without inserting a row.
        /// </summary>
        Task<ArticleAnalysisResult> AnalyzeArticleAsync(int articleId, int companyId);
    }
}
