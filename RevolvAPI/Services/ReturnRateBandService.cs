using Microsoft.EntityFrameworkCore;
using RevolvAPI.Data;

namespace RevolvAPI.Services
{
    // Shared return-rate traffic-light bands based on ShopSettings thresholds.
    public static class ReturnRateBandService
    {
        public static async Task<(decimal Yellow, decimal Red)> GetThresholdsAsync(AppDbContext ctx)
        {
            var settings = await ctx.ShopSettings
                .AsNoTracking()
                .OrderBy(s => s.Id)
                .FirstOrDefaultAsync();

            return (
                Yellow: settings?.ThresholdYellow ?? 10m,
                Red: settings?.ThresholdRed ?? 25m
            );
        }

        // high = red, medium = yellow, low = green (percent values, e.g. 18.2)
        public static string Classify(decimal? returnRatePercent, decimal yellowThreshold, decimal redThreshold)
        {
            if (!returnRatePercent.HasValue) return "low";
            var rate = returnRatePercent.Value;
            if (rate > redThreshold) return "high";
            if (rate >= yellowThreshold) return "medium";
            return "low";
        }
    }
}
