namespace RevolvAPI.DTOs
{
    public class SuccessMetricPointDto
    {
        // ISO "yyyy-MM", z.B. "2026-08".
        public string Month { get; set; } = string.Empty;
        public decimal ReturnRate { get; set; }
    }

    public class ArticleSuccessTrendDto
    {
        public int ArticleId { get; set; }
        public string ArticleNumber { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;

        // ISO "yyyy-MM" - wann der früheste angenommene/erledigte KI-Vorschlag für diesen
        // Artikel umgesetzt wurde.
        public string ChangeMonth { get; set; } = string.Empty;
        public string ChangeLabel { get; set; } = string.Empty;

        public List<SuccessMetricPointDto> Points { get; set; } = new();
    }
}
