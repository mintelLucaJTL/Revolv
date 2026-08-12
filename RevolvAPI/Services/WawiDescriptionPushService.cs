using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using RevolvAPI.Data;
using RevolvAPI.Models;

namespace RevolvAPI.Services
{
    /// <inheritdoc cref="IWawiDescriptionPushService" />
    public class WawiDescriptionPushService : IWawiDescriptionPushService
    {
        private readonly AppDbContext _ctx;

        public WawiDescriptionPushService(AppDbContext ctx)
        {
            _ctx = ctx;
        }

        public async Task<PushDescriptionResult> PushAsync(
            int proposalId,
            int companyId,
            int userId,
            CancellationToken cancellationToken = default)
        {
            var proposal = await _ctx.DescriptionProposals
                .Include(p => p.AiRecommendation)
                .FirstOrDefaultAsync(p => p.Id == proposalId, cancellationToken);

            // Gleicher IDOR-Schutz wie AiRecommendationController.UpdateDescriptionStatus: ein
            // Vorschlag einer fremden Firma darf nicht einmal als "existiert" erkennbar sein.
            if (proposal == null || proposal.AiRecommendation.CompanyId != companyId)
            {
                return new PushDescriptionResult(PushDescriptionOutcome.NotFound);
            }

            if (proposal.Status != AiRecommendationStatuses.DescriptionProposalAccepted)
            {
                return new PushDescriptionResult(PushDescriptionOutcome.NotAccepted);
            }

            if (string.IsNullOrWhiteSpace(proposal.ProposedText))
            {
                return new PushDescriptionResult(
                    PushDescriptionOutcome.NotAccepted,
                    ErrorMessage: "Kein Vorschlagstext vorhanden.");
            }

            var artikelId = proposal.AiRecommendation.ArtikelId;
            var proposedText = proposal.ProposedText;

            // Claim + WAWI-Schreibzugriff + Audit-Log leben in EINER Transaktion: schlägt der
            // WAWI-Write fehl, muss auch der Idempotenz-Claim zurückgerollt werden, sonst gilt
            // der Vorschlag fälschlich als "bereits übernommen", ohne dass WAWI je geändert wurde.
            await using var transaction = await _ctx.Database.BeginTransactionAsync(cancellationToken);

            // Atomarer Claim (wie AutoAnalysisBackgroundService/QualityIssue.AutoAnalyzedAt):
            // schlägt für einen bereits gepushten Vorschlag mit 0 betroffenen Zeilen fehl ->
            // garantiert genau einen Schreibversuch pro Vorschlag, egal wie oft geklickt wird.
            var claimed = await _ctx.DescriptionProposals
                .Where(p => p.Id == proposalId && p.PushedToWawiAt == null)
                .ExecuteUpdateAsync(
                    s => s.SetProperty(p => p.PushedToWawiAt, DateTime.UtcNow),
                    cancellationToken);

            if (claimed == 0)
            {
                await transaction.RollbackAsync(cancellationToken);

                var existingPushedAt = await _ctx.DescriptionProposals
                    .AsNoTracking()
                    .Where(p => p.Id == proposalId)
                    .Select(p => p.PushedToWawiAt)
                    .FirstOrDefaultAsync(cancellationToken);

                return new PushDescriptionResult(PushDescriptionOutcome.AlreadyPushed, PushedAt: existingPushedAt);
            }

            try
            {
                // Alle Beschreibungszeilen dieses Artikels (unterschiedliche Sprache/Plattform/
                // Shop) werden überschrieben - ein Artikel kann mehrere Zeilen haben und es gibt
                // keine Information im Vorschlag, welche Zeile gemeint wäre. Vorher-Werte werden
                // fürs Audit-Log gesnapshotted.
                var rows = await _ctx.WawiItemDescriptions
                    .Where(d => d.ArtikelId == artikelId)
                    .ToListAsync(cancellationToken);

                if (rows.Count == 0)
                {
                    await transaction.RollbackAsync(cancellationToken);
                    return new PushDescriptionResult(PushDescriptionOutcome.NoWawiRows);
                }

                var snapshot = rows
                    .Select(r => new
                    {
                        r.SpracheId,
                        r.PlattformId,
                        r.ShopId,
                        PreviousText = r.Beschreibung,
                    })
                    .ToList();

                var rowsAffected = await _ctx.WawiItemDescriptions
                    .Where(d => d.ArtikelId == artikelId)
                    .ExecuteUpdateAsync(
                        s => s.SetProperty(d => d.Beschreibung, proposedText),
                        cancellationToken);

                // Verteilung der Retourengruende JETZT (vor der neuen Ueberarbeitung) festhalten -
                // Referenzpunkt fuer die Re-Analyse-Sperre (ReturnAnalyticsService.GetReanalyzeGateAsync):
                // eine neue KI-Analyse soll erst wieder moeglich sein, wenn sich diese Verteilung
                // seit hier signifikant veraendert hat.
                var reasonCounts = await _ctx.WawiReturnLineItems
                    .Where(li => li.ItemId == artikelId)
                    .GroupBy(li => li.ReturnReasonId)
                    .Select(g => new { ReasonId = g.Key, Count = g.Count() })
                    .ToListAsync(cancellationToken);
                var reasonSnapshotJson = JsonSerializer.Serialize(
                    reasonCounts.ToDictionary(x => x.ReasonId?.ToString() ?? "null", x => x.Count));
                var reasonCountAtPush = reasonCounts.Sum(x => x.Count);

                _ctx.DescriptionPushLogs.Add(new DescriptionPushLog
                {
                    DescriptionProposalId = proposalId,
                    ArtikelId = artikelId,
                    PushedAt = DateTime.UtcNow,
                    PushedByUserId = userId,
                    PreviousTextSnapshot = JsonSerializer.Serialize(snapshot),
                    NewText = proposedText,
                    RowsAffected = rowsAffected,
                    Status = DescriptionPushLogStatuses.Success,
                    ReturnReasonSnapshotJson = reasonSnapshotJson,
                    ReturnLineItemCountAtPush = reasonCountAtPush,
                });
                await _ctx.SaveChangesAsync(cancellationToken);

                await transaction.CommitAsync(cancellationToken);

                return new PushDescriptionResult(PushDescriptionOutcome.Success, rowsAffected, DateTime.UtcNow);
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync(cancellationToken);

                // Rollback wirkt nur auf die DB, nicht auf den EF-ChangeTracker - ohne Clear()
                // würde ein evtl. schon per .Add() angehängtes (aber nie gespeichertes)
                // Success-Log gleich mit dem folgenden Failed-Log gespeichert.
                _ctx.ChangeTracker.Clear();

                try
                {
                    _ctx.DescriptionPushLogs.Add(new DescriptionPushLog
                    {
                        DescriptionProposalId = proposalId,
                        ArtikelId = artikelId,
                        PushedAt = DateTime.UtcNow,
                        PushedByUserId = userId,
                        NewText = proposedText,
                        RowsAffected = 0,
                        Status = DescriptionPushLogStatuses.Failed,
                        // Truncated to fit the column - an overlong message here must not also
                        // fail the (already best-effort) failure-log write itself.
                        ErrorMessage = ex.Message.Length > 2000 ? ex.Message[..2000] : ex.Message,
                    });
                    // Eigene, neue Transaktion (die vorherige wurde gerade zurückgerollt) - ein
                    // Fehlschlag muss trotzdem sichtbar protokolliert werden.
                    await _ctx.SaveChangesAsync(cancellationToken);
                }
                catch
                {
                    // Das Protokollieren des Fehlers darf den eigentlichen Fehler nie verdecken.
                }

                return new PushDescriptionResult(
                    PushDescriptionOutcome.Failed,
                    ErrorMessage: "Die Übernahme in WAWI ist fehlgeschlagen.");
            }
        }
    }
}
