using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;
using RevolvAPI;
using RevolvAPI.Data;
using RevolvAPI.Data.Seeder;
using RevolvAPI.Services;
using RevolvAPI.Swagger;
using System.Security.Claims;
using System.Text;
using System.Threading.RateLimiting;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddOpenApi();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header. Example: 'Bearer eyJhbGciOiJIUzI1...'",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });

    c.AddSecurityRequirement(document => new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecuritySchemeReference("Bearer", document),
            new List<string>()
        }
    });

    // Document-level Bearer applies to all ops; this filter clears it for [AllowAnonymous].
    c.OperationFilter<AllowAnonymousOperationFilter>();
});

var connectionString = builder.Configuration.GetConnectionString("WawiConnection");

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(connectionString));

// Ticket: Origins kommen aus der Config statt hartcodiert, damit Production keine
// Localhost-Origin (oder schlimmer: ein Wildcard) mitschleppt. Ohne konfigurierte Origins
// außerhalb von Development wird bewusst nichts erlaubt, statt still offen zu sein.
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
    ?? (builder.Environment.IsDevelopment() ? new[] { "http://localhost:5173" } : Array.Empty<string>());

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactFrontend", policy =>
    {
        // Explicit origin(s) required: AllowCredentials (for the HttpOnly refresh cookie) can't
        // be combined with AllowAnyOrigin.
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Issuer"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"])),
            // No grace period: access tokens are short-lived (5 min) and clients refresh before expiry.
            ClockSkew = TimeSpan.Zero
        };
    });

// Ticket: geschlossene Standard-Policy statt Opt-in-[Authorize] pro Controller - ein neuer
// Controller ohne Attribut ist damit automatisch geschützt statt automatisch offen.
// Öffentliche Endpunkte (Login/Register/Refresh/...) müssen sich explizit mit
// [AllowAnonymous] freischalten.
builder.Services.AddAuthorization(options =>
{
    options.FallbackPolicy = new Microsoft.AspNetCore.Authorization.AuthorizationPolicyBuilder()
        .RequireAuthenticatedUser()
        .Build();
});

// H4: brute-force / cost-abuse limits. Auth is partitioned by connection IP (not
// X-Forwarded-For, which is client-spoofable without ForwardedHeaders). AI analyze is
// partitioned by authenticated user id, with IP as fallback. Limits are read from
// IConfiguration per request so test hosts can override them after WebApplication.CreateBuilder.
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    options.AddPolicy(RateLimitPolicies.Auth, httpContext =>
    {
        var (permit, windowSeconds) = RateLimitPolicies.ReadLimits(httpContext, "RateLimiting:Auth", 10, 60);
        var ip = httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        return RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: $"auth:{ip}:{permit}:{windowSeconds}",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = permit,
                Window = TimeSpan.FromSeconds(windowSeconds),
                QueueLimit = 0
            });
    });

    options.AddPolicy(RateLimitPolicies.AiAnalyze, httpContext =>
    {
        var (permit, windowSeconds) = RateLimitPolicies.ReadLimits(httpContext, "RateLimiting:AiAnalyze", 20, 60);
        var userId = httpContext.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var ip = httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        var subject = !string.IsNullOrEmpty(userId) ? $"user:{userId}" : $"ip:{ip}";
        return RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: $"ai:{subject}:{permit}:{windowSeconds}",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = permit,
                Window = TimeSpan.FromSeconds(windowSeconds),
                QueueLimit = 0
            });
    });
});

builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddScoped<IPasswordService, PasswordService>();
builder.Services.AddScoped<IRefreshTokenService, RefreshTokenService>();
builder.Services.AddScoped<IReturnAnalyticsService, ReturnAnalyticsService>();
builder.Services.AddHttpClient<IAiService, AiService>();
builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddScoped<IArticleAnalysisService, ArticleAnalysisService>();
builder.Services.AddScoped<IWawiDescriptionPushService, WawiDescriptionPushService>();

// Ticket #252: automatische KI-Analyse bei neuen QualityIssues (ShopSetting.AutoAnalyzeNewIssues).
// Singleton, da AppDbContext (scoped, pro Request) und der Background-Service denselben
// In-Memory-Channel teilen müssen.
builder.Services.AddSingleton<IAutoAnalysisQueue, AutoAnalysisQueue>();
builder.Services.AddHostedService<AutoAnalysisBackgroundService>();

var app = builder.Build();

await DatabaseSetup.RunMasterSetupAsync(connectionString!, app.Logger);

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// app.UseHttpsRedirection();
app.UseCors("AllowReactFrontend");
app.UseAuthentication();
app.UseAuthorization();
// After auth so the AI-analyze policy can partition by user id.
app.UseRateLimiter();
app.MapControllers();

DbSeeder.Seed(app.Services.CreateScope().ServiceProvider.GetRequiredService<AppDbContext>());

app.Run();

// Exposes the entry assembly to WebApplicationFactory for integration tests.
public partial class Program { }
