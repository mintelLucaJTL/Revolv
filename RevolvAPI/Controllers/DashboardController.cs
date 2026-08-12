using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RevolvAPI.Data;
using RevolvAPI.DTOs;
using RevolvAPI.Extensions;
using RevolvAPI.Services;

namespace RevolvAPI.Controllers
{
    // War bislang ohne [Authorize] - musste ergänzt werden, sonst lässt sich /kpi nicht nach
    // Firma filtern (keine CompanyId ohne eingeloggten User). Folge-Ticket zu #190.
    [ApiController]
    [Authorize]
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

            var companyId = User.GetCompanyId();

            var totalReturned = metrics.Sum(m => m.ReturnedQuantity);
            var totalSold = metrics.Sum(m => m.SoldQuantity);
            var wholeReturnQuote = totalSold > 0 ? Math.Round(totalReturned / totalSold * 100m, 1) : 0m;

            // Same progress rules as /api/ai/overview: newest recommendation per article,
            // open/resolved via AiRecommendationProgress (not historical duplicate rows).
            // Nach CompanyId gefiltert, sonst zählen openKiRecommendations/improvedProducts
            // die Empfehlungen aller Firmen mit.
            var aiRows = await _ctx.AiRecommendations
                .AsNoTracking()
                .Include(r => r.QualityIssues)
                .Include(r => r.DescriptionProposals)
                .Include(r => r.ActionRecommendations)
                .Where(r => r.CompanyId == companyId)
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
            var (yellowThreshold, redThreshold) = await ReturnRateBandService.GetThresholdsAsync(_ctx, User.GetCompanyId());
            var metrics = await _returnAnalytics.GetArticleReturnMetricsAsync();

            var kpis = new TrafficLightKpiDto
            {
                YellowThreshold = yellowThreshold,
                RedThreshold = redThreshold,
                Red = CalculateBand(metrics.Where(m =>
                    ReturnRateBandService.ToBand(m.ReturnRatePercent, yellowThreshold, redThreshold) == "red")),
                Yellow = CalculateBand(metrics.Where(m =>
                    ReturnRateBandService.ToBand(m.ReturnRatePercent, yellowThreshold, redThreshold) == "yellow")),
                // Exclude 0% (sold, never returned) — those are not "low return rate", they have no returns.
                Green = CalculateBand(metrics.Where(m =>
                    ReturnRateBandService.ToBand(m.ReturnRatePercent, yellowThreshold, redThreshold) == "green")),
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
                    IssueText = x.ReasonName,
                    ReturnedAt = x.ReturnDate
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

        // GET api/dashboard/success-metrics?months=8
        // Erfolgsmessung-Feature: Retourenquote-Trend pro Artikel rund um den frühesten
        // angenommenen/erledigten KI-Vorschlag. Nur Artikel mit mindestens einer solchen
        // Änderung sind enthalten.
        [HttpGet("success-metrics")]
        public async Task<IActionResult> GetSuccessMetrics([FromQuery] int months = 8)
        {
            if (months < 3 || months > 24)
            {
                return BadRequest("months muss zwischen 3 und 24 liegen.");
            }

            var trends = await _returnAnalytics.GetArticleSuccessTrendsAsync(User.GetCompanyId(), months);

            var dtos = trends.Select(t => new ArticleSuccessTrendDto
            {
                ArticleId = t.ArtikelId,
                ArticleNumber = t.Sku,
                Name = t.Name ?? "Unbekannt",
                ChangeMonth = $"{t.ChangeMonth.Year:D4}-{t.ChangeMonth.Month:D2}",
                ChangeLabel = t.ChangeLabel,
                Points = t.Points
                    .Select(p => new SuccessMetricPointDto
                    {
                        Month = $"{p.Month.Year:D4}-{p.Month.Month:D2}",
                        ReturnRate = p.ReturnRatePercent
                    })
                    .ToList()
            }).ToList();

            return Ok(dtos);
        }
    }
}
