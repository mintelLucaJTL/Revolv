using Microsoft.EntityFrameworkCore;
using RevolvAPI.Models;
using RevolvAPI.Models.Wawi;
using RevolvAPI.Services;

namespace RevolvAPI.Data
{
    public class AppDbContext : DbContext
    {
        // Optional (default null) so tests/tools that construct AppDbContext directly with just
        // DbContextOptions keep working without wiring up the auto-analysis queue.
        private readonly IAutoAnalysisQueue? _autoAnalysisQueue;

        public AppDbContext(DbContextOptions<AppDbContext> options, IAutoAnalysisQueue? autoAnalysisQueue = null)
            : base(options)
        {
            _autoAnalysisQueue = autoAnalysisQueue;
        }

        // DbSets -> Tables in the database (App-eigenes Schema "revolv")
        public DbSet<User> Users { get; set; }
        public DbSet<ActionRecommendation> ActionRecommendations { get; set; }
        public DbSet<DescriptionProposal> DescriptionProposals { get; set; }
        public DbSet<AiRecommendation> AiRecommendations { get; set; }
        public DbSet<QualityIssue> QualityIssues { get; set; }
        public DbSet<ShopSetting> ShopSettings { get; set; }

        // DbSets -> Read-only Views/Tabellen der echten JTL-WAWI-Datenbank.
        // Diese werden NIE beschrieben (kein Add/Update/Remove) - die WAWI ist die
        // Quelle der Wahrheit für Artikel-, Retouren- und Verkaufsdaten.
        public DbSet<WawiItem> WawiItems { get; set; }
        public DbSet<WawiItemDescription> WawiItemDescriptions { get; set; }
        public DbSet<WawiProductGroup> WawiProductGroups { get; set; }
        public DbSet<WawiReturn> WawiReturns { get; set; }
        public DbSet<WawiReturnLineItem> WawiReturnLineItems { get; set; }
        public DbSet<WawiReturnReason> WawiReturnReasons { get; set; }
        public DbSet<WawiReturnReasonTranslation> WawiReturnReasonTranslations { get; set; }
        public DbSet<WawiReturnStatus> WawiReturnStatuses { get; set; }
        public DbSet<WawiSalesInvoiceLineItem> WawiSalesInvoiceLineItems { get; set; }

        // Ticket #252: sobald neue QualityIssues erfolgreich gespeichert wurden, für jedes davon
        // IAutoAnalysisQueue.QueueQualityIssue aufrufen - unabhängig davon, welcher Code-Pfad
        // (Controller, künftiger Import-Job, ...) sie über EF angelegt hat. Das Einreihen selbst
        // ist eine reine In-Memory-Übergabe (kein Provider-Call), blockiert also den
        // Request-Thread nicht. Ob wirklich automatisch analysiert wird, entscheidet erst
        // AutoAnalysisBackgroundService anhand von ShopSetting.AutoAnalyzeNewIssues.
        public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            var newIssues = _autoAnalysisQueue == null
                ? null
                : ChangeTracker.Entries<QualityIssue>()
                    .Where(e => e.State == EntityState.Added)
                    .Select(e => e.Entity)
                    .ToList();

            var result = await base.SaveChangesAsync(cancellationToken);

            if (newIssues is { Count: > 0 })
            {
                foreach (var issue in newIssues)
                {
                    _autoAnalysisQueue!.QueueQualityIssue(issue.Id);
                }
            }

            return result;
        }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Verhindert doppelte Accounts mit derselben E-Mail auf DB-Ebene
            // (die Prüfung in AuthController.Register allein schützt nicht vor Race Conditions).
            modelBuilder.Entity<User>()
                .HasIndex(u => u.Email)
                .IsUnique();

            ConfigureWawiViews(modelBuilder);
        }

        // Mappt die WAWI-Entitäten per ToView/ToTable auf die echten JTL-WAWI-Objekte.
        // ToView statt ToTable sorgt zusätzlich dafür, dass EF-Core-Migrationen (falls dieses
        // Projekt sie später wieder einführt) diese Objekte NICHT anfassen/verwalten.
        private static void ConfigureWawiViews(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<WawiItem>(e =>
            {
                e.ToView("Items", schema: "DAL");
                e.HasKey(x => x.Id);
                e.Property(x => x.Sku).HasColumnName("Identifiers_SKU");
            });

            modelBuilder.Entity<WawiItemDescription>(e =>
            {
                // Das ist eine echte Tabelle (kein View), aber ebenfalls read-only.
                e.ToTable("tArtikelBeschreibung", schema: "dbo");
                e.HasKey(x => new { x.ArtikelId, x.SpracheId, x.PlattformId, x.ShopId });
                e.Property(x => x.ArtikelId).HasColumnName("kArtikel");
                e.Property(x => x.SpracheId).HasColumnName("kSprache");
                e.Property(x => x.PlattformId).HasColumnName("kPlattform");
                e.Property(x => x.ShopId).HasColumnName("kShop");
                e.Property(x => x.Name).HasColumnName("cName");
            });

            modelBuilder.Entity<WawiProductGroup>(e =>
            {
                e.ToView("ProductGroups", schema: "DAL");
                e.HasKey(x => x.Id);
            });

            modelBuilder.Entity<WawiReturn>(e =>
            {
                e.ToView("Returns", schema: "DAL");
                e.HasKey(x => x.Id);
            });

            modelBuilder.Entity<WawiReturnLineItem>(e =>
            {
                e.ToView("ReturnLineItems", schema: "DAL");
                e.HasKey(x => x.Id);
            });

            modelBuilder.Entity<WawiReturnReason>(e =>
            {
                e.ToView("ReturnReasons", schema: "DAL");
                e.HasKey(x => x.Id);
            });

            modelBuilder.Entity<WawiReturnReasonTranslation>(e =>
            {
                e.ToView("ReturnReasonTranslations", schema: "DAL");
                e.HasKey(x => new { x.ReturnReasonId, x.LanguageId });
            });

            modelBuilder.Entity<WawiReturnStatus>(e =>
            {
                e.ToView("ReturnStatuses", schema: "DAL");
                e.HasKey(x => x.Id);
            });

            modelBuilder.Entity<WawiSalesInvoiceLineItem>(e =>
            {
                e.ToView("SalesInvoiceLineItems", schema: "DAL");
                e.HasKey(x => x.Id);
            });
        }
    }
}
