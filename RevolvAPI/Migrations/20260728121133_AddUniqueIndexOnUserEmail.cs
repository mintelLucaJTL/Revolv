using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RevolvAPI.Migrations
{
    /// <inheritdoc />
    public partial class AddUniqueIndexOnUserEmail : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "revolv");

            migrationBuilder.EnsureSchema(
                name: "dbo");

            migrationBuilder.CreateTable(
                name: "Articles",
                schema: "revolv",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ArticleNumber = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Category = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Size = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Color = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Articles", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ShopSettings",
                schema: "revolv",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ToneOfVoice = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ThresholdYellow = table.Column<decimal>(type: "decimal(5,2)", precision: 5, scale: 2, nullable: false),
                    ThresholdRed = table.Column<decimal>(type: "decimal(5,2)", precision: 5, scale: 2, nullable: false),
                    AutoAnalyzeNewIssues = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ShopSettings", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Users",
                schema: "revolv",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Email = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    PasswordHash = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Users", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "AiRecommendations",
                schema: "revolv",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ArticleId = table.Column<int>(type: "int", nullable: false),
                    AiSummaryText = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ReturnRate = table.Column<decimal>(type: "decimal(5,2)", precision: 5, scale: 2, nullable: true),
                    IsFullyResolved = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AiRecommendations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AiRecommendations_Articles_ArticleId",
                        column: x => x.ArticleId,
                        principalSchema: "revolv",
                        principalTable: "Articles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ActionRecommendations",
                schema: "revolv",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    AiRecommendationId = table.Column<int>(type: "int", nullable: false),
                    ActionText = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ImpactBadge = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Priority = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    IsCompleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ActionRecommendations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ActionRecommendations_AiRecommendations_AiRecommendationId",
                        column: x => x.AiRecommendationId,
                        principalSchema: "revolv",
                        principalTable: "AiRecommendations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "DescriptionProposals",
                schema: "revolv",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    AiRecommendationId = table.Column<int>(type: "int", nullable: false),
                    CurrentText = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ProposedText = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Status = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DescriptionProposals", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DescriptionProposals_AiRecommendations_AiRecommendationId",
                        column: x => x.AiRecommendationId,
                        principalSchema: "revolv",
                        principalTable: "AiRecommendations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "QualityIssues",
                schema: "dbo",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    AiRecommendationId = table.Column<int>(type: "int", nullable: false),
                    IssueText = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Status = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_QualityIssues", x => x.Id);
                    table.ForeignKey(
                        name: "FK_QualityIssues_AiRecommendations_AiRecommendationId",
                        column: x => x.AiRecommendationId,
                        principalSchema: "revolv",
                        principalTable: "AiRecommendations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ActionRecommendations_AiRecommendationId",
                schema: "revolv",
                table: "ActionRecommendations",
                column: "AiRecommendationId");

            migrationBuilder.CreateIndex(
                name: "IX_AiRecommendations_ArticleId",
                schema: "revolv",
                table: "AiRecommendations",
                column: "ArticleId");

            migrationBuilder.CreateIndex(
                name: "IX_DescriptionProposals_AiRecommendationId",
                schema: "revolv",
                table: "DescriptionProposals",
                column: "AiRecommendationId");

            migrationBuilder.CreateIndex(
                name: "IX_QualityIssues_AiRecommendationId",
                schema: "dbo",
                table: "QualityIssues",
                column: "AiRecommendationId");

            migrationBuilder.CreateIndex(
                name: "IX_Users_Email",
                schema: "revolv",
                table: "Users",
                column: "Email",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ActionRecommendations",
                schema: "revolv");

            migrationBuilder.DropTable(
                name: "DescriptionProposals",
                schema: "revolv");

            migrationBuilder.DropTable(
                name: "QualityIssues",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "ShopSettings",
                schema: "revolv");

            migrationBuilder.DropTable(
                name: "Users",
                schema: "revolv");

            migrationBuilder.DropTable(
                name: "AiRecommendations",
                schema: "revolv");

            migrationBuilder.DropTable(
                name: "Articles",
                schema: "revolv");
        }
    }
}
