namespace RevolvAPI.Services
{
    public enum PushDescriptionOutcome
    {
        Success,
        AlreadyPushed,
        NotFound,
        NotAccepted,
        NoWawiRows,
        Failed,
    }

    public record PushDescriptionResult(
        PushDescriptionOutcome Outcome,
        int RowsAffected = 0,
        DateTime? PushedAt = null,
        string? ErrorMessage = null);

    // Ticket: "KI-Beschreibung in WAWI übernehmen" - der einzige Schreibpfad dieser App in die
    // sonst rein lesend genutzte WAWI-Datenbank. Siehe WawiDescriptionPushService für die
    // Sicherheitsmechanik (Transaktion, Idempotenz-Claim, Audit-Log).
    public interface IWawiDescriptionPushService
    {
        Task<PushDescriptionResult> PushAsync(
            int proposalId,
            int companyId,
            int userId,
            CancellationToken cancellationToken = default);
    }
}
