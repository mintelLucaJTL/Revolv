namespace RevolvAPI.Services
{
    // Entkoppelt "ein neues QualityIssue wurde gespeichert" von "die (potenziell langsame,
    // kostenpflichtige) KI-Analyse dafür ausführen". AppDbContext.SaveChangesAsync ruft
    // QueueQualityIssue für jedes neu angelegte QualityIssue auf - das ist eine reine
    // In-Memory-Übergabe und blockiert den Request-Thread nicht. AutoAnalysisBackgroundService
    // liest die Queue im Hintergrund aus und stößt dort die eigentliche Analyse an.
    public interface IAutoAnalysisQueue
    {
        void QueueQualityIssue(int qualityIssueId);

        IAsyncEnumerable<int> ReadAllAsync(CancellationToken cancellationToken);
    }
}
