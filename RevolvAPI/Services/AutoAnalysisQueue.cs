using System.Threading.Channels;

namespace RevolvAPI.Services
{
    /// <inheritdoc cref="IAutoAnalysisQueue" />
    // Als Singleton registriert (siehe Program.cs), damit alle Request-Scopes und der
    // Background-Service denselben Channel teilen.
    public class AutoAnalysisQueue : IAutoAnalysisQueue
    {
        // Unbounded: es werden nur QualityIssue-Ids (ints) gehalten, und neue Issues sind
        // selten genug, dass Backpressure/Bounding hier keinen praktischen Nutzen hätte.
        private readonly Channel<int> _channel = Channel.CreateUnbounded<int>();

        public void QueueQualityIssue(int qualityIssueId)
        {
            // TryWrite blockiert nie und schlägt bei einem unbounded Channel nur fehl, wenn der
            // Channel bereits abgeschlossen wurde - das passiert für dieses Singleton nie.
            _channel.Writer.TryWrite(qualityIssueId);
        }

        public IAsyncEnumerable<int> ReadAllAsync(CancellationToken cancellationToken)
            => _channel.Reader.ReadAllAsync(cancellationToken);
    }
}
