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

                    // ART-1: Hohe Retourenquote (> 25%) - Fall für die rote Ampel
                    new Article
                    {
                        ArticleNumber = "ART-1",
                        Name = "Boyfriend Jeans Vintage",
                        Category = "Hosen",
                        Size = "M",
                        Color = "Schwarz",
                        AiRecommendations = new List<AiRecommendation>
                        {
                            new AiRecommendation
                            {
                                ReturnRate = 28.5m,
                                AiSummaryText = "Kunden beschweren sich extrem oft über die Passform. Die Hose fällt am Bund viel zu eng aus.",
                                IsFullyResolved = false,
                                QualityIssues = new List<QualityIssue>
                                {
                                    new QualityIssue { IssueText = "Bundweite entspricht nicht den Standard-Maßen.", Status = "Offen" }
                                },
                                DescriptionProposals = new List<DescriptionProposal>
                                {
                                    new DescriptionProposal
                                    {
                                        CurrentText = "Lässige Boyfriend Jeans für den Alltag.",
                                        ProposedText = "Lässige Boyfriend Jeans für den Alltag. Achtung: Fällt am Bund klein aus, bitte eine Nummer größer bestellen.",
                                        Status = "Ausstehend"
                                    }
                                },
                                ActionRecommendations = new List<ActionRecommendation>
                                {
                                    new ActionRecommendation { ActionText = "Maßtabelle im Shop aktualisieren", ImpactBadge = "-12% Retouren", Priority = "High", IsCompleted = false },
                                    new ActionRecommendation { ActionText = "Lieferanten bezüglich Schnittmuster kontaktieren", ImpactBadge = "Langfristig", Priority = "Medium", IsCompleted = false }
                                }
                            }
                        }
                    },

                    // ART-2: Mittlere Retourenquote (10% - 25%) - Fall für die gelbe Ampel
                    new Article
                    {
                        ArticleNumber = "ART-2",
                        Name = "Leinen-Blazer Sommer",
                        Category = "Jacken",
                        Size = "L",
                        Color = "Blau",
                        AiRecommendations = new List<AiRecommendation>
                        {
                            new AiRecommendation
                            {
                                ReturnRate = 18.2m,
                                AiSummaryText = "Der Stoff knittert stark beim Transport. Viele Kunden denken, es sei schlechte Qualität.",
                                IsFullyResolved = false,
                                QualityIssues = new List<QualityIssue>
                                {
                                    new QualityIssue { IssueText = "Starke Faltenbildung nach dem Auspacken.", Status = "In Prüfung" }
                                },
                                DescriptionProposals = new List<DescriptionProposal>
                                {
                                    new DescriptionProposal
                                    {
                                        CurrentText = "Eleganter Leinen-Blazer.",
                                        ProposedText = "Eleganter Leinen-Blazer. Hinweis: Leinen ist ein Naturstoff und bekommt beim Tragen edle Knitterfalten.",
                                        Status = "Ausstehend"
                                    }
                                },
                                ActionRecommendations = new List<ActionRecommendation>
                                {
                                    new ActionRecommendation { ActionText = "Pflegehinweise für Leinen prominent platzieren", ImpactBadge = "-5% Retouren", Priority = "Medium", IsCompleted = false }
                                }
                            }
                        }
                    },

                    // ART-3: Niedrige Retourenquote (< 10%) - Fall für die grüne Ampel (Bereits gelöst)
                    new Article
                    {
                        ArticleNumber = "ART-3",
                        Name = "Basic Baumwoll-Shirt",
                        Category = "Shirts",
                        Size = "S",
                        Color = "Weiß",
                        AiRecommendations = new List<AiRecommendation>
                        {
                            new AiRecommendation
                            {
                                ReturnRate = 4.1m,
                                AiSummaryText = "Keine auffälligen Probleme. Nach der letzten Anpassung der Beschreibung sind die Retouren gesunken.",
                                IsFullyResolved = true,
                                QualityIssues = new List<QualityIssue>(),
                                DescriptionProposals = new List<DescriptionProposal>(),
                                ActionRecommendations = new List<ActionRecommendation>
                                {
                                    new ActionRecommendation { ActionText = "Beschreibung wurde angepasst", ImpactBadge = "Erledigt", Priority = "Low", IsCompleted = true }
                                }
                            }
                        }
                    },

                    // ART-4: Ein weiterer kritischer Fall
                    new Article
                    {
                        ArticleNumber = "ART-4",
                        Name = "Laufschuhe Speed X",
                        Category = "Schuhe",
                        Size = "42",
                        Color = "Schwarz",
                        AiRecommendations = new List<AiRecommendation>
                        {
                            new AiRecommendation
                            {
                                ReturnRate = 32.4m,
                                AiSummaryText = "Die Sohle löst sich nach wenigen Wochen. Massive Qualitätsmängel gemeldet.",
                                IsFullyResolved = false,
                                QualityIssues = new List<QualityIssue>
                                {
                                    new QualityIssue { IssueText = "Kleber der Sohle hält Belastung nicht stand.", Status = "Ticket erstellt" }
                                },
                                DescriptionProposals = new List<DescriptionProposal>(),
                                ActionRecommendations = new List<ActionRecommendation>
                                {
                                    new ActionRecommendation { ActionText = "Verkauf sofort stoppen", ImpactBadge = "Kritisch", Priority = "High", IsCompleted = false },
                                    new ActionRecommendation { ActionText = "Charge beim Hersteller reklamieren", ImpactBadge = "Finanziell", Priority = "High", IsCompleted = false }
                                }
                            }
                        }
                    },

                    // ART-5: Optisches Problem
                    new Article
                    {
                        ArticleNumber = "ART-5",
                        Name = "Abendkleid 'Midnight'",
                        Category = "Kleider",
                        Size = "XS",
                        Color = "Schwarz",
                        AiRecommendations = new List<AiRecommendation>
                        {
                            new AiRecommendation
                            {
                                ReturnRate = 14.8m,
                                AiSummaryText = "Die Farbe auf den Produktbildern wirkt viel heller als in der Realität.",
                                IsFullyResolved = false,
                                QualityIssues = new List<QualityIssue>
                                {
                                    new QualityIssue { IssueText = "Farbabweichung zwischen Shop-Bildern und realem Produkt.", Status = "Offen" }
                                },
                                DescriptionProposals = new List<DescriptionProposal>(),
                                ActionRecommendations = new List<ActionRecommendation>
                                {
                                    new ActionRecommendation { ActionText = "Produktbilder neu fotografieren (ohne starken Filter)", ImpactBadge = "-8% Retouren", Priority = "Medium", IsCompleted = false }
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