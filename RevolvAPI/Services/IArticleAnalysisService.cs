namespace RevolvAPI.Services
{
    // Der eigentliche KI-Analyse-Use-Case für einen Artikel, extrahiert aus
    // AiRecommendationController (Ticket #252), damit sowohl der manuelle
    // "Analyse starten"-Button als auch der automatische Background-Job
    // (AutoAnalysisBackgroundService) über denselben Code laufen.
    public interface IArticleAnalysisService
    {
        // Startet die KI-Analyse für einen Artikel und persistiert das Ergebnis als neue
        // AiRecommendation inkl. DescriptionProposal(s) und ActionRecommendation(s), zugeordnet
        // zu companyId (Folge-Ticket zu #190). Gibt die Id der neuen AiRecommendation zurück,
        // oder null, wenn der Artikel (in der WAWI) nicht gefunden wurde.
        Task<int?> AnalyzeArticleAsync(int articleId, int companyId);
    }
}
