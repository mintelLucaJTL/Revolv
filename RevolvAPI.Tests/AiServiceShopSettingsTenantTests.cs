using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using RevolvAPI.Data;
using RevolvAPI.Models;
using RevolvAPI.Services;

namespace RevolvAPI.Tests;

/// <summary>
/// M5: AiService must load ShopSettings for the requested company only.
/// Provider config is omitted so analysis uses the static fallback, which embeds tone of voice.
/// </summary>
public class AiServiceShopSettingsTenantTests
{
    [Fact]
    public async Task AnalyzeArticleAsync_UsesToneOfVoiceFromRequestedCompany_NotFirstRow()
    {
        await using var ctx = CreateContext();
        ctx.Companies.AddRange(
            new Company { Id = 1, Name = "Tenant A" },
            new Company { Id = 2, Name = "Tenant B" });
        ctx.ShopSettings.AddRange(
            new ShopSetting { CompanyId = 1, ToneOfVoice = "Locker" },
            new ShopSetting { CompanyId = 2, ToneOfVoice = ToneOfVoiceOptions.Default });
        await ctx.SaveChangesAsync();

        var sut = CreateSut(ctx);

        var forCompany2 = await sut.AnalyzeArticleAsync(
            "Jeans",
            null,
            ["Zu groß"],
            companyId: 2);

        Assert.NotNull(forCompany2);
        var proposed2 = forCompany2!.DescriptionProposals.Single().ProposedText;
        Assert.Contains(ToneOfVoiceOptions.Default, proposed2);
        Assert.DoesNotContain("Locker", proposed2);

        var forCompany1 = await sut.AnalyzeArticleAsync(
            "Jeans",
            null,
            ["Zu groß"],
            companyId: 1);

        Assert.NotNull(forCompany1);
        Assert.Contains("Locker", forCompany1!.DescriptionProposals.Single().ProposedText);
    }

    [Fact]
    public async Task AnalyzeArticleAsync_MissingShopSettings_UsesDefaultTone()
    {
        await using var ctx = CreateContext();
        ctx.Companies.Add(new Company { Id = 9, Name = "No settings yet" });
        ctx.ShopSettings.Add(new ShopSetting { CompanyId = 1, ToneOfVoice = "Locker" });
        await ctx.SaveChangesAsync();

        var sut = CreateSut(ctx);

        var result = await sut.AnalyzeArticleAsync(
            "Hemd",
            null,
            ["Passt nicht"],
            companyId: 9);

        Assert.NotNull(result);
        var proposed = result!.DescriptionProposals.Single().ProposedText;
        Assert.Contains(ToneOfVoiceOptions.Default, proposed);
        Assert.DoesNotContain("Locker", proposed);
    }

    private static AppDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase("AiService-M5-" + Guid.NewGuid().ToString("N"))
            .Options;
        return new AppDbContext(options);
    }

    private static AiService CreateSut(AppDbContext ctx)
    {
        var configuration = new ConfigurationBuilder().Build();
        return new AiService(new HttpClient(), configuration, ctx);
    }
}
