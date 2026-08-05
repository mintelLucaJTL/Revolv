namespace RevolvAPI.DTOs
{
    public class MonthlyReturnCostDto
    {
        // ISO "yyyy-MM", z.B. "2026-08".
        public string Month { get; set; } = string.Empty;
        public decimal TotalCost { get; set; }

        // true, wenn mind. ein Artikel in diesem Monat mangels Rechnungsdaten über den
        // Katalogpreis statt des echten Verkaufspreises bewertet wurde - kein gemessener Wert.
        public bool IsEstimated { get; set; }
    }

    public class ReturnCostsResponseDto
    {
        public decimal TotalCost { get; set; }
        public List<MonthlyReturnCostDto> Monthly { get; set; } = new();
    }
}
