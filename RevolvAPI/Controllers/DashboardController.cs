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

        // wholeReturnQuote/affectedArticle from WAWI; openKiRecommendations/improvedProducts from AI tables.
        [HttpGet("kpi")]
        public async Task<IActionResult> GetDashboardKpi()
        {
            var metrics = await _returnAnalytics.GetArticleReturnMetricsAsync();

            var totalReturned = metrics.Sum(m => m.ReturnedQuantity);
            var totalSold = metrics.Sum(m => m.SoldQuantity);
            var wholeReturnQuote = totalSold > 0 ? Math.Round(totalReturned / totalSold * 100m, 1) : 0m;

            // Same progress rules as /api/ai/overview: newest recommendation per article,
            // open/resolved via AiRecommendationProgress (not historical duplicate rows).
            var aiRows = await _ctx.AiRecommendations
                .AsNoTracking()
                .Include(r => r.QualityIssues)
                .Include(r => r.DescriptionProposals)
                .Include(r => r.ActionRecommendations)
                .ToListAsync();

            var latestPerArticle = AiRecommendationProgress.SelectLatestPerArticle(aiRows).ToList();
            var progressPerArticle = latestPerArticle
                .Select(AiRecommendationProgress.Count)
                .ToList();

            var kpiDto = new DashboardKpiDto
            {
                wholeReturnQuote = wholeReturnQuote,
                affectedArticle = metrics.Count(m => m.ReturnedQuantity > 0),
                openKiRecommendations = progressPerArticle.Count(p => p.OpenCount > 0),
                improvedProducts = progressPerArticle.Count(p => p.IsFullyResolved),
            };
            return Ok(kpiDto);
        }

        [HttpGet("traffic-lights")]
        public async Task<IActionResult> GetTrafficLightKpis()
        {
            var (yellowThreshold, redThreshold) = await ReturnRateBandService.GetThresholdsAsync(_ctx);
            var metrics = await _returnAnalytics.GetArticleReturnMetricsAsync();

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

        // GET api/dashboard/return-costs?months=6
        // Ticket #273 (Frontend: Kosten-Chart im Dashboard integrieren): liefert die
        // Retourenkosten pro Monat für die letzten `months` Monate plus Gesamtsumme.
        [HttpGet("return-costs")]
        public async Task<IActionResult> GetReturnCosts([FromQuery] int months = 6)
        {
            if (months < 1 || months > 24)
            {
                return BadRequest("months muss zwischen 1 und 24 liegen.");
            }

            var monthly = await _returnAnalytics.GetMonthlyReturnCostsAsync(months);

            var dto = new ReturnCostsResponseDto
            {
                TotalCost = monthly.Sum(m => m.TotalCost),
                Monthly = monthly
                    .Select(m => new MonthlyReturnCostDto
                    {
                        Month = $"{m.Month.Year:D4}-{m.Month.Month:D2}",
                        TotalCost = m.TotalCost
                    })
                    .ToList()
            };

            return Ok(dto);
        }
    }
}
