using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RevolvAPI.Data;
using RevolvAPI.DTOs;
using RevolvAPI.Models;

namespace RevolvAPI.Controllers
{
    [ApiController]
    [Authorize]
    [Route("api/articles")]
    public class ReturnController : ControllerBase
    {
        private readonly AppDbContext _ctx;


        public ReturnController(AppDbContext ctx) => _ctx = ctx;

        [HttpGet("returns")]
        public async Task<IActionResult> GetArticleReturns()
        {
            // Lade Artikel inkl. AiRecommendations, deren QualityIssues (nötig für MostFrequentReason)
            // und DescriptionProposals (nötig für den granularen KI-Status).
            var articles = await _ctx.Articles
                                     .Include(a => a.AiRecommendations)
                                         .ThenInclude(ar => ar.QualityIssues)
                                     .Include(a => a.AiRecommendations)
                                         .ThenInclude(ar => ar.DescriptionProposals)
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

                    // Granularer KI-Status, abgeleitet vom Review-Status der KI-Textvorschläge:
                    // Keine Empfehlung / Angenommen / Abgelehnt / Ausstehend (gemischt oder ungeprüft) / Gelöst (kein Vorschlag zu prüfen).
                    var proposals = recs?.SelectMany(r => r.DescriptionProposals ?? new List<DescriptionProposal>()).ToList()
                        ?? new List<DescriptionProposal>();

                    string status;
                    if (recs == null || !recs.Any())
                    {
                        status = "Keine Empfehlung";
                    }
                    else if (proposals.Any())
                    {
                        if (proposals.All(p => p.Status == "Akzeptiert"))
                            status = "Angenommen";
                        else if (proposals.All(p => p.Status == "Abgelehnt"))
                            status = "Abgelehnt";
                        else
                            status = "Ausstehend";
                    }
                    else
                    {
                        // Kein Textvorschlag zum Prüfen vorhanden - Status kommt vom generellen Resolved-Flag.
                        status = recs.All(r => r.IsFullyResolved) ? "Gelöst" : "Ausstehend";
                    }

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
                        id = a.Id,
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