namespace RevolvAPI.DTOs
{
    /// <summary>
    /// Kompletter Detail-DTO für die Modal-Seite ohne Circular References.
    /// </summary>
    public class AiRecommendationDetailDto
    {
        // SEKTION 1: Artikel-Info (flach, kein Navigation zurück)
        public int ArticleId { get; set; }
        public string? ArticleNumber { get; set; }
        public string? ArticleName { get; set; }
        public string? Category { get; set; }
        public string? Size { get; set; }

        // SEKTION 2: KI-Zusammenfassung
        public string? AiSummaryText { get; set; }
        public decimal? ReturnRate { get; set; }
        public bool IsFullyResolved { get; set; }

        // SEKTION 3: Qualitätsprobleme (Array)
        public List<QualityIssueDetailDto> QualityIssues { get; set; } = new();

        // SEKTION 4: Beschreibungsvorschläge (Array)
        public List<DescriptionProposalDetailDto> DescriptionProposals { get; set; } = new();

        // SEKTION 5: Aktionsempfehlungen (Array, mit Checkboxen)
        public List<ActionRecommendationDetailDto> ActionRecommendations { get; set; } = new();
    }

    public class QualityIssueDetailDto
    {
        public int Id { get; set; }
        public string? IssueText { get; set; }
        public string? Status { get; set; }
    }

    public class DescriptionProposalDetailDto
    {
        public int Id { get; set; }
        public string? CurrentText { get; set; }
        public string? ProposedText { get; set; }
        public string? Status { get; set; }
    }

    public class ActionRecommendationDetailDto
    {
        public int Id { get; set; }
        public string? ActionText { get; set; }
        public string? ImpactBadge { get; set; }
        public string? Priority { get; set; }
        public bool IsCompleted { get; set; }
    }
}
