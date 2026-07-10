using Microsoft.EntityFrameworkCore;
using RevolvAPI.Data;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();

// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// configure the database connection
var connectionString = builder.Configuration.GetConnectionString("WawiConnection");

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(connectionString));

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactFrontend", policy =>
    {
        policy.WithOrigins("http://localhost:5173") // Default port for Vite dev server
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseAuthorization();
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

app.Run();