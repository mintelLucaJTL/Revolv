namespace RevolvAPI.Services
{
    // Pure threshold rules shared by dashboard traffic-lights and GET /api/articles/returns?band=.
    // red > redThreshold, yellow >= yellowThreshold && <= redThreshold,
    // green > 0 && < yellowThreshold. 0% / null are "none" (not a traffic-light band).
    public static class ReturnRateBandRules
    {
        // high = red, medium = yellow, low = green, none = 0% / missing (percent values, e.g. 18.2)
        public static string Classify(decimal? returnRatePercent, decimal yellowThreshold, decimal redThreshold)
        {
            return ToBand(returnRatePercent, yellowThreshold, redThreshold) switch
            {
                "red" => "high",
                "yellow" => "medium",
                "green" => "low",
                _ => "none",
            };
        }

        public static string ToBand(decimal? returnRatePercent, decimal yellowThreshold, decimal redThreshold)
        {
            // No returns yet is not "low risk green" — exclude from Ampel bands entirely.
            if (!returnRatePercent.HasValue || returnRatePercent.Value <= 0m) return "none";
            var rate = returnRatePercent.Value;
            if (rate > redThreshold) return "red";
            if (rate >= yellowThreshold) return "yellow";
            return "green";
        }

        public static bool IsInBand(decimal returnRatePercent, string band, decimal yellowThreshold, decimal redThreshold)
        {
            return string.Equals(
                ToBand(returnRatePercent, yellowThreshold, redThreshold),
                band,
                StringComparison.OrdinalIgnoreCase);
        }
    }
}
