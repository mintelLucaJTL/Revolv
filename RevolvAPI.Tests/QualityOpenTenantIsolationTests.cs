using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Microsoft.Extensions.DependencyInjection;
using RevolvAPI.Data;
using RevolvAPI.DTOs;
using RevolvAPI.Models;
using RevolvAPI.Services;

namespace RevolvAPI.Tests;

/// <summary>
/// H2: GET /api/quality/open must not return another tenant's quality issues.
/// </summary>
public class QualityOpenTenantIsolationTests : IClassFixture<SecurityWebApplicationFactory>
{
    private readonly SecurityWebApplicationFactory _factory;

    public QualityOpenTenantIsolationTests(SecurityWebApplicationFactory factory)
    {
        _factory = factory;
        SeedCrossTenantIssues();
    }

    [Fact]
    public async Task Open_list_returns_only_authenticated_company_issues()
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", _factory.CreateAccessToken(userId: 11, companyId: 11));

        var response = await client.GetAsync("/api/quality/open");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var issues = await response.Content.ReadFromJsonAsync<List<QualityIssueOpenDto>>();
        Assert.NotNull(issues);
        Assert.Single(issues);
        Assert.Equal(1101, issues[0].Id);
        Assert.Equal("own-open", issues[0].IssueText);
        Assert.DoesNotContain(issues, q => q.Id == 2201);
        Assert.DoesNotContain(issues, q => q.IssueText == "other-tenant-open");
        Assert.DoesNotContain(issues, q => q.Id == 1102);
    }

    [Fact]
    public async Task Open_list_for_other_company_does_not_include_first_tenant()
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", _factory.CreateAccessToken(userId: 22, companyId: 22));

        var response = await client.GetAsync("/api/quality/open");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var issues = await response.Content.ReadFromJsonAsync<List<QualityIssueOpenDto>>();
        Assert.NotNull(issues);
        Assert.Single(issues);
        Assert.Equal(2201, issues[0].Id);
        Assert.DoesNotContain(issues, q => q.Id == 1101);
    }

    private void SeedCrossTenantIssues()
    {
        using var scope = _factory.Services.CreateScope();
        var ctx = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        if (ctx.QualityIssues.Any(q => q.Id == 1101))
        {
            return;
        }

        ctx.Companies.AddRange(
            new Company { Id = 11, Name = "Tenant A" },
            new Company { Id = 22, Name = "Tenant B" });

        ctx.AiRecommendations.AddRange(
            new AiRecommendation { Id = 111, ArtikelId = 501, CompanyId = 11 },
            new AiRecommendation { Id = 222, ArtikelId = 502, CompanyId = 22 });

        ctx.QualityIssues.AddRange(
            new QualityIssue
            {
                Id = 1101,
                AiRecommendationId = 111,
                IssueText = "own-open",
                Status = AiRecommendationStatuses.QualityIssuePending
            },
            new QualityIssue
            {
                Id = 1102,
                AiRecommendationId = 111,
                IssueText = "own-resolved",
                Status = AiRecommendationStatuses.QualityIssueResolved
            },
            new QualityIssue
            {
                Id = 2201,
                AiRecommendationId = 222,
                IssueText = "other-tenant-open",
                Status = AiRecommendationStatuses.QualityIssuePending
            });

        ctx.SaveChanges();
    }
}
