using Microsoft.EntityFrameworkCore;
using RevolvAPI.Data;

namespace RevolvAPI.Services
{
    // Shared return-rate traffic-light bands based on ShopSettings thresholds.
    public static class ReturnRateBandService
    {
        public static async Task<(decimal Yellow, decimal Red)> GetThresholdsAsync(AppDbContext ctx, int companyId)
        {
            var settings = await ctx.ShopSettings
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.CompanyId == companyId);

            return (
                Yellow: settings?.ThresholdYellow ?? 10m,
                Red: settings?.ThresholdRed ?? 25m
            );
        }

        public static string Classify(decimal? returnRatePercent, decimal yellowThreshold, decimal redThreshold)
            => ReturnRateBandRules.Classify(returnRatePercent, yellowThreshold, redThreshold);

        public static string ToBand(decimal? returnRatePercent, decimal yellowThreshold, decimal redThreshold)
            => ReturnRateBandRules.ToBand(returnRatePercent, yellowThreshold, redThreshold);

        public static bool IsInBand(decimal returnRatePercent, string band, decimal yellowThreshold, decimal redThreshold)
            => ReturnRateBandRules.IsInBand(returnRatePercent, band, yellowThreshold, redThreshold);
    }
}
