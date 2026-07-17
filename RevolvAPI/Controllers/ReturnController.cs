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

        // DbContext per Dependency Injection erhalten
        public ReturnController(AppDbContext ctx) => _ctx = ctx;

        
        [HttpGet("returns")]
        public async Task<IActionResult> GetArticleReturns()
        {
            var articles = await _ctx.Articles
                                     .Include(a => a.AiRecommendations)
                                     .ToListAsync();
            // Berechne für jeden Artikel die höchste ReturnRate aus den KI-Empfehlungen
            // Bestimme einen einfachen KI-Status
            // Erstelle ein leichtgewichtiges DTO zur Übertragung an das Frontend
            var dtos = articles
                .Select(a =>
                {
                    var recs = a.AiRecommendations;

                    // Maximalwert der ReturnRate falls keine Empfehlungen existieren ist es 0
                    var maxReturn = (recs != null && recs.Any())
                        ? recs.Max(r => r.ReturnRate ?? 0m)
                        : 0m;

                    // Statusbestimmung:
                    // keine Empfehlungen = "Keine Empfehlung"
                    // alle Empfehlungen als gelöst markiert = "Gelöst"
                    // sonst = "Ausstehend"
                    var status = (recs == null || !recs.Any())
                        ? "Keine Empfehlung"
                        : (recs.All(r => r.IsFullyResolved) ? "Gelöst" : "Ausstehend");

                    // DTO befüllen Null-Schutz (Backend sendet keine null-Strings weil sonst hat man unnötige datensätze)
                    return new ArticleTableDTO
                    {
                        ArticleNumber = a.ArticleNumber ?? string.Empty,
                        Name = a.Name ?? string.Empty,
                        Category = a.Category ?? string.Empty,
                        Size = a.Size ?? string.Empty,
                        ReturnRate = maxReturn,
                        AiStatus = status
                    };
                })
               
                .OrderByDescending(d => d.ReturnRate)
                .ToList();
            return Ok(dtos);
        }
    }
}