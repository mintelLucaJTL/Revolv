using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RevolvAPI.Data;
using RevolvAPI.DTOs;
using RevolvAPI.Models;
using RevolvAPI.Services;

namespace RevolvAPI.Controllers
{
    [ApiController]
    [Authorize]
    [Route("api/articles")]
    public class ReturnController : ControllerBase
    {
        private readonly AppDbContext _ctx;
        private readonly IReturnAnalyticsService _returnAnalytics;

        public ReturnController(AppDbContext ctx, IReturnAnalyticsService returnAnalytics)
        {
            _ctx = ctx;
            _returnAnalytics = returnAnalytics;
        }

        // band (optional): "red" | "yellow" | "green" - filtert auf die Ampel-Risikoklasse (siehe DashboardController.GetTrafficLightKpis).
        //
        // Die Retourenquote, der häufigste Retourengrund und die Liste selbst kommen komplett
        // aus den echten JTL-WAWI-Daten (ReturnAnalyticsService) - das funktioniert auch ohne
        // jede KI-Analyse. Der KI-Status ("AiStatus") ist eine optionale Zusatzinfo, die nur
        // angezeigt wird, wenn für den Artikel bereits eine AiRecommendation existiert.
        [HttpGet("returns")]
        public async Task<IActionResult> GetArticleReturns([FromQuery] string? band = null)
        {
            // GetArticleReturnMetricsAsync liefert bereits nur die "relevanten" Artikel (mind.
            // einmal verkauft oder retourniert) - nicht den kompletten Katalog inkl. nie
            // verkaufter Varianten. Damit die Ampel-Kacheln auf dem Dashboard (die dieselbe
            // Datenbasis nutzen) und diese Tabelle konsistent bleiben, wird hier NICHT
            // zusätzlich auf "hat Retoure" gefiltert - sonst würde z. B. ein Klick auf die
            // "Grün"-Kachel (Artikel mit 0% Retourenquote) auf eine leere Liste führen.
            var metrics = await _returnAnalytics.GetArticleReturnMetricsAsync();

            // KI-Status optional nachladen (nur für Artikel, die überhaupt eine KI-Empfehlung haben).
            var artikelIds = metrics.Select(m => m.ArtikelId).ToList();
            var aiRecommendations = await _ctx.AiRecommendations
                .AsNoTracking()
                .Include(r => r.DescriptionProposals)
                .Where(r => artikelIds.Contains(r.ArtikelId))
                .ToListAsync();
            var aiRecsByArticle = aiRecommendations
                .GroupBy(r => r.ArtikelId)
                .ToDictionary(g => g.Key, g => g.ToList());

            var dtos = metrics
                .Select(m =>
                {
                    var recs = aiRecsByArticle.GetValueOrDefault(m.ArtikelId);

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

                    return new ArticleTableDTO
                    {
                        id = m.ArtikelId,
                        ArticleNumber = m.Sku,
                        Name = m.Name,
                        Category = m.Category,
                        ReturnRate = m.ReturnRatePercent,
                        AiStatus = status,
                        MostFrequentReason = m.MostFrequentReason
                    };
                })
                .OrderByDescending(d => d.ReturnRate)
                .ToList();

            if (!string.IsNullOrEmpty(band))
            {
                var (yellowThreshold, redThreshold) = await ReturnRateBandService.GetThresholdsAsync(_ctx);

                List<ArticleTableDTO>? filtered = band.ToLowerInvariant() switch
                {
                    "red" or "yellow" or "green" => dtos
                        .Where(d => ReturnRateBandService.IsInBand(d.ReturnRate, band, yellowThreshold, redThreshold))
                        .ToList(),
                    _ => null,
                };

                if (filtered == null)
                {
                    return BadRequest("band must be red, yellow or green");
                }

                dtos = filtered;
            }

            return Ok(dtos);
        }
    }
}
