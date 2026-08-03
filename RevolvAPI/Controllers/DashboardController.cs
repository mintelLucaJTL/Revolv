using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RevolvAPI.Data;
using RevolvAPI.DTOs;
using RevolvAPI.Services;

namespace RevolvAPI.Controllers
{
    [ApiController]
    [Route("api/dashboard")]
    public class DashboardController : ControllerBase
    {
        private readonly AppDbContext _ctx;
        private readonly IReturnAnalyticsService _returnAnalytics;

        public DashboardController(AppDbContext ctx, IReturnAnalyticsService returnAnalytics)
        {
            _ctx = ctx;
            _returnAnalytics = returnAnalytics;
        }

        // GET api/dashboard/return-reasons
        // Liefert die Top-5-Retourengründe direkt aus den WAWI-Retourenpositionen (dbo.tRMRetourePos)
        // und deren Grund-Übersetzungen (dbo.tRMGrundSprache) - ohne jede KI-Abhängigkeit.
        [HttpGet("return-reasons")]
        public async Task<IActionResult> GetReturnReasons()
        {
            var breakdown = await _returnAnalytics.GetReturnReasonBreakdownAsync(top: 5);

            var dtos = breakdown
                .Select(x => new ReturnReasonsDTO
                {
                    ReasonName = x.ReasonName,
                    Count = x.Count,
                    Percentage = x.Percentage
                })
                .ToList();

            return Ok(dtos);
        }

        // Get the dashboard KPI data
        // wholeReturnQuote/affectedArticle kommen aus den echten Retouren- und Verkaufsdaten.
        // openKiRecommendations/improvedProducts bleiben rein KI-spezifische Kennzahlen.
        [HttpGet("kpi")]
        public async Task<IActionResult> GetDashboardKpi()
        {
            var metrics = await _returnAnalytics.GetArticleReturnMetricsAsync();

            var totalReturned = metrics.Sum(m => m.ReturnedQuantity);
            var totalSold = metrics.Sum(m => m.SoldQuantity);
            var wholeReturnQuote = totalSold > 0 ? Math.Round(totalReturned / totalSold * 100m, 1) : 0m;

            var kpiDto = new DashboardKpiDto
            {
                wholeReturnQuote = wholeReturnQuote,
                affectedArticle = metrics.Count(m => m.ReturnedQuantity > 0),
                openKiRecommendations = await _ctx.AiRecommendations.CountAsync(r => !r.IsFullyResolved),
                improvedProducts = await _ctx.AiRecommendations
                    .Where(r => r.IsFullyResolved)
                    .Select(r => r.ArtikelId)
                    .Distinct()
                    .CountAsync()
            };
            return Ok(kpiDto);
        }

        // GET api/dashboard/traffic-lights
        // Returns the pre-computed counts and average return rates for the red,
        [HttpGet("traffic-lights")]
        public async Task<IActionResult> GetTrafficLightKpis()
        {
            var (yellowThreshold, redThreshold) = await ReturnRateBandService.GetThresholdsAsync(_ctx);
            var metrics = await _returnAnalytics.GetArticleReturnMetricsAsync();

            // Calculate the traffic light KPIs.
            var kpis = new TrafficLightKpiDto
            {
                YellowThreshold = yellowThreshold,
                RedThreshold = redThreshold,
                Red = CalculateBand(metrics.Where(m => m.ReturnRatePercent > redThreshold)),
                Yellow = CalculateBand(metrics.Where(m =>
                    m.ReturnRatePercent >= yellowThreshold && m.ReturnRatePercent <= redThreshold)),
                Green = CalculateBand(metrics.Where(m => m.ReturnRatePercent < yellowThreshold)),
            };

            return Ok(kpis);
        }

        // Calculates the traffic light KPIs for a single band.
        private static TrafficLightGroupDto CalculateBand(IEnumerable<ArticleReturnMetric> metrics)
        {
            var list = metrics.ToList();
            var count = list.Count;
            var average = count > 0 ? list.Average(m => m.ReturnRatePercent) : 0m;

            return new TrafficLightGroupDto
            {
                Count = count,
                AveragePercent = Math.Round(average, 2)
            };
        }

        // GET api/dashboard/latest-returns
        // Returns the most recently reported return line items (used for the dashboard live feed).
        [HttpGet("latest-returns")]
        public async Task<IActionResult> GetLatestReturns()
        {
            var latest = await _returnAnalytics.GetLatestReturnsAsync(take: 5);

            var latestReturns = latest
                .Select(x => new ReturnListItemDto
                {
                    ArticleNumber = x.Sku,
                    Name = x.ArticleName ?? "Unbekannt",
                    IssueText = x.ReasonName
                })
                .ToList();

            return Ok(latestReturns);
        }

        [HttpGet("top-returned-articles")]
        public async Task<IActionResult> GetTopReturnedArticles()
        {
            var topReturns = await _returnAnalytics.GetTopReturnedArticlesAsync(take: 5);

            var dtos = topReturns
                .Select(x => new TopReturnedArticleDto
                {
                    ArticleNumber = x.Sku,
                    Name = x.Name ?? "Unbekannt",
                    ReturnRate = x.ReturnRatePercent
                })
                .ToList();

            return Ok(dtos);
        }

    }
}
