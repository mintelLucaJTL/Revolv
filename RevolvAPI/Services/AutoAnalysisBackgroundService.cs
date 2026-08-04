using Microsoft.EntityFrameworkCore;
using RevolvAPI.Data;

namespace RevolvAPI.Services
{
    // Ticket #252: wertet ShopSetting.AutoAnalyzeNewIssues tatsächlich aus. Läuft im Hintergrund
    // (IHostedService), liest neu angelegte QualityIssues aus IAutoAnalysisQueue und stößt für
    // deren Artikel die (aus AiRecommendationController extrahierte) ArticleAnalysisService an -
    // ohne den Request-Thread zu blockieren, der das QualityIssue ursprünglich gespeichert hat.
    //
    // Idempotenz: QualityIssue.AutoAnalyzedAt wird atomar per ExecuteUpdateAsync geclaimt (nur
    // die erste Bearbeitung gewinnt), bevor überhaupt geprüft wird, ob das Flag aktiv ist. Damit
    // löst ein doppelt eingereihtes oder nach einem Neustart erneut zugestelltes Issue nie eine
    // zweite Analyse aus - "Wiederholter Import/Restart erzeugt keine Duplikate".
    public class AutoAnalysisBackgroundService : BackgroundService
    {
        private readonly IAutoAnalysisQueue _queue;
        private readonly IServiceScopeFactory _scopeFactory;

        public AutoAnalysisBackgroundService(IAutoAnalysisQueue queue, IServiceScopeFactory scopeFactory)
        {
            _queue = queue;
            _scopeFactory = scopeFactory;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            // Host.HostOptions.BackgroundServiceExceptionBehavior ist auf StopHost konfiguriert:
            // eine unbehandelte Exception hier würde nicht nur diesen Job stoppen, sondern die
            // gesamte API (alle anderen Endpunkte inklusive) mit runterreißen - z. B. wenn die
            // AutoAnalyzedAt-Spalte auf einer DB noch fehlt, weil die Migration noch nicht
            // gelaufen ist. Deshalb ist hier alles defensiv abgefangen; dieser Job darf im
            // schlimmsten Fall nur sich selbst lahmlegen, nie den Rest der Anwendung.

            // Der Channel lebt nur im Speicher: Issues, die kurz vor einem Neustart eingereiht,
            // aber noch nicht verarbeitet wurden, gehen sonst verloren. Beim Start deshalb alle
            // noch nicht geclaimten Issues (AutoAnalyzedAt == NULL) erneut einreihen.
            try
            {
                await RequeueUnclaimedIssuesAsync(stoppingToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                Console.WriteLine($"[AutoAnalysis] Restart-Recovery-Scan fehlgeschlagen: {ex.Message}");
            }

            await foreach (var qualityIssueId in _queue.ReadAllAsync(stoppingToken))
            {
                try
                {
                    await ProcessAsync(qualityIssueId, stoppingToken);
                }
                catch (Exception ex) when (ex is not OperationCanceledException)
                {
                    Console.WriteLine($"[AutoAnalysis] Verarbeitung von QualityIssue {qualityIssueId} fehlgeschlagen: {ex.Message}");
                }
            }
        }

        private async Task RequeueUnclaimedIssuesAsync(CancellationToken stoppingToken)
        {
            using var scope = _scopeFactory.CreateScope();
            var ctx = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            var unclaimedIds = await ctx.QualityIssues
                .Where(q => q.AutoAnalyzedAt == null)
                .Select(q => q.Id)
                .ToListAsync(stoppingToken);

            foreach (var id in unclaimedIds)
            {
                _queue.QueueQualityIssue(id);
            }
        }

        private async Task ProcessAsync(int qualityIssueId, CancellationToken stoppingToken)
        {
            using var scope = _scopeFactory.CreateScope();
            var ctx = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            // Atomarer Claim: schlägt für ein bereits (von diesem oder einem früheren Lauf)
            // bearbeitetes Issue mit 0 betroffenen Zeilen fehl -> garantiert genau eine
            // automatische Analyse pro Issue, unabhängig davon, ob/wie oft es in der Queue landet.
            var claimed = await ctx.QualityIssues
                .Where(q => q.Id == qualityIssueId && q.AutoAnalyzedAt == null)
                .ExecuteUpdateAsync(s => s.SetProperty(q => q.AutoAnalyzedAt, DateTime.UtcNow), stoppingToken);

            if (claimed == 0)
            {
                return;
            }

            var settings = await ctx.ShopSettings
                .AsNoTracking()
                .OrderBy(s => s.Id)
                .FirstOrDefaultAsync(stoppingToken);

            if (settings?.AutoAnalyzeNewIssues != true)
            {
                return; // Flag deaktiviert -> keine automatische Provideranfrage.
            }

            var issue = await ctx.QualityIssues
                .AsNoTracking()
                .Include(q => q.AiRecommendation)
                .FirstOrDefaultAsync(q => q.Id == qualityIssueId, stoppingToken);

            if (issue?.AiRecommendation == null)
            {
                return;
            }

            var analysisService = scope.ServiceProvider.GetRequiredService<IArticleAnalysisService>();

            try
            {
                await analysisService.AnalyzeArticleAsync(issue.AiRecommendation.ArtikelId);
            }
            catch (Exception ex)
            {
                // Ein fehlgeschlagener Provider-Call darf den Background-Service nicht crashen -
                // das Issue bleibt als "geclaimt" markiert (kein automatischer Retry-Sturm); die
                // manuelle Analyse über den "Analyse starten"-Button bleibt als Fallback möglich.
                Console.WriteLine(
                    $"[AutoAnalysis] Analyse für QualityIssue {qualityIssueId} (Artikel {issue.AiRecommendation.ArtikelId}) fehlgeschlagen: {ex.Message}");
            }
        }
    }
}
