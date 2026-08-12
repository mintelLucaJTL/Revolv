using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using RevolvAPI.Data;
using RevolvAPI.Models;

namespace RevolvAPI.Services
{
    public class ReturnAnalyticsService : IReturnAnalyticsService
    {
        // Fallback, falls eine Firma (noch) keine ShopSettings-Zeile hat (z. B. Background-Job vor
        // dem ersten Besuch der Settings-Seite) - identisch zu ShopSetting-Modell-Defaults.
        private const int DefaultMinNewReturnsForReanalyze = 3;
        private const decimal DefaultSignificantReasonShiftPercentagePoints = 15m;

        private readonly AppDbContext _ctx;

        public ReturnAnalyticsService(AppDbContext ctx)
        {
            _ctx = ctx;
        }

        public async Task<List<ArticleReturnMetric>> GetArticleReturnMetricsAsync()
        {
            var lineItemAgg = await _ctx.WawiReturnLineItems
                .AsNoTracking()
                .Where(li => li.ItemId != null)
                .GroupBy(li => new { ArtikelId = li.ItemId!.Value, li.ReturnReasonId })
                .Select(g => new
                {
                    g.Key.ArtikelId,
                    g.Key.ReturnReasonId,
                    Quantity = g.Sum(x => x.Quantity),
                    Count = g.Count()
                })
                .ToListAsync();

            var returnedByArticle = lineItemAgg
                .GroupBy(x => x.ArtikelId)
                .ToDictionary(g => g.Key, g => g.Sum(x => x.Quantity));

            var mostFrequentReasonIdByArticle = lineItemAgg
                .Where(x => x.ReturnReasonId.HasValue)
                .GroupBy(x => x.ArtikelId)
                .ToDictionary(g => g.Key, g => g.OrderByDescending(x => x.Count).First().ReturnReasonId!.Value);

            var soldAgg = await _ctx.WawiSalesInvoiceLineItems
                .AsNoTracking()
                .Where(si => si.ItemId != null)
                .GroupBy(si => si.ItemId!.Value)
                .Select(g => new { ArtikelId = g.Key, Quantity = g.Sum(x => x.Quantity) })
                .ToListAsync();
            var soldByArticle = soldAgg.ToDictionary(x => x.ArtikelId, x => x.Quantity);

            // Ticket #288: nie verkaufte Artikel dürfen nirgends auftauchen - sie hätten sonst
            // (mangels Verkäufen) eine irreführende 0%-Retourenquote, obwohl sie ggf. sogar
            // Retouren haben (Datenanomalie/Testware). WAWI-Kataloge enthalten außerdem jedes
            // Größen-/Farb-Kind als eigenes SKU, auch wenn es nie verkauft wurde.
            var relevantArticleIds = new HashSet<int>(soldByArticle.Keys);

            var items = await _ctx.WawiItems
                .AsNoTracking()
                .Where(i => i.IsActive && relevantArticleIds.Contains(i.Id))
                .ToListAsync();

            // ShopId=0 = master description; pick first platform/language deterministically.
            var descriptions = await _ctx.WawiItemDescriptions
                .AsNoTracking()
                .Where(d => d.ShopId == 0)
                .ToListAsync();
            var nameByArticle = descriptions
                .GroupBy(d => d.ArtikelId)
                .ToDictionary(g => g.Key, g => g.OrderBy(d => d.PlattformId).ThenBy(d => d.SpracheId).First().Name);

            var productGroups = await _ctx.WawiProductGroups.AsNoTracking().ToListAsync();
            var categoryById = productGroups.ToDictionary(p => p.Id, p => p.Name);

            var reasonNameById = await GetReasonNamesByIdAsync(mostFrequentReasonIdByArticle.Values);

            return items.Select(item =>
            {
                var returnedQty = returnedByArticle.GetValueOrDefault(item.Id);
                var soldQty = soldByArticle.GetValueOrDefault(item.Id);
                var rate = soldQty > 0 ? Math.Round(returnedQty / soldQty * 100m, 2) : 0m;
                var category = item.ProductGroupId.HasValue
                    ? categoryById.GetValueOrDefault(item.ProductGroupId.Value)
                    : null;
                var mostFrequentReason = mostFrequentReasonIdByArticle.TryGetValue(item.Id, out var reasonId)
                    ? reasonNameById.GetValueOrDefault(reasonId)
                    : null;

                return new ArticleReturnMetric(
                    item.Id,
                    item.Sku ?? string.Empty,
                    nameByArticle.GetValueOrDefault(item.Id),
                    category,
                    returnedQty,
                    soldQty,
                    rate,
                    mostFrequentReason);
            }).ToList();
        }

        public async Task<List<ReturnReasonBreakdownItem>> GetReturnReasonBreakdownAsync(int top = 5)
        {
            // Ticket #288: Retouren zu nie verkauften Artikeln dürfen auch hier nicht einfließen.
            var soldLineItems = _ctx.WawiReturnLineItems
                .AsNoTracking()
                .Where(li => li.ItemId != null && _ctx.WawiSalesInvoiceLineItems.Any(si => si.ItemId == li.ItemId));

            var totalCount = await soldLineItems.CountAsync();

            var grouped = await soldLineItems
                .Where(li => li.ReturnReasonId != null)
                .GroupBy(li => li.ReturnReasonId!.Value)
                .Select(g => new { ReasonId = g.Key, Count = g.Count() })
                .OrderByDescending(x => x.Count)
                .Take(top)
                .ToListAsync();

            var nameByReason = await GetReasonNamesByIdAsync(grouped.Select(g => g.ReasonId));

            return grouped
                .Select(g => new ReturnReasonBreakdownItem(
                    g.ReasonId,
                    nameByReason.GetValueOrDefault(g.ReasonId, "Unbekannt"),
                    g.Count,
                    totalCount > 0 ? Math.Round((decimal)g.Count * 100m / totalCount, 2) : 0m))
                .ToList();
        }

        public async Task<List<LatestReturnItem>> GetLatestReturnsAsync(int take = 5)
        {
            // Ticket #288: nie verkaufte Artikel gehören nicht in die Live-Retourentabelle.
            var rows = await (
                from li in _ctx.WawiReturnLineItems.AsNoTracking()
                    .Where(x => x.ReturnId != null && x.ItemId != null
                        && _ctx.WawiSalesInvoiceLineItems.Any(si => si.ItemId == x.ItemId))
                join r in _ctx.WawiReturns.AsNoTracking() on li.ReturnId!.Value equals r.Id
                orderby r.ReturnDate descending
                select new { LineItem = li, Return = r })
                .Take(take)
                .ToListAsync();

            var reasonIds = rows
                .Where(x => x.LineItem.ReturnReasonId.HasValue)
                .Select(x => x.LineItem.ReturnReasonId!.Value);
            var nameByReason = await GetReasonNamesByIdAsync(reasonIds);

            return rows.Select(x => new LatestReturnItem(
                x.LineItem.Id,
                x.LineItem.Sku ?? string.Empty,
                x.LineItem.Name,
                x.LineItem.ReturnReasonId.HasValue
                    ? nameByReason.GetValueOrDefault(x.LineItem.ReturnReasonId.Value, "Unbekannt")
                    : "Unbekannt",
                x.Return.ReturnDate)).ToList();
        }

        public async Task<List<TopReturnedArticle>> GetTopReturnedArticlesAsync(int take = 5)
        {
            var metrics = await GetArticleReturnMetricsAsync();

            return metrics
                .Where(m => m.ReturnedQuantity > 0)
                .OrderByDescending(m => m.ReturnRatePercent)
                .Take(take)
                .Select(m => new TopReturnedArticle(m.Sku, m.Name, m.ReturnRatePercent))
                .ToList();
        }

        // Kalendermonat-Fenster endend im aktuellen Monat, `months` Monate lang (inkl. aktuellem
        // Monat) - gemeinsam von GetMonthlyReturnCostsAsync und GetArticleSuccessTrendsAsync
        // genutzt, damit beide dieselbe Definition von "die letzten n Monate" haben.
        private static DateTimeOffset GetTrailingRangeStart(int months)
        {
            var now = DateTimeOffset.UtcNow;
            var currentMonthStart = new DateTimeOffset(now.Year, now.Month, 1, 0, 0, 0, TimeSpan.Zero);
            return currentMonthStart.AddMonths(-(months - 1));
        }

        public async Task<List<MonthlyReturnCost>> GetMonthlyReturnCostsAsync(int months)
        {
            months = Math.Clamp(months, 1, 24);
            var rangeStart = GetTrailingRangeStart(months);

            var returnRows = await (
                from li in _ctx.WawiReturnLineItems.AsNoTracking().Where(x => x.ItemId != null && x.ReturnId != null)
                join r in _ctx.WawiReturns.AsNoTracking() on li.ReturnId!.Value equals r.Id
                where r.ReturnDate >= rangeStart
                select new { ItemId = li.ItemId!.Value, li.Quantity, r.ReturnDate })
                .ToListAsync();

            var priceByItem = await GetAverageSalesPriceByItemAsync(returnRows.Select(x => x.ItemId).Distinct());

            var totalByMonth = returnRows
                .GroupBy(x => new DateOnly(x.ReturnDate.Year, x.ReturnDate.Month, 1))
                .ToDictionary(
                    g => g.Key,
                    g => g.Sum(x => x.Quantity * priceByItem.GetValueOrDefault(x.ItemId, 0m)));

            // Immer genau `months` Einträge zurückgeben (auch mit 0), damit der Dashboard-Chart
            // eine lückenlose Zeitreihe bekommt statt einzelner fehlender Monate.
            var result = new List<MonthlyReturnCost>(months);
            for (var i = 0; i < months; i++)
            {
                var monthStart = DateOnly.FromDateTime(rangeStart.AddMonths(i).Date);
                result.Add(new MonthlyReturnCost(monthStart, Math.Round(totalByMonth.GetValueOrDefault(monthStart, 0m), 2)));
            }

            return result;
        }

        // Es gibt keine direkte Verknüpfung zwischen einer Retoure und der ursprünglichen
        // Rechnungsposition - daher der durchschnittliche tatsächlich in Rechnung gestellte
        // Netto-Preis (SalesInvoiceLineItems) je Artikel, ersatzweise der aktuelle Katalogpreis
        // (z. B. bei Retouren zu Artikeln ohne erfasste Verkäufe).
        private async Task<Dictionary<int, decimal>> GetAverageSalesPriceByItemAsync(IEnumerable<int> itemIds)
        {
            var ids = itemIds.ToList();
            if (ids.Count == 0) return new Dictionary<int, decimal>();

            var invoicePrices = await _ctx.WawiSalesInvoiceLineItems
                .AsNoTracking()
                .Where(si => si.ItemId != null && ids.Contains(si.ItemId.Value))
                .GroupBy(si => si.ItemId!.Value)
                .Select(g => new { ItemId = g.Key, AveragePrice = g.Average(x => x.SalesPriceNet) })
                .ToListAsync();

            var priceByItem = invoicePrices.ToDictionary(x => x.ItemId, x => x.AveragePrice);

            var missingIds = ids.Except(priceByItem.Keys).ToList();
            if (missingIds.Count > 0)
            {
                var catalogPrices = await _ctx.WawiItems
                    .AsNoTracking()
                    .Where(i => missingIds.Contains(i.Id))
                    .Select(i => new { i.Id, i.SalesPriceNet })
                    .ToListAsync();

                foreach (var item in catalogPrices)
                {
                    priceByItem[item.Id] = item.SalesPriceNet;
                }
            }

            return priceByItem;
        }

        public async Task<Dictionary<int, ArticleDisplayInfo>> GetArticleDisplayInfoAsync(IEnumerable<int> artikelIds)
        {
            var ids = artikelIds.Distinct().ToList();
            if (ids.Count == 0) return new Dictionary<int, ArticleDisplayInfo>();

            var items = await _ctx.WawiItems.AsNoTracking().Where(i => ids.Contains(i.Id)).ToListAsync();

            var descriptions = await _ctx.WawiItemDescriptions
                .AsNoTracking()
                .Where(d => d.ShopId == 0 && ids.Contains(d.ArtikelId))
                .ToListAsync();
            var nameByArticle = descriptions
                .GroupBy(d => d.ArtikelId)
                .ToDictionary(g => g.Key, g => g.OrderBy(d => d.PlattformId).ThenBy(d => d.SpracheId).First().Name);

            var productGroupIds = items
                .Where(i => i.ProductGroupId.HasValue)
                .Select(i => i.ProductGroupId!.Value)
                .Distinct()
                .ToList();
            var productGroups = await _ctx.WawiProductGroups
                .AsNoTracking()
                .Where(p => productGroupIds.Contains(p.Id))
                .ToListAsync();
            var categoryById = productGroups.ToDictionary(p => p.Id, p => p.Name);

            return items.ToDictionary(i => i.Id, i => new ArticleDisplayInfo(
                i.Id,
                i.Sku ?? string.Empty,
                nameByArticle.GetValueOrDefault(i.Id),
                i.ProductGroupId.HasValue ? categoryById.GetValueOrDefault(i.ProductGroupId.Value) : null));
        }

        public async Task<List<ArticleSuccessTrend>> GetArticleSuccessTrendsAsync(int companyId, int months = 8)
        {
            months = Math.Clamp(months, 3, 24);

            var aiRows = await _ctx.AiRecommendations
                .AsNoTracking()
                .Include(r => r.QualityIssues)
                .Include(r => r.DescriptionProposals)
                .Include(r => r.ActionRecommendations)
                .Where(r => r.CompanyId == companyId)
                .ToListAsync();

            // Frühester angenommener/erledigter Zeitpunkt je Artikel über ALLE (auch ältere)
            // Analysen - das markiert, wann zum ersten Mal wirklich etwas am Artikel geändert
            // wurde, unabhängig davon, ob später noch eine neuere Analyse angelegt wurde.
            var changeByArticle = new Dictionary<int, (DateTime At, string Label)>();

            void Consider(int articleId, DateTime? at, string label)
            {
                if (at == null) return;
                if (!changeByArticle.TryGetValue(articleId, out var existing) || at.Value < existing.At)
                {
                    changeByArticle[articleId] = (at.Value, label);
                }
            }

            foreach (var rec in aiRows)
            {
                foreach (var p in rec.DescriptionProposals)
                    Consider(rec.ArtikelId, p.AcceptedAt, "Beschreibung angepasst");

                foreach (var q in rec.QualityIssues)
                    Consider(rec.ArtikelId, q.ResolvedAt, q.IssueText);

                foreach (var a in rec.ActionRecommendations)
                    Consider(rec.ArtikelId, a.CompletedAt, a.ActionText);
            }

            if (changeByArticle.Count == 0) return new List<ArticleSuccessTrend>();

            var articleIds = changeByArticle.Keys.ToList();

            // Fixes Fenster endend im aktuellen Monat (wie GetMonthlyReturnCostsAsync) - ein
            // Artikel, dessen Änderung älter als `months` Monate zurückliegt, zeigt dann nur noch
            // den "nachher"-Teil ohne "vorher"-Vergleich (Frontend zeigt dafür "–" statt eines
            // irreführenden 0%-Werts). Akzeptierter Trade-off fürs erste Release statt eines pro-
            // Artikel unterschiedlich breiten Fensters.
            var rangeStart = GetTrailingRangeStart(months);

            var returnRows = await (
                from li in _ctx.WawiReturnLineItems.AsNoTracking()
                    .Where(x => x.ItemId != null && x.ReturnId != null && articleIds.Contains(x.ItemId!.Value))
                join r in _ctx.WawiReturns.AsNoTracking() on li.ReturnId!.Value equals r.Id
                where r.ReturnDate >= rangeStart
                select new { ItemId = li.ItemId!.Value, li.Quantity, r.ReturnDate })
                .ToListAsync();

            var soldRows = await (
                from si in _ctx.WawiSalesInvoiceLineItems.AsNoTracking()
                    .Where(x => x.ItemId != null && articleIds.Contains(x.ItemId!.Value))
                join inv in _ctx.WawiSalesInvoices.AsNoTracking() on si.SalesInvoiceId equals inv.Id
                where inv.ValueDate >= rangeStart
                select new { ItemId = si.ItemId!.Value, si.Quantity, inv.ValueDate })
                .ToListAsync();

            var returnedByArticleMonth = returnRows
                .GroupBy(x => (x.ItemId, Month: new DateOnly(x.ReturnDate.Year, x.ReturnDate.Month, 1)))
                .ToDictionary(g => g.Key, g => g.Sum(x => x.Quantity));

            var soldByArticleMonth = soldRows
                .GroupBy(x => (x.ItemId, Month: new DateOnly(x.ValueDate.Year, x.ValueDate.Month, 1)))
                .ToDictionary(g => g.Key, g => g.Sum(x => x.Quantity));

            var displayInfo = await GetArticleDisplayInfoAsync(articleIds);

            var result = new List<ArticleSuccessTrend>();
            foreach (var articleId in articleIds)
            {
                var info = displayInfo.GetValueOrDefault(articleId);
                // Artikel ohne Katalogdaten (z. B. inzwischen gelöscht/deaktiviert) überspringen -
                // ohne Name/Sku kein sinnvoller Chart.
                if (info == null) continue;

                var points = new List<MonthlyReturnRatePoint>(months);
                for (var i = 0; i < months; i++)
                {
                    var month = DateOnly.FromDateTime(rangeStart.AddMonths(i).Date);
                    var sold = soldByArticleMonth.GetValueOrDefault((articleId, month));
                    var returned = returnedByArticleMonth.GetValueOrDefault((articleId, month));
                    var rate = sold > 0 ? Math.Round(returned / sold * 100m, 2) : 0m;
                    points.Add(new MonthlyReturnRatePoint(month, rate));
                }

                var (changeAt, changeLabel) = changeByArticle[articleId];
                result.Add(new ArticleSuccessTrend(
                    articleId,
                    info.Sku,
                    info.Name,
                    new DateOnly(changeAt.Year, changeAt.Month, 1),
                    changeLabel,
                    points));
            }

            return result.OrderByDescending(r => r.ChangeMonth).ToList();
        }

        public async Task<ReanalyzeGate> GetReanalyzeGateAsync(int articleId, int companyId)
        {
            // Nur die eigene Firma darf die Sperre eines Artikels beeinflussen/sehen - Company-
            // Scoping ueber DescriptionProposal -> AiRecommendation, da DescriptionPushLog selbst
            // keine CompanyId traegt.
            var lastPush = await _ctx.DescriptionPushLogs
                .AsNoTracking()
                .Where(l => l.ArtikelId == articleId
                    && l.Status == DescriptionPushLogStatuses.Success
                    && l.DescriptionProposal!.AiRecommendation!.CompanyId == companyId)
                .OrderByDescending(l => l.PushedAt)
                .FirstOrDefaultAsync();

            // Noch nie live uebernommen -> keine Sperre, die erste Analyse ist immer erlaubt.
            if (lastPush == null)
            {
                return new ReanalyzeGate(CanReanalyze: true, LastRevisedAt: null, BlockedReason: null);
            }

            // Pro Firma einstellbar (Settings-Seite, "Re-Analyse-Sperre") - Fallback auf die
            // Standardwerte, falls die Firma noch keine ShopSettings-Zeile hat.
            var shopSettings = await _ctx.ShopSettings
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.CompanyId == companyId);
            var minNewReturns = shopSettings?.MinNewReturnsForReanalyze ?? DefaultMinNewReturnsForReanalyze;
            var significantShiftThreshold = shopSettings?.SignificantReasonShiftPercentagePoints
                ?? DefaultSignificantReasonShiftPercentagePoints;

            var newReturnsCount = await (
                from li in _ctx.WawiReturnLineItems.AsNoTracking()
                    .Where(x => x.ItemId == articleId && x.ReturnId != null)
                join r in _ctx.WawiReturns.AsNoTracking() on li.ReturnId!.Value equals r.Id
                where r.ReturnDate > lastPush.PushedAt
                select li.Id)
                .CountAsync();

            const string notEnoughDataMessage =
                "Die Gewichtung der Retourengründe hat sich seit der letzten Überarbeitung noch " +
                "nicht ausreichend verändert für eine neue Analyse.";

            if (newReturnsCount < minNewReturns)
            {
                return new ReanalyzeGate(false, lastPush.PushedAt, notEnoughDataMessage);
            }

            var snapshotCounts = string.IsNullOrWhiteSpace(lastPush.ReturnReasonSnapshotJson)
                ? new Dictionary<string, int>()
                : JsonSerializer.Deserialize<Dictionary<string, int>>(lastPush.ReturnReasonSnapshotJson)
                    ?? new Dictionary<string, int>();
            var snapshotTotal = lastPush.ReturnLineItemCountAtPush;

            var currentCounts = await _ctx.WawiReturnLineItems
                .AsNoTracking()
                .Where(li => li.ItemId == articleId)
                .GroupBy(li => li.ReturnReasonId)
                .Select(g => new { ReasonId = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.ReasonId?.ToString() ?? "null", x => x.Count);
            var currentTotal = currentCounts.Values.Sum();

            var allReasonKeys = snapshotCounts.Keys.Union(currentCounts.Keys);
            var maxShift = 0m;
            foreach (var reasonKey in allReasonKeys)
            {
                var beforeShare = snapshotTotal > 0
                    ? (decimal)snapshotCounts.GetValueOrDefault(reasonKey) / snapshotTotal * 100m
                    : 0m;
                var afterShare = currentTotal > 0
                    ? (decimal)currentCounts.GetValueOrDefault(reasonKey) / currentTotal * 100m
                    : 0m;
                maxShift = Math.Max(maxShift, Math.Abs(afterShare - beforeShare));
            }

            if (maxShift < significantShiftThreshold)
            {
                return new ReanalyzeGate(false, lastPush.PushedAt, notEnoughDataMessage);
            }

            return new ReanalyzeGate(true, lastPush.PushedAt, null);
        }

        // First translation by LanguageId (fine for single-language tenants).
        private async Task<Dictionary<int, string>> GetReasonNamesByIdAsync(IEnumerable<int> reasonIds)
        {
            var ids = reasonIds.Distinct().ToList();
            if (ids.Count == 0) return new Dictionary<int, string>();

            var translations = await _ctx.WawiReturnReasonTranslations
                .AsNoTracking()
                .Where(t => ids.Contains(t.ReturnReasonId))
                .ToListAsync();

            return translations
                .GroupBy(t => t.ReturnReasonId)
                .ToDictionary(g => g.Key, g => g.OrderBy(t => t.LanguageId).First().Name ?? "Unbekannt");
        }
    }
}
