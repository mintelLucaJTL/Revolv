using Microsoft.EntityFrameworkCore;
using Microsoft.Identity.Client;
using RevolvAPI.Models;

namespace RevolvAPI.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }

        public DbSet<User> Users { get; set; }
    }
}