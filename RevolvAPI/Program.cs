using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;
using RevolvAPI.Data;
using RevolvAPI.Data.Seeder;
using RevolvAPI.Services;
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
});

var connectionString = builder.Configuration.GetConnectionString("WawiConnection");

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(connectionString));

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactFrontend", policy =>
    {
        // Explicit origin required: AllowCredentials (for the HttpOnly refresh cookie) can't be
        // combined with AllowAnyOrigin.
        policy.WithOrigins("http://localhost:5173")
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

builder.Services.AddAuthorization();

builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddScoped<IPasswordService, PasswordService>();
builder.Services.AddScoped<IRefreshTokenService, RefreshTokenService>();
builder.Services.AddScoped<IReturnAnalyticsService, ReturnAnalyticsService>();
builder.Services.AddHttpClient<IAiService, AiService>();
builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddScoped<IArticleAnalysisService, ArticleAnalysisService>();

// Ticket #252: automatische KI-Analyse bei neuen QualityIssues (ShopSetting.AutoAnalyzeNewIssues).
// Singleton, da AppDbContext (scoped, pro Request) und der Background-Service denselben
// In-Memory-Channel teilen müssen.
builder.Services.AddSingleton<IAutoAnalysisQueue, AutoAnalysisQueue>();
builder.Services.AddHostedService<AutoAnalysisBackgroundService>();

var app = builder.Build();

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
});

// Dev helper to verify AI provider wiring
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
});

DbSeeder.Seed(app.Services.CreateScope().ServiceProvider.GetRequiredService<AppDbContext>());

app.Run();
