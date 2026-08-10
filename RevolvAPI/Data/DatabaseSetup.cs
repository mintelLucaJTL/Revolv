using Microsoft.Data.SqlClient;
using System.Text.RegularExpressions;

namespace RevolvAPI.Data;

// Führt Database/00_MasterSetup.sql automatisch beim Start aus, damit ein frisch geklontes
// Projekt sein Schema selbst in die WAWI-DB bringt - bewusst ohne EF-Migrationen (siehe README).
// Das Skript ist idempotent (IF NOT EXISTS-Checks), daher unbedenklich bei jedem Start erneut
// auszuführen.
public static class DatabaseSetup
{
    public static async Task RunMasterSetupAsync(string connectionString, ILogger logger)
    {
        var scriptPath = Path.Combine(AppContext.BaseDirectory, "Database", "00_MasterSetup.sql");

        if (!File.Exists(scriptPath))
        {
            logger.LogWarning("00_MasterSetup.sql nicht gefunden unter {Path} - Schema-Setup übersprungen.", scriptPath);
            return;
        }

        var script = await File.ReadAllTextAsync(scriptPath);

        // GO ist ein SSMS-/sqlcmd-Batch-Trenner, kein gültiges T-SQL - das Skript muss dafür
        // manuell in Batches zerlegt werden, bevor es per SqlCommand ausgeführt wird.
        var batches = Regex.Split(script, @"^\s*GO\s*$", RegexOptions.Multiline | RegexOptions.IgnoreCase)
            .Select(b => b.Trim())
            .Where(b => b.Length > 0)
            // USE-Statement überspringen: die Ziel-DB kommt schon aus der Connection String,
            // nicht aus dem im Skript hartcodierten Namen (z. B. wenn die WAWI-DB anders heißt).
            .Where(b => !b.StartsWith("USE ", StringComparison.OrdinalIgnoreCase))
            .ToList();

        try
        {
            await using var connection = new SqlConnection(connectionString);
            await connection.OpenAsync();

            foreach (var batch in batches)
            {
                await using var command = new SqlCommand(batch, connection) { CommandTimeout = 60 };
                await command.ExecuteNonQueryAsync();
            }

            logger.LogInformation("Schema-Setup (00_MasterSetup.sql) erfolgreich ausgeführt ({Count} Batches).", batches.Count);
        }
        catch (Exception ex)
        {
            // App nicht crashen lassen (z. B. WAWI-DB beim Start nicht erreichbar) - aber laut
            // loggen, da ohne dieses Setup fast alle Requests sowieso fehlschlagen werden.
            logger.LogError(ex, "Schema-Setup (00_MasterSetup.sql) fehlgeschlagen.");
        }
    }
}
