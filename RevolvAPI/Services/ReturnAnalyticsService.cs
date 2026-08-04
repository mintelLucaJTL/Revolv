using Microsoft.EntityFrameworkCore;
using RevolvAPI.Data;

namespace RevolvAPI.Services
{
    public class ReturnAnalyticsService : IReturnAnalyticsService
    {
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

            // Skip never-sold variant SKUs; WAWI catalogs include every size/color child.
            var relevantArticleIds = new HashSet<int>(soldByArticle.Keys);
            relevantArticleIds.UnionWith(returnedByArticle.Keys);

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
            var totalCount = await _ctx.WawiReturnLineItems.AsNoTracking().CountAsync();

            var grouped = await _ctx.WawiReturnLineItems
                .AsNoTracking()
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
            var rows = await (
                from li in _ctx.WawiReturnLineItems.AsNoTracking().Where(x => x.ReturnId != null)
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
