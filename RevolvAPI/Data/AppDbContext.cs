using Microsoft.EntityFrameworkCore;
using RevolvAPI.Models;

namespace RevolvAPI.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        // DbSets -> Tables in the database
        public DbSet<User> Users { get; set; }
        public DbSet<ActionRecommendation> ActionRecommendations { get; set; }
        public DbSet<DescriptionProposal> DescriptionProposals { get; set; }
        public DbSet<AiRecommendation> AiRecommendations { get; set; }
        public DbSet<Article> Articles { get; set; }
        public DbSet<QualityIssue> QualityIssues { get; set; }
        public DbSet<ShopSetting> ShopSettings { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Verhindert doppelte Accounts mit derselben E-Mail auf DB-Ebene
            // (die Prüfung in AuthController.Register allein schützt nicht vor Race Conditions).
            modelBuilder.Entity<User>()
                .HasIndex(u => u.Email)
                .IsUnique();
        }
    }
}