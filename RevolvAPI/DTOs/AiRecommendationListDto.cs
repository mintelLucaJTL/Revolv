namespace RevolvAPI.DTOs
{
    // Kompakte Sicht für die Übersichtskacheln (GET api/ai/recommendations).
    // Bewusst ohne lange KI-Texte/Kommentare, um die Ladezeit gering zu halten.
    public class AiRecommendationListDto
    {
        public int Id { get; set; }
        public string? ArticleNumber { get; set; }
        public string? Name { get; set; }
        public string? Category { get; set; }
        public decimal? ReturnRate { get; set; }
        public int OpenActionsCount { get; set; }
        public int TotalActionsCount { get; set; }
        public List<string> Tags { get; set; } = new();
    }
}