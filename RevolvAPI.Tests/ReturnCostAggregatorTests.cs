using RevolvAPI.Services;

namespace RevolvAPI.Tests;

public class ReturnCostAggregatorTests
{
    private static readonly DateOnly Jan = new(2026, 1, 1);
    private static readonly DateOnly Feb = new(2026, 2, 1);
    private static readonly DateOnly Mar = new(2026, 3, 1);

    [Fact]
    public void Aggregate_SumsQuantityTimesPricePerMonth()
    {
        var lines = new List<ReturnCostLine>
        {
            new(ItemId: 1, Quantity: 2, ReturnMonth: Jan),
            new(ItemId: 2, Quantity: 1, ReturnMonth: Jan),
        };
        var prices = new Dictionary<int, decimal> { [1] = 10.00m, [2] = 5.00m };

        var result = ReturnCostAggregator.Aggregate(lines, prices, new HashSet<int>(), Jan, months: 1);

        Assert.Single(result);
        Assert.Equal(25.00m, result[0].TotalCost); // 2*10 + 1*5
    }

    [Fact]
    public void Aggregate_MonthWithoutReturns_IsZeroNotMissing()
    {
        var lines = new List<ReturnCostLine> { new(1, 3, Jan) };
        var prices = new Dictionary<int, decimal> { [1] = 9.99m };

        var result = ReturnCostAggregator.Aggregate(lines, prices, new HashSet<int>(), Jan, months: 3);

        Assert.Equal(3, result.Count);
        Assert.Equal(Jan, result[0].Month);
        Assert.Equal(Feb, result[1].Month);
        Assert.Equal(Mar, result[2].Month);
        Assert.Equal(29.97m, result[0].TotalCost);
        Assert.Equal(0m, result[1].TotalCost);
        Assert.Equal(0m, result[2].TotalCost);
    }

    [Fact]
    public void Aggregate_NoLinesAtAll_ReturnsAllZeroMonths()
    {
        var result = ReturnCostAggregator.Aggregate(
            Enumerable.Empty<ReturnCostLine>(), new Dictionary<int, decimal>(), new HashSet<int>(), Jan, months: 2);

        Assert.Equal(2, result.Count);
        Assert.All(result, m => Assert.Equal(0m, m.TotalCost));
        Assert.All(result, m => Assert.False(m.IsEstimated));
    }

    [Theory]
    [InlineData(3, 1.005, 3.02)] // 3 * 1.005 = 3.015 -> banker's rounding to 3.02
    [InlineData(2, 4.994, 9.99)] // 2 * 4.994 = 9.988 -> rounds down to 9.99
    public void Aggregate_RoundsMonthlyTotalToTwoDecimals(decimal quantity, decimal price, decimal expected)
    {
        var lines = new List<ReturnCostLine> { new(1, quantity, Jan) };
        var prices = new Dictionary<int, decimal> { [1] = price };

        var result = ReturnCostAggregator.Aggregate(lines, prices, new HashSet<int>(), Jan, months: 1);

        Assert.Equal(expected, result[0].TotalCost);
    }

    [Fact]
    public void Aggregate_ItemWithoutPrice_ContributesZeroInsteadOfThrowing()
    {
        var lines = new List<ReturnCostLine> { new(ItemId: 99, Quantity: 5, Jan) };

        var result = ReturnCostAggregator.Aggregate(
            lines, new Dictionary<int, decimal>(), new HashSet<int>(), Jan, months: 1);

        Assert.Equal(0m, result[0].TotalCost);
    }

    [Fact]
    public void Aggregate_MonthWithEstimatedItem_IsFlaggedEstimated()
    {
        var lines = new List<ReturnCostLine>
        {
            new(ItemId: 1, Quantity: 1, Jan), // real invoice price
            new(ItemId: 2, Quantity: 1, Jan), // catalog-price fallback
        };
        var prices = new Dictionary<int, decimal> { [1] = 10m, [2] = 8m };
        var estimated = new HashSet<int> { 2 };

        var result = ReturnCostAggregator.Aggregate(lines, prices, estimated, Jan, months: 1);

        Assert.True(result[0].IsEstimated);
    }

    [Fact]
    public void Aggregate_MonthWithOnlyRealPrices_IsNotFlaggedEstimated()
    {
        var lines = new List<ReturnCostLine> { new(1, 1, Jan) };
        var prices = new Dictionary<int, decimal> { [1] = 10m };

        var result = ReturnCostAggregator.Aggregate(lines, prices, new HashSet<int>(), Jan, months: 1);

        Assert.False(result[0].IsEstimated);
    }

    [Fact]
    public void Aggregate_MonthWithoutAnyReturns_IsNotFlaggedEstimated()
    {
        var result = ReturnCostAggregator.Aggregate(
            Enumerable.Empty<ReturnCostLine>(),
            new Dictionary<int, decimal>(),
            new HashSet<int> { 1 },
            Jan,
            months: 1);

        Assert.False(result[0].IsEstimated);
    }

    [Fact]
    public void Aggregate_AlwaysReturnsExactlyMonthsCount_AcrossYearBoundary()
    {
        var result = ReturnCostAggregator.Aggregate(
            Enumerable.Empty<ReturnCostLine>(), new Dictionary<int, decimal>(), new HashSet<int>(),
            rangeStart: new DateOnly(2025, 12, 1), months: 3);

        Assert.Equal(
            new[] { new DateOnly(2025, 12, 1), new DateOnly(2026, 1, 1), new DateOnly(2026, 2, 1) },
            result.Select(m => m.Month));
    }
}
