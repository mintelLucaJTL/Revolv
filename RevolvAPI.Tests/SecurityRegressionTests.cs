using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.IdentityModel.Tokens;
using RevolvAPI.Data;
using RevolvAPI.Services;

namespace RevolvAPI.Tests;

/// <summary>
/// Host factory for #244 security ACs: JWT + FallbackPolicy, CORS.
/// Uses InMemory EF and a stub analytics service so auth/CORS checks do not need SQL Server.
/// </summary>
public sealed class SecurityWebApplicationFactory : WebApplicationFactory<Program>
{
    public const string JwtKey = "test-jwt-key-at-least-32-characters-long!";
    public const string JwtIssuer = "RevolvSecurityTests";
    public const string AllowedOrigin = "http://localhost:5173";
    public const string DeniedOrigin = "https://evil.example";

    private readonly string _environment;
    private readonly string _dbName = "SecurityTests-" + Guid.NewGuid().ToString("N");

    public SecurityWebApplicationFactory()
        : this("Development")
    {
    }

    private SecurityWebApplicationFactory(string environment)
    {
        _environment = environment;
    }

    public static SecurityWebApplicationFactory CreateProduction() => new("Production");

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment(_environment);

        builder.ConfigureAppConfiguration((_, config) =>
        {
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:Key"] = JwtKey,
                ["Jwt:Issuer"] = JwtIssuer,
                ["Jwt:AccessTokenMinutes"] = "5",
                ["Cors:AllowedOrigins:0"] = AllowedOrigin,
                // Unused by InMemory DbContext; keeps DatabaseSetup from using a null connection string.
                ["ConnectionStrings:WawiConnection"] =
                    "Server=(localdb)\\mssqllocaldb;Database=RevolvSecurityUnused;Trusted_Connection=True;TrustServerCertificate=True"
            });
        });

        builder.ConfigureTestServices(services =>
        {
            // EF Core 8+ keeps IDbContextOptionsConfiguration registrations; removing only
            // DbContextOptions is not enough and leaves SQL Server wired for the test host.
            foreach (var descriptor in services
                         .Where(d => d.ServiceType == typeof(IDbContextOptionsConfiguration<AppDbContext>)
                                     || d.ServiceType == typeof(DbContextOptions<AppDbContext>)
                                     || d.ServiceType == typeof(AppDbContext))
                         .ToList())
            {
                services.Remove(descriptor);
            }

            services.AddDbContext<AppDbContext>(options =>
                options.UseInMemoryDatabase(_dbName));

            services.RemoveAll(typeof(IReturnAnalyticsService));
            services.AddSingleton<IReturnAnalyticsService, StubReturnAnalyticsService>();

            // Avoid background work during short-lived test hosts.
            services.RemoveAll(typeof(Microsoft.Extensions.Hosting.IHostedService));
        });
    }

    public string CreateAccessToken(
        int userId = 1,
        int companyId = 1,
        string role = "Admin",
        string email = "tester@example.com")
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(JwtKey));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
            new Claim(ClaimTypes.Email, email),
            new Claim(ClaimTypes.Role, role),
            new Claim("CompanyId", companyId.ToString())
        };

        var token = new JwtSecurityToken(
            issuer: JwtIssuer,
            audience: JwtIssuer,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(5),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private sealed class StubReturnAnalyticsService : IReturnAnalyticsService
    {
        public Task<List<ArticleReturnMetric>> GetArticleReturnMetricsAsync() =>
            Task.FromResult(new List<ArticleReturnMetric>());

        public Task<List<ReturnReasonBreakdownItem>> GetReturnReasonBreakdownAsync(int top = 5) =>
            Task.FromResult(new List<ReturnReasonBreakdownItem>());

        public Task<List<LatestReturnItem>> GetLatestReturnsAsync(int take = 5) =>
            Task.FromResult(new List<LatestReturnItem>());

        public Task<List<TopReturnedArticle>> GetTopReturnedArticlesAsync(int take = 5) =>
            Task.FromResult(new List<TopReturnedArticle>());

        public Task<List<MonthlyReturnCost>> GetMonthlyReturnCostsAsync(int months) =>
            Task.FromResult(new List<MonthlyReturnCost>());

        public Task<Dictionary<int, ArticleDisplayInfo>> GetArticleDisplayInfoAsync(IEnumerable<int> artikelIds) =>
            Task.FromResult(new Dictionary<int, ArticleDisplayInfo>());

        public Task<List<ActionPlanItem>> GetActionPlanAsync(int companyId) =>
            Task.FromResult(new List<ActionPlanItem>());
    }
}

public class SecurityRegressionTests : IClassFixture<SecurityWebApplicationFactory>
{
    private readonly SecurityWebApplicationFactory _factory;

    public SecurityRegressionTests(SecurityWebApplicationFactory factory)
    {
        _factory = factory;
    }

    public static TheoryData<string> ProtectedGetPaths => new()
    {
        "/api/dashboard/kpi",
        "/api/articles",
        "/api/settings",
        "/api/ai/recommendations"
    };

    [Theory]
    [MemberData(nameof(ProtectedGetPaths))]
    public async Task Protected_endpoints_return_401_without_token(string path)
    {
        var client = _factory.CreateClient();
        var response = await client.GetAsync(path);
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Theory]
    [MemberData(nameof(ProtectedGetPaths))]
    public async Task Protected_endpoints_return_200_with_valid_token(string path)
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", _factory.CreateAccessToken());

        var response = await client.GetAsync(path);
        Assert.True(
            response.StatusCode == HttpStatusCode.OK,
            $"{path} expected 200 but was {(int)response.StatusCode}: {await response.Content.ReadAsStringAsync()}");
    }

    [Theory]
    [InlineData("/api/auth/login")]
    [InlineData("/api/auth/register")]
    [InlineData("/api/auth/refresh")]
    [InlineData("/api/auth/forgot-password")]
    public async Task Auth_endpoints_remain_reachable_without_bearer(string path)
    {
        var client = _factory.CreateClient();
        // Empty JSON body: action runs (AllowAnonymous). Must not be blocked by FallbackPolicy
        // with a JWT Bearer challenge before the controller.
        var response = await client.PostAsJsonAsync(path, new { });
        Assert.DoesNotContain(
            response.Headers.WwwAuthenticate,
            h => h.Scheme.Equals("Bearer", StringComparison.OrdinalIgnoreCase));
        Assert.NotEqual(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task TestDb_and_TestAi_are_absent_in_Development()
    {
        var client = _factory.CreateClient();
        // Authenticated: proves routes are unregistered (404), not merely blocked by FallbackPolicy (401).
        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", _factory.CreateAccessToken());

        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync("/test-db")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync("/test-ai")).StatusCode);
    }

    [Fact]
    public async Task TestDb_and_TestAi_are_absent_in_Production()
    {
        await using var productionFactory = SecurityWebApplicationFactory.CreateProduction();
        var client = productionFactory.CreateClient();
        // Authenticated: proves routes are unregistered (404), not merely blocked by FallbackPolicy (401).
        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", productionFactory.CreateAccessToken());

        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync("/test-db")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync("/test-ai")).StatusCode);
    }

    [Fact]
    public async Task Cors_preflight_allows_configured_origin()
    {
        var client = _factory.CreateClient();
        using var request = new HttpRequestMessage(HttpMethod.Options, "/api/dashboard/kpi");
        request.Headers.Add("Origin", SecurityWebApplicationFactory.AllowedOrigin);
        request.Headers.Add("Access-Control-Request-Method", "GET");

        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Equal(
            SecurityWebApplicationFactory.AllowedOrigin,
            response.Headers.GetValues("Access-Control-Allow-Origin").Single());
    }

    [Fact]
    public async Task Cors_preflight_denies_unknown_origin()
    {
        var client = _factory.CreateClient();
        using var request = new HttpRequestMessage(HttpMethod.Options, "/api/dashboard/kpi");
        request.Headers.Add("Origin", SecurityWebApplicationFactory.DeniedOrigin);
        request.Headers.Add("Access-Control-Request-Method", "GET");

        var response = await client.SendAsync(request);

        Assert.False(response.Headers.Contains("Access-Control-Allow-Origin"));
    }
}
