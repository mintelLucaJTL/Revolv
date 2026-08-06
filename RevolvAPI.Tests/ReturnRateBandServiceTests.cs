using RevolvAPI.Services;

namespace RevolvAPI.Tests;

public class ReturnRateBandServiceTests
{
    private const decimal Yellow = 10m;
    private const decimal Red = 25m;

    [Theory]
    [InlineData(25.01, "red")]
    [InlineData(40, "red")]
    [InlineData(100, "red")]
    public void ToBand_RatesAboveRedThreshold_AreRed(decimal rate, string expected)
    {
        Assert.Equal(expected, ReturnRateBandRules.ToBand(rate, Yellow, Red));
    }

    [Theory]
    [InlineData(10, "yellow")]
    [InlineData(18.2, "yellow")]
    [InlineData(25, "yellow")]
    public void ToBand_RatesBetweenThresholdsInclusive_AreYellow(decimal rate, string expected)
    {
        Assert.Equal(expected, ReturnRateBandRules.ToBand(rate, Yellow, Red));
    }

    [Theory]
    [InlineData(0.01, "green")]
    [InlineData(4.1, "green")]
    [InlineData(9.99, "green")]
    public void ToBand_PositiveRatesBelowYellowThreshold_AreGreen(decimal rate, string expected)
    {
        Assert.Equal(expected, ReturnRateBandRules.ToBand(rate, Yellow, Red));
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public void ToBand_ZeroOrNegativeRate_IsNone(decimal rate)
    {
        Assert.Equal("none", ReturnRateBandRules.ToBand(rate, Yellow, Red));
    }

    [Fact]
    public void ToBand_NullRate_IsNone()
    {
        Assert.Equal("none", ReturnRateBandRules.ToBand(null, Yellow, Red));
    }

    [Theory]
    [InlineData(25, "red", false)]
    [InlineData(25.01, "red", true)]
    [InlineData(10, "yellow", true)]
    [InlineData(9.99, "yellow", false)]
    [InlineData(9.99, "green", true)]
    [InlineData(10, "green", false)]
    [InlineData(0, "green", false)]
    public void IsInBand_RespectsInclusiveYellowAndExclusiveRedBoundary(
        decimal rate,
        string band,
        bool expected)
    {
        Assert.Equal(expected, ReturnRateBandRules.IsInBand(rate, band, Yellow, Red));
    }

    [Fact]
    public void Classify_MapsBandsToLegacyHighMediumLowAndNone()
    {
        Assert.Equal("high", ReturnRateBandRules.Classify(30m, Yellow, Red));
        Assert.Equal("medium", ReturnRateBandRules.Classify(25m, Yellow, Red));
        Assert.Equal("low", ReturnRateBandRules.Classify(5m, Yellow, Red));
        Assert.Equal("none", ReturnRateBandRules.Classify(0m, Yellow, Red));
        Assert.Equal("none", ReturnRateBandRules.Classify(null, Yellow, Red));
    }
}
