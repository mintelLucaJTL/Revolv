using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;
using RevolvAPI.Data;
using RevolvAPI.Data.Seeder;
using RevolvAPI.Services;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();

// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();
builder.Services.AddEndpointsApiExplorer();
// Add SwaggerGen to the container
builder.Services.AddSwaggerGen(c =>
{
    // Define the security scheme (Bearer Token)
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization Header. \r\n\r\n Bitte 'Bearer ' (mit Leerzeichen!) vor dein Token schreiben.\r\n\r\nBeispiel: 'Bearer eyJhbGciOiJIUzI1...'",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });

    // Apply the security scheme to all endpoints in Swagger
    c.AddSecurityRequirement(document => new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecuritySchemeReference("Bearer", document),
            new List<string>()
        }
    });
});

// configure the database connection
var connectionString = builder.Configuration.GetConnectionString("WawiConnection");

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(connectionString));

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactFrontend", policy =>
    {
        policy.WithOrigins("http://localhost:5173") // Default port for Vite dev server
               .AllowAnyOrigin()
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

// configure JWT authentication -> Checks if the token is valid and not expired
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true, // Validate the issuer of the token
            ValidateAudience = true, // Validate the audience of the token
            ValidateLifetime = true, // Validate the expiration of the token
            ValidateIssuerSigningKey = true, // Validate the signing key of the token
            ValidIssuer = builder.Configuration["Jwt:Issuer"], // The expected issuer of the token
            ValidAudience = builder.Configuration["Jwt:Issuer"], // The expected audience of the token
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"])) // The signing key used to validate the token
        };
    });

// Required so [Authorize] (used by UserController for GET/PATCH api/user/me) works at runtime.
builder.Services.AddAuthorization();

builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddScoped<IPasswordService, PasswordService>();
builder.Services.AddScoped<IReturnAnalyticsService, ReturnAnalyticsService>();
// AddHttpClient<TInterface, TImplementation> registriert AiService UND injiziert einen verwalteten HttpClient hinein.
builder.Services.AddHttpClient<IAiService, AiService>();
builder.Services.AddScoped<IEmailService, EmailService>();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

//app.UseHttpsRedirection();
app.UseCors("AllowReactFrontend"); // This allows requests from the React frontend running on localhost:5173 to access the API endpoints.
app.UseAuthentication(); // This Checks if the user is authenticated, meaning they have provided a valid JWT token in the request header.
app.UseAuthorization(); // This Checks if the user is authorized to access the endpoint, based on the policies defined in the controllers.
app.MapControllers();

// temporary endpoint to test the database connection
app.MapGet("/test-db", async (AppDbContext db) =>
{
    try
    {
        // CanConnectAsync pings the database to check if it is reachable and can be connected to.
        bool isConnected = await db.Database.CanConnectAsync();

        // Return a success message if the connection is successful, otherwise return a problem message.
        if (isConnected)
            return Results.Ok("Successfully connected to DB! C:");
        else
            return Results.Problem("Couldnt connecto to DB! :C");
    }
    catch (Exception ex)
    {
        // Return a problem message with the exception details if an error occurs during the connection attempt.
        return Results.Problem($"Error while connecting: {ex.Message}");
    }
});

// Temporärer manueller Test-Endpoint für die KI-Service-Verdrahtung (Ticket: "Backend-Service für KI-API").
// Provider ist noch nicht angebunden (wartet auf IT-Freigabe) -> liefert aktuell bewusst einen
// Fehler im Terminal statt eine echte KI-Antwort. Sobald AiProvider:* konfiguriert und
// GenerateAnalysisAsync implementiert ist, gibt dieser Endpoint die echte Antwort aus.
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

// Seed the database with initial data
DbSeeder.Seed(app.Services.CreateScope().ServiceProvider.GetRequiredService<AppDbContext>());

app.Run();