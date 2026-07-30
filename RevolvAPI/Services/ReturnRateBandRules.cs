namespace RevolvAPI.Services
{
    // Pure threshold rules shared by dashboard traffic-lights and GET /api/articles/returns?band=.
    // red > redThreshold, yellow >= yellowThreshold && <= redThreshold, green < yellowThreshold
    public static class ReturnRateBandRules
    {
        // high = red, medium = yellow, low = green (percent values, e.g. 18.2)
        public static string Classify(decimal? returnRatePercent, decimal yellowThreshold, decimal redThreshold)
        {
            return ToBand(returnRatePercent, yellowThreshold, redThreshold) switch
            {
                "red" => "high",
                "yellow" => "medium",
                _ => "low",
            };
        }

        public static string ToBand(decimal? returnRatePercent, decimal yellowThreshold, decimal redThreshold)
        {
            if (!returnRatePercent.HasValue) return "green";
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
