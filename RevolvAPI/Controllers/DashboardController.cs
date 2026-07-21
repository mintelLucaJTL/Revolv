using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RevolvAPI.Data;
using RevolvAPI.DTOs;

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
            var kpiDto = new DashboardKpiDto
            {
                // Calculate the whole return quote
                wholeReturnQuote = await _ctx.AiRecommendations.AverageAsync(r => r.ReturnRate) ?? 0.0m,
                // Calculate the affected articles
                affectedArticle = await _ctx.Articles.CountAsync(a => a.AiRecommendations.Any()),
                // Calculate the open Ki recommendations
                openKiRecommendations = await _ctx.AiRecommendations.CountAsync(r => !r.IsFullyResolved),
                // Calculate the improved products
                improvedProducts = await _ctx.Articles.CountAsync(a => a.AiRecommendations.Any(r => r.IsFullyResolved))
            };
            return Ok(kpiDto);
        }
    }
}