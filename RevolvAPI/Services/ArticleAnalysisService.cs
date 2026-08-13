using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using RevolvAPI.Data;
using RevolvAPI.Models;

namespace RevolvAPI.Services
{
    /// <inheritdoc cref="IArticleAnalysisService" />
    public class ArticleAnalysisService : IArticleAnalysisService
    {
        private readonly AppDbContext _ctx;
        private readonly IAiService _aiService;
        private readonly IReturnAnalyticsService _returnAnalytics;

        public ArticleAnalysisService(AppDbContext ctx, IAiService aiService, IReturnAnalyticsService returnAnalytics)
        {
            _ctx = ctx;
            _aiService = aiService;
            _returnAnalytics = returnAnalytics;
        }

        public async Task<ArticleAnalysisResult> AnalyzeArticleAsync(int articleId, int companyId)
        {
            var articleInfo = (await _returnAnalytics.GetArticleDisplayInfoAsync(new[] { articleId }))
                .GetValueOrDefault(articleId);

            if (articleInfo == null)
            {
                return ArticleAnalysisResult.NotFound();
            }

            // Re-Analyse-Sperre: nach einer bereits live in WAWI übernommenen Beschreibung lohnt
            // sich eine neue KI-Anfrage erst, wenn genug neue Retouren dazugekommen sind und sich
            // die Gewichtung der Retourengründe spürbar verschoben hat. Gilt für den manuellen
            // Button genauso wie für den automatischen Background-Job (Ticket #252), damit beide
            // Wege KI-Anfragen sparen, nicht nur der Button.
            var gate = await _returnAnalytics.GetReanalyzeGateAsync(articleId, companyId);
            if (!gate.CanReanalyze)
            {
                return ArticleAnalysisResult.Blocked(
                    gate.BlockedReason ?? "Für diesen Artikel ist aktuell keine neue Analyse nötig.");
            }

            // Live return rate for the new row (Ticket #242) — same source as the returns table.
            var metrics = await _returnAnalytics.GetArticleReturnMetricsAsync();
            var returnRate = metrics.FirstOrDefault(m => m.ArtikelId == articleId)?.ReturnRatePercent;

            // Nur die eigenen bisherigen Analysen als Kontext nutzen - sonst würden Rückgabegründe
            // einer anderen Firma in die eigene KI-Anfrage einfließen.
            var existingRecommendations = await _ctx.AiRecommendations
                .Include(r => r.QualityIssues)
                .Where(r => r.ArtikelId == articleId && r.CompanyId == companyId)
                .OrderByDescending(r => r.Id)
                .ToListAsync();

            // Retourengründe aus allen bisherigen QualityIssues des Artikels sammeln.
            var returnReasons = existingRecommendations
                .SelectMany(r => r.QualityIssues)
                .Select(q => q.IssueText)
                .Where(t => !string.IsNullOrWhiteSpace(t))
                .Select(t => t!)
                .Distinct()
                .ToList();

            var mostFrequentReason = metrics.FirstOrDefault(m => m.ArtikelId == articleId)?.MostFrequentReason;
            if (!string.IsNullOrWhiteSpace(mostFrequentReason) &&
                !returnReasons.Contains(mostFrequentReason, StringComparer.OrdinalIgnoreCase))
            {
                returnReasons.Add(mostFrequentReason);
            }

            // Echte WAWI-Beschreibung als Grundlage für die KI - vorher wurde hier nur eine
            // frühere DescriptionProposal.CurrentText/ProposedText aus unserer eigenen DB
            // wiederverwendet, die bei der allerersten Analyse eines Artikels immer leer ist.
            // Die KI bekam dadurch nie den echten WAWI-Text zu sehen, selbst wenn eine
            // ausführliche Beschreibung existierte - Ergebnis waren inhaltsleere Vorschläge
            // ("Details zu Material, Passform ..." statt echtem Fließtext) und "Aktuelle
            // Produktbeschreibung" (das Platzhalter-Beispiel aus dem Prompt) als currentText.
            // Bevorzugt die Zeile mit dem längsten Text (meist die Haupt-/Standardsprache).
            var currentDescription = await _ctx.WawiItemDescriptions
                .Where(d => d.ArtikelId == articleId && d.ShopId == 0 && d.Beschreibung != null && d.Beschreibung != "")
                .OrderByDescending(d => d.Beschreibung!.Length)
                .Select(d => d.Beschreibung)
                .FirstOrDefaultAsync();

            // Wörtliche Kundenkommentare zur Retoure (nicht jeder Kunde schreibt einen - dann
            // bleibt die Liste einfach leer und AiService fällt auf die reinen return_reasons
            // zurück). Neueste zuerst, da die aussagekräftigsten für die aktuelle Analyse.
            // CompanyId on WawiReturn scopes multi-tenant shared WAWI DBs (same as AiRecommendations).
            var customerComments = await (
                from li in _ctx.WawiReturnLineItems
                    .Where(x => x.ItemId == articleId && x.ReturnId != null
                        && !string.IsNullOrWhiteSpace(x.ReasonComment))
                join r in _ctx.WawiReturns on li.ReturnId!.Value equals r.Id
                where r.CompanyId == companyId
                orderby r.ReturnDate descending
                select li.ReasonComment!)
                .Take(15)
                .ToListAsync();

            var aiResult = await _aiService.AnalyzeArticleAsync(
                articleInfo.Name ?? "Unbekannter Artikel",
                currentDescription,
                returnReasons,
                customerComments);

            if (!AiRecommendationContentRules.IsUsable(aiResult))
            {
                return ArticleAnalysisResult.EmptyOrInvalidAiResult();
            }

            // Antwort der KI in echte DB-Modelle umwandeln.
            var recommendation = new AiRecommendation
            {
                ArtikelId = articleId,
                CompanyId = companyId,
                AiSummaryText = aiResult!.Summary,
                ReturnRate = returnRate,
                IsFullyResolved = false,
                GeneratedCustomerCommentsJson = aiResult.CustomerComments.Count > 0
                    ? JsonSerializer.Serialize(aiResult.CustomerComments)
                    : null,
            };

            foreach (var proposal in aiResult.DescriptionProposals
                         .Where(p => !string.IsNullOrWhiteSpace(p.ProposedText)))
            {
                recommendation.DescriptionProposals.Add(new DescriptionProposal
                {
                    // Immer die echte WAWI-Beschreibung, nie das KI-Echo: der an die KI
                    // gesendete Text ist auf 500 Zeichen gekürzt (SanitizeUntrusted) und bei
                    // fehlendem Kontext hat die KI schon den Platzhalter aus dem Prompt-Beispiel
                    // ("Aktuelle Produktbeschreibung") zurückgegeben statt echten Text.
                    CurrentText = currentDescription,
                    ProposedText = proposal.ProposedText,
                    Status = AiRecommendationStatuses.DescriptionProposalPending,
                });
            }

            foreach (var action in aiResult.ActionRecommendations
                         .Where(a => !string.IsNullOrWhiteSpace(a.ActionText)))
            {
                recommendation.ActionRecommendations.Add(new ActionRecommendation
                {
                    ActionText = action.ActionText,
                    ImpactBadge = action.ImpactBadge,
                    Priority = action.Priority,
                    IsCompleted = false,
                });
            }

            _ctx.AiRecommendations.Add(recommendation);
            await _ctx.SaveChangesAsync();

            return ArticleAnalysisResult.Ok(recommendation.Id);
        }
    }
}
