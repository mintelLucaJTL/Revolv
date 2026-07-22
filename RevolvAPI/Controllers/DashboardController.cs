using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RevolvAPI.Data;
using RevolvAPI.DTOs;
using RevolvAPI.Models;

namespace RevolvAPI.Controllers
{
    [ApiController]
    [Route("api/dashboard")]
    public class DashboardController : ControllerBase
    {
        private readonly AppDbContext _ctx;
        public DashboardController(AppDbContext ctx) => _ctx = ctx;


        [HttpGet("return-reasons")]
        public async Task<IActionResult> GetReturnReasons()
        {
            // Gesamtanzahl aller QualityIssues für die Prozentberechnung ermitteln.
            var totalCount = await _ctx.QualityIssues.CountAsync();

            // Gruppieren und Zählen in der Datenbank:
            //  null IssueText wird zu "Unbekannt"
            //  DB macht GroupBy + Count, dann OrderByDescending + Take(5)
            var grouped = await _ctx.QualityIssues
                .GroupBy(q => q.IssueText ?? "Unbekannt")
                .Select(g => new { Reason = g.Key, Count = g.Count() })
                .OrderByDescending(x => x.Count)
                .Take(5)
                .ToListAsync();


            // Prozentwert berechnen (sichere Division, gerundet auf 2 Nachkommastellen
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
            // AverageAsync wirft bei leerer Menge; daher erst zählen, dann mitteln.
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
        // yellow and green bands. The client receives KPIs only, never raw articles.
        [HttpGet("traffic-lights")]
        public async Task<IActionResult> GetTrafficLightKpis()
        {
            // Return-rate bands. Recommendations without a return rate are excluded,
            // because a null value never satisfies these comparisons in SQL.
            var kpis = new TrafficLightKpiDto
            {
                Red = await CalculateBandAsync(_ctx.AiRecommendations.Where(r => r.ReturnRate > 25m)),
                Yellow = await CalculateBandAsync(_ctx.AiRecommendations.Where(r => r.ReturnRate >= 10m && r.ReturnRate <= 25m)),
                Green = await CalculateBandAsync(_ctx.AiRecommendations.Where(r => r.ReturnRate < 10m))
            };

            return Ok(kpis);
        }

        // Aggregates a single band directly in the database. The count guards the
        // average so an empty band returns 0 instead of failing on AVG over no rows.
        private static async Task<TrafficLightGroupDto> CalculateBandAsync(IQueryable<AiRecommendation> query)
        {
            var count = await query.CountAsync();

            var average = count > 0
                ? await query.AverageAsync(r => r.ReturnRate ?? 0m)
                : 0m;

            return new TrafficLightGroupDto
            {
                Count = count,
                AveragePercent = Math.Round(average, 2)
            };
        }
    }
}