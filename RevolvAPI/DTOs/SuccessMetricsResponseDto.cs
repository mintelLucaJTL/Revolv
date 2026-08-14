namespace RevolvAPI.DTOs
{
    public class SuccessMetricPointDto
    {
        // ISO "yyyy-MM", z.B. "2026-08".
        public string Month { get; set; } = string.Empty;
        public decimal ReturnRate { get; set; }

        // Rohzahlen, aus denen sich ReturnRate ergibt (returnedQuantity / soldQuantity * 100) -
        // damit das Frontend zeigen kann, worauf sich der Prozentwert stützt.
        public decimal ReturnedQuantity { get; set; }
        public decimal SoldQuantity { get; set; }
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
