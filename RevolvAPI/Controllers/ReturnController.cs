using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RevolvAPI.Data;
using RevolvAPI.DTOs;
using RevolvAPI.Models;

namespace RevolvAPI.Controllers
{
    [ApiController]
    [Route("api/articles")]
    public class ReturnController : ControllerBase
    {
        private readonly AppDbContext _ctx;


        public ReturnController(AppDbContext ctx) => _ctx = ctx;

        [HttpGet("returns")]
        public async Task<IActionResult> GetArticleReturns()
        {
            // Lade Artikel inkl. AiRecommendations und deren QualityIssues (nötig für MostFrequentReason)
            var articles = await _ctx.Articles
                                     .Include(a => a.AiRecommendations)
                                         .ThenInclude(ar => ar.QualityIssues)
                                     .ToListAsync();

            //  In-memory Mapping: ReturnRate, AiStatus, Color und MostFrequentReason berechnen
            var dtos = articles
                .Select(a =>
                {
                    var recs = a.AiRecommendations;

                    // höchste ReturnRate aus den KI-Empfehlungen (oder 0)
                    var maxReturn = (recs != null && recs.Any())
                        ? recs.Max(r => r.ReturnRate ?? 0m)
                        : 0m;

                    // einfacher KI-Status: Keine Empfehlung / Gelöst / Ausstehend
                    var status = (recs == null || !recs.Any())
                        ? "Keine Empfehlung"
                        : (recs.All(r => r.IsFullyResolved) ? "Gelöst" : "Ausstehend");

                    // Häufigster IssueText aus allen QualityIssues der Empfehlungen
                    var mostFrequentReason = recs?
                        .SelectMany(r => r.QualityIssues ?? new List<QualityIssue>()) // alle QualityIssues sammeln
                        .Select(q => (q.IssueText ?? "Unbekannt").Trim())
                        .Where(t => !string.IsNullOrEmpty(t))
                        .GroupBy(t => t)
                        .OrderByDescending(g => g.Count())
                        .Select(g => g.Key)
                        .FirstOrDefault();

                    return new ArticleTableDTO
                    {
                        ArticleNumber = a.ArticleNumber,
                        Name = a.Name,
                        Category = a.Category,
                        Size = a.Size,
                        ReturnRate = maxReturn,
                        AiStatus = status,
                        color = a.Color, // DTO-Eigenschaft heißt aktuell 'color'
                        MostFrequentReason = mostFrequentReason
                    };
                })
                .OrderByDescending(d => d.ReturnRate)
                .ToList();

            return Ok(dtos);
        }
    }
}