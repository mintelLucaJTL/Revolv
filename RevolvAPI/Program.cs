using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;
using RevolvAPI.Data;
using RevolvAPI.Data.Seeder;
using RevolvAPI.Services;
using RevolvAPI.Swagger;
using System.Text;

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
app.MapControllers();

// Diagnose-Endpunkte: nur in Development registriert (existieren in Production gar nicht,
// dadurch auch kein Exception-/Provider-Detail-Leak nach außen) und explizit anonym erreichbar,
// da sie sonst durch die neue Auth-Fallback-Policy blockiert wären.
if (app.Environment.IsDevelopment())
{
    app.MapGet("/test-db", async (AppDbContext db) =>
    {
        try
        {
            bool isConnected = await db.Database.CanConnectAsync();

            if (isConnected)
                return Results.Ok("Successfully connected to DB! C:");
            else
                return Results.Problem("Couldnt connecto to DB! :C");
        }
        catch (Exception ex)
        {
            return Results.Problem($"Error while connecting: {ex.Message}");
        }
    }).AllowAnonymous();

    app.MapGet("/test-ai", async (IAiService ai) =>
    {
        try
        {
            var reply = await ai.GenerateAnalysisAsync("Hallo KI");
            Console.WriteLine($"[AI Test] Antwort: {reply}");
            return Results.Ok(reply);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[AI Test] Fehler: {ex.Message}");
            return Results.Problem(ex.Message);
        }
    }).AllowAnonymous();
}

DbSeeder.Seed(app.Services.CreateScope().ServiceProvider.GetRequiredService<AppDbContext>());

app.Run();

// Exposes the entry assembly to WebApplicationFactory for integration tests.
public partial class Program { }
