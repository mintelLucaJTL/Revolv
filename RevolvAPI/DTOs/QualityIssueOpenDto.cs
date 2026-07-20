namespace RevolvAPI.DTOs
{
    // DTO für offene Qualitätsmängel, schlank für die Table-Ansicht im Frontend
    public class QualityIssueOpenDto
    {
        public int Id { get; set; }
        public string IssueText { get; set; } = string.Empty;

        // Artikel‑Info (wichtig für die Übersichtstabelle)
        public int? ArticleId { get; set; }
        public string? ArticleNumber { get; set; }
        public string? ArticleName { get; set; }

       
        public int AiRecommendationId { get; set; }

        public string Status { get; set; } = string.Empty;
    }
}