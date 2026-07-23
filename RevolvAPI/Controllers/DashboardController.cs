using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RevolvAPI.Data;
using RevolvAPI.DTOs;
using RevolvAPI.Models;
using RevolvAPI.Services;

namespace RevolvAPI.Controllers
{
    [ApiController]
    [Route("api/dashboard")]
    public class DashboardController : ControllerBase
    {
        private readonly AppDbContext _ctx;
        public DashboardController(AppDbContext ctx) => _ctx = ctx;

        // GET api/dashboard/return-reasons
        // Returns the top 5 return reasons by count.
        [HttpGet("return-reasons")]
        public async Task<IActionResult> GetReturnReasons()
        {
            // Get the total count of quality issues for the percentage calculation.
            var totalCount = await _ctx.QualityIssues.CountAsync();

            // Group the quality issues by issue text and count the number of issues for each reason.
            var grouped = await _ctx.QualityIssues
                .GroupBy(q => q.IssueText ?? "Unbekannt")
                .Select(g => new { Reason = g.Key, Count = g.Count() })
                .OrderByDescending(x => x.Count)
                .Take(5)
                .ToListAsync();

            // Calculate the percentage of the total count for each reason.
            // Convert the grouped data to DTOs.
            var dtos = grouped
                .Select(x => new ReturnReasonsDTO
                {
                    ReasonName = x.Reason,
                    Count = x.Count,
                    Percentage = totalCount > 0
                    ? Math.Round((decimal)x.Count * 100m / totalCount, 2) : 0m
                })
                .ToList();

            return Ok(dtos);
        }

        // Get the dashboard KPI data
        [HttpGet("kpi")]
        public async Task<IActionResult> GetDashboardKpi()
        {
            // AverageAsync throws on an empty set; count first, then average.
            var recommendationCount = await _ctx.AiRecommendations.CountAsync();
            var wholeReturnQuote = recommendationCount > 0
                ? await _ctx.AiRecommendations.AverageAsync(r => r.ReturnRate) ?? 0.0m
                : 0.0m;

            var kpiDto = new DashboardKpiDto
            {
                wholeReturnQuote = Math.Round(wholeReturnQuote, 1),
                affectedArticle = await _ctx.Articles.CountAsync(a => a.AiRecommendations.Any()),
                openKiRecommendations = await _ctx.AiRecommendations.CountAsync(r => !r.IsFullyResolved),
                improvedProducts = await _ctx.Articles.CountAsync(a => a.AiRecommendations.Any(r => r.IsFullyResolved))
            };
            return Ok(kpiDto);
        }

        // GET api/dashboard/traffic-lights
        // Returns the pre-computed counts and average return rates for the red,
        [HttpGet("traffic-lights")]
        public async Task<IActionResult> GetTrafficLightKpis()
        {
            var (yellowThreshold, redThreshold) = await ReturnRateBandService.GetThresholdsAsync(_ctx);

            // Calculate the traffic light KPIs.
            var kpis = new TrafficLightKpiDto
            {
                YellowThreshold = yellowThreshold,
                RedThreshold = redThreshold,
                Red = await CalculateBandAsync(
                    _ctx.AiRecommendations.Where(r => r.ReturnRate > redThreshold)),
                Yellow = await CalculateBandAsync(
                    _ctx.AiRecommendations.Where(r =>
                        r.ReturnRate >= yellowThreshold && r.ReturnRate <= redThreshold)),
                Green = await CalculateBandAsync(
                    _ctx.AiRecommendations.Where(r => r.ReturnRate < yellowThreshold)),
            };

            return Ok(kpis);
        }

        // Calculates the traffic light KPIs for a single band.
        private static async Task<TrafficLightGroupDto> CalculateBandAsync(IQueryable<AiRecommendation> query)
        {
            // Get the count of recommendations in the band.
            var count = await query.CountAsync();

            // Get the average return rate of the recommendations in the band.
            var average = count > 0
                ? await query.AverageAsync(r => r.ReturnRate ?? 0m)
                : 0m;

            // Return the traffic light KPIs for the band.
            return new TrafficLightGroupDto
            {
                Count = count,
                AveragePercent = Math.Round(average, 2)
            };
        }
    }
}
