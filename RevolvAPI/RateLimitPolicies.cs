using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace RevolvAPI;

/// <summary>
/// Named ASP.NET Core rate-limit policies applied via <c>[EnableRateLimiting]</c>.
/// </summary>
public static class RateLimitPolicies
{
    public const string Auth = "auth";
    public const string AiAnalyze = "ai-analyze";

    internal static (int Permit, int WindowSeconds) ReadLimits(
        HttpContext httpContext,
        string section,
        int defaultPermit,
        int defaultWindowSeconds)
    {
        var config = httpContext.RequestServices.GetRequiredService<IConfiguration>();
        var permit = Math.Max(1, config.GetValue($"{section}:PermitLimit", defaultPermit));
        var windowSeconds = Math.Max(1, config.GetValue($"{section}:WindowSeconds", defaultWindowSeconds));
        return (permit, windowSeconds);
    }
}

