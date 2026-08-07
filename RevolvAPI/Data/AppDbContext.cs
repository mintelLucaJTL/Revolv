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

        public DbSet<User> Users { get; set; }
        public DbSet<Company> Companies { get; set; }
        public DbSet<Role> Roles { get; set; }
        public DbSet<ActionRecommendation> ActionRecommendations { get; set; }
        public DbSet<DescriptionProposal> DescriptionProposals { get; set; }
        public DbSet<AiRecommendation> AiRecommendations { get; set; }
        public DbSet<QualityIssue> QualityIssues { get; set; }
        public DbSet<ShopSetting> ShopSettings { get; set; }
        public DbSet<RefreshToken> RefreshTokens { get; set; }

        // Read-only WAWI views/tables — never written by this app.
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

            // Unique email at DB level (guards race conditions AuthController alone cannot).
            modelBuilder.Entity<User>()
                .HasIndex(u => u.Email)
                .IsUnique();

            // Restrict (not Cascade): a Company/Role must not silently take its Users down with it.
            modelBuilder.Entity<User>()
                .HasOne(u => u.Company)
                .WithMany()
                .HasForeignKey(u => u.CompanyId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<User>()
                .HasOne(u => u.Role)
                .WithMany()
                .HasForeignKey(u => u.RoleId)
                .OnDelete(DeleteBehavior.Restrict);

            // Ticket #271: Laengen/Defaults explizit, damit Modell/Migration-Snapshot/DB
            // uebereinstimmen statt sich auf EF-Konventionen (nvarchar(max), kein DB-Default)
            // zu verlassen, die vom real gewachsenen Schema abweichen.
            modelBuilder.Entity<User>(entity =>
            {
                entity.Property(u => u.Email).HasMaxLength(256);
                entity.Property(u => u.Name).HasMaxLength(256);
                entity.Property(u => u.PasswordResetToken).HasMaxLength(256);
                entity.Property(u => u.CreatedAt).HasDefaultValueSql("GETDATE()");
            });

            modelBuilder.Entity<Company>(entity =>
            {
                entity.Property(c => c.Name).HasMaxLength(255);
                entity.Property(c => c.CreatedAt).HasDefaultValueSql("GETDATE()");
            });

            modelBuilder.Entity<Role>()
                .HasIndex(r => r.RoleName)
                .IsUnique();

            modelBuilder.Entity<Role>()
                .Property(r => r.RoleName)
                .HasMaxLength(50);

            // AuthController.Register braucht die Admin-Rolle und schlaegt sonst laut fehl - ein
            // rein migrations-basiertes frisches Setup muss diese Referenzdaten mitbringen statt
            // zusaetzlich ein separates revolv.Roles.sql zu erfordern. Ids fix (nicht IDENTITY-
            // generiert) und decken sich mit den bereits produktiv vergebenen Ids 1/2.
            modelBuilder.Entity<Role>().HasData(
                new Role { Id = 1, RoleName = RoleNames.Admin },
                new Role { Id = 2, RoleName = RoleNames.Mitarbeiter });

            // Folge-Ticket zu #190: AiRecommendations/ShopSettings gehören jeweils zu genau
            // einer Company. Restrict statt Cascade, wie bei User - eine Company darf nicht
            // versehentlich ihre Analysen/Einstellungen mit sich reißen.
            modelBuilder.Entity<AiRecommendation>()
                .HasOne(r => r.Company)
                .WithMany()
                .HasForeignKey(r => r.CompanyId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<AiRecommendation>()
                .Property(r => r.IsFullyResolved)
                .HasDefaultValue(false);

            // Explizit statt EF-Konvention: eine AiRecommendation "besitzt" ihre QualityIssues/
            // DescriptionProposals/ActionRecommendations - ohne die Empfehlung sind sie bedeutungslos.
            modelBuilder.Entity<QualityIssue>()
                .HasOne(q => q.AiRecommendation)
                .WithMany(r => r.QualityIssues)
                .HasForeignKey(q => q.AiRecommendationId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<DescriptionProposal>()
                .HasOne(d => d.AiRecommendation)
                .WithMany(r => r.DescriptionProposals)
                .HasForeignKey(d => d.AiRecommendationId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<ActionRecommendation>()
                .HasOne(a => a.AiRecommendation)
                .WithMany(r => r.ActionRecommendations)
                .HasForeignKey(a => a.AiRecommendationId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<QualityIssue>(entity =>
            {
                entity.Property(q => q.Status)
                    .HasMaxLength(50)
                    .HasDefaultValue(AiRecommendationStatuses.QualityIssuePending);
            });

            modelBuilder.Entity<DescriptionProposal>()
                .Property(d => d.Status)
                .HasMaxLength(50)
                .HasDefaultValue(AiRecommendationStatuses.DescriptionProposalPending);

            modelBuilder.Entity<ActionRecommendation>(entity =>
            {
                entity.Property(a => a.ActionText).HasMaxLength(255);
                entity.Property(a => a.ImpactBadge).HasMaxLength(255);
                entity.Property(a => a.Priority).HasMaxLength(50);
                entity.Property(a => a.IsCompleted).HasDefaultValue(false);
            });

            modelBuilder.Entity<ShopSetting>()
                .HasOne(s => s.Company)
                .WithMany()
                .HasForeignKey(s => s.CompanyId)
                .OnDelete(DeleteBehavior.Restrict);

            // Genau eine Settings-Zeile pro Firma (ersetzt den früheren globalen Singleton).
            modelBuilder.Entity<ShopSetting>()
                .HasIndex(s => s.CompanyId)
                .IsUnique();

            modelBuilder.Entity<ShopSetting>(entity =>
            {
                entity.Property(s => s.ToneOfVoice)
                    .HasMaxLength(255)
                    .HasDefaultValue("Formell und sachlich");
                entity.Property(s => s.ThresholdYellow).HasDefaultValue(10.0m);
                entity.Property(s => s.ThresholdRed).HasDefaultValue(25.0m);
                entity.Property(s => s.AutoAnalyzeNewIssues).HasDefaultValue(false);
            });

            modelBuilder.Entity<RefreshToken>(entity =>
            {
                entity.HasIndex(rt => rt.TokenHash).IsUnique();
                entity.HasIndex(rt => rt.UserId);
                entity.HasIndex(rt => rt.SessionId);
                entity.Property(rt => rt.TokenHash).HasMaxLength(128);

                entity.HasOne<User>()
                    .WithMany()
                    .HasForeignKey(rt => rt.UserId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            ConfigureWawiViews(modelBuilder);
        }

        // ToView keeps EF migrations from managing WAWI objects.
        private static void ConfigureWawiViews(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<WawiItem>(e =>
            {
                e.ToView("Items", schema: "DAL");
                e.HasKey(x => x.Id);
                e.Property(x => x.Sku).HasColumnName("Identifiers_SKU");
                e.Property(x => x.SalesPriceNet).HasColumnName("Prices_SalesPriceNet");
            });

            modelBuilder.Entity<WawiItemDescription>(e =>
            {
                // Real table (unlike the other Wawi* entities, which map to DAL views) - unless
                // explicitly excluded, EF would otherwise generate migrations trying to manage
                // this WAWI-owned table, which Revolv must never create/alter/drop.
                e.ToTable("tArtikelBeschreibung", schema: "dbo", tb => tb.ExcludeFromMigrations());
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
