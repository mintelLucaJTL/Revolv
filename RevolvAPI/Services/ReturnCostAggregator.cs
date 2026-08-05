namespace RevolvAPI.Services
{
    // One returned line item, already reduced to what the aggregation needs.
    public record ReturnCostLine(int ItemId, decimal Quantity, DateOnly ReturnMonth);

    // Pure, DB-free aggregation (no EF/SQL dependency) so it can be unit-tested directly.
    // Split out of ReturnAnalyticsService.GetMonthlyReturnCostsAsync, which still owns the
    // WAWI queries and price lookup; this only does the month-bucketing/rounding/gap-filling.
    public static class ReturnCostAggregator
    {
        // Always returns exactly `months` entries starting at `rangeStart` (inclusive), even for
        // months with zero returns, so callers get a gapless time series for charts.
        // A month is IsEstimated=true if any of its returned items had no real invoice price and
        // fell back to the catalog price (see ReturnAnalyticsService.GetAverageSalesPriceByItemAsync).
        public static List<MonthlyReturnCost> Aggregate(
            IEnumerable<ReturnCostLine> lines,
            IReadOnlyDictionary<int, decimal> priceByItem,
            IReadOnlySet<int> estimatedPriceItemIds,
            DateOnly rangeStart,
            int months)
        {
            var lineList = lines.ToList();

            var totalByMonth = lineList
                .GroupBy(x => x.ReturnMonth)
                .ToDictionary(
                    g => g.Key,
                    g => g.Sum(x => x.Quantity * priceByItem.GetValueOrDefault(x.ItemId, 0m)));

            var estimatedByMonth = lineList
                .GroupBy(x => x.ReturnMonth)
                .ToDictionary(
                    g => g.Key,
                    g => g.Any(x => estimatedPriceItemIds.Contains(x.ItemId)));

            var result = new List<MonthlyReturnCost>(months);
            for (var i = 0; i < months; i++)
            {
                var monthStart = rangeStart.AddMonths(i);
                result.Add(new MonthlyReturnCost(
                    monthStart,
                    Math.Round(totalByMonth.GetValueOrDefault(monthStart, 0m), 2),
                    estimatedByMonth.GetValueOrDefault(monthStart, false)));
            }

            return result;
        }
    }
}
