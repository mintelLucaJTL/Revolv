using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;

namespace RevolvAPI.Tests;

/// <summary>
/// H4: auth abuse surfaces and AI analyze return 429 after the configured permit limit.
/// Uses a dedicated host per test so limiter partitions do not leak across cases.
/// </summary>
public class RateLimitingTests
{
    private const int TestPermitLimit = 3;

    private static SecurityWebApplicationFactory CreateFactory() =>
        SecurityWebApplicationFactory.CreateWithConfig(new Dictionary<string, string?>
        {
            ["RateLimiting:Auth:PermitLimit"] = TestPermitLimit.ToString(),
            ["RateLimiting:Auth:WindowSeconds"] = "60",
            ["RateLimiting:AiAnalyze:PermitLimit"] = TestPermitLimit.ToString(),
            ["RateLimiting:AiAnalyze:WindowSeconds"] = "60"
        });

    public static TheoryData<string> AuthAbusePaths => new()
    {
        "/api/auth/login",
        "/api/auth/register",
        "/api/auth/forgot-password",
        "/api/auth/reset-password"
    };

    [Theory]
    [MemberData(nameof(AuthAbusePaths))]
    public async Task Auth_abuse_endpoints_return_429_after_exceeding_limit(string path)
    {
        await using var factory = CreateFactory();
        var client = factory.CreateClient();
        var body = new { email = "rate-limit@example.com", password = "x", token = "t", newPassword = "x" };

        for (var i = 0; i < TestPermitLimit; i++)
        {
            var allowed = await client.PostAsJsonAsync(path, body);
            Assert.NotEqual(HttpStatusCode.TooManyRequests, allowed.StatusCode);
        }

        var rejected = await client.PostAsJsonAsync(path, body);
        Assert.Equal(HttpStatusCode.TooManyRequests, rejected.StatusCode);
    }

    [Fact]
    public async Task Auth_limit_is_shared_across_login_and_register()
    {
        await using var factory = CreateFactory();
        var client = factory.CreateClient();
        var body = new { email = "shared@example.com", password = "x", companyName = "Co", name = "N" };

        for (var i = 0; i < TestPermitLimit; i++)
        {
            var path = i % 2 == 0 ? "/api/auth/login" : "/api/auth/register";
            var allowed = await client.PostAsJsonAsync(path, body);
            Assert.NotEqual(HttpStatusCode.TooManyRequests, allowed.StatusCode);
        }

        var rejected = await client.PostAsJsonAsync("/api/auth/login", body);
        Assert.Equal(HttpStatusCode.TooManyRequests, rejected.StatusCode);
    }

    [Fact]
    public async Task Refresh_and_logout_are_not_limited_by_auth_policy()
    {
        await using var factory = CreateFactory();
        var client = factory.CreateClient();
        var loginBody = new { email = "a@b.c", password = "x" };

        for (var i = 0; i < TestPermitLimit + 1; i++)
        {
            await client.PostAsJsonAsync("/api/auth/login", loginBody);
        }

        var refresh = await client.PostAsJsonAsync("/api/auth/refresh", new { });
        var logout = await client.PostAsJsonAsync("/api/auth/logout", new { });

        Assert.NotEqual(HttpStatusCode.TooManyRequests, refresh.StatusCode);
        Assert.NotEqual(HttpStatusCode.TooManyRequests, logout.StatusCode);
    }

    [Fact]
    public async Task Ai_analyze_returns_429_after_exceeding_limit()
    {
        await using var factory = CreateFactory();
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", factory.CreateAccessToken());

        for (var i = 0; i < TestPermitLimit; i++)
        {
            var allowed = await client.PostAsync("/api/ai/analyze/1", null);
            Assert.NotEqual(HttpStatusCode.TooManyRequests, allowed.StatusCode);
        }

        var rejected = await client.PostAsync("/api/ai/analyze/1", null);
        Assert.Equal(HttpStatusCode.TooManyRequests, rejected.StatusCode);
    }

    [Fact]
    public async Task Ai_analyze_without_token_is_401_not_429()
    {
        await using var factory = CreateFactory();
        var client = factory.CreateClient();

        var response = await client.PostAsync("/api/ai/analyze/1", null);
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
