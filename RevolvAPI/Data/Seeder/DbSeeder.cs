using RevolvAPI.Models;


namespace RevolvAPI.Data.Seeder
{
    public class DbSeeder
    {
        public static void Seed(AppDbContext ctx)
        {
            // Create Articles
            if (!ctx.Articles.Any())
            {
                ctx.Articles.AddRange(
                    // Add articles with AiRecommendations and QualityIssues
                    new Article
                    {
                        ArticleNumber = "ART-1",
                        Name = "Boyfriend jeans",
                        Category = "Pants",
                        Size = "M",
                        AiRecommendations = new List<AiRecommendation>
                        {
                            new AiRecommendation
                            {
                                ReturnRate = 28.5m,
                                AiSummaryText = "Kunden beschweren sich oft über die Größe",
                                IsFullyResolved = false,
                                QualityIssues = new List<QualityIssue>
                                {
                                    new QualityIssue
                                    {
                                        IssueText = "Die Größe des Artikels entspricht nicht den Erwartungen der Kunden.",
                                    }
                                },
                                DescriptionProposals = new List<DescriptionProposal>
                                {
                                    new DescriptionProposal
                                    {
                                        CurrentText = "Bitte beachten Sie, dass die Größe des Artikels kleiner ausfällt als erwartet.",
                                        ProposedText = "Bequeme Jeans. Fällt klein aus, bitte eine Nummer größer bestellen.",
                                    }
                                }
                            }
                        }
                    }
                );

                ctx.SaveChanges();
            }
        }
    }
}
