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
            // Idempotent bootstrap: create the full EF model schema when missing, skip when
            // objects already exist (e.g. local DBs created via Database/*.sql). Safe for both
            // greenfield product installs and existing developer databases.
            migrationBuilder.Sql(@"
IF SCHEMA_ID(N'revolv') IS NULL EXEC(N'CREATE SCHEMA [revolv];');

IF OBJECT_ID(N'revolv.Articles', N'U') IS NULL
BEGIN
    CREATE TABLE [revolv].[Articles] (
        [Id] int NOT NULL IDENTITY,
        [ArticleNumber] nvarchar(max) NULL,
        [Name] nvarchar(max) NULL,
        [Category] nvarchar(max) NULL,
        [Size] nvarchar(max) NULL,
        [Color] nvarchar(max) NULL,
        CONSTRAINT [PK_Articles] PRIMARY KEY ([Id])
    );
END

IF OBJECT_ID(N'revolv.ShopSettings', N'U') IS NULL
BEGIN
    CREATE TABLE [revolv].[ShopSettings] (
        [Id] int NOT NULL IDENTITY,
        [ToneOfVoice] nvarchar(max) NOT NULL,
        [ThresholdYellow] decimal(5,2) NOT NULL,
        [ThresholdRed] decimal(5,2) NOT NULL,
        [AutoAnalyzeNewIssues] bit NOT NULL,
        CONSTRAINT [PK_ShopSettings] PRIMARY KEY ([Id])
    );
END

IF OBJECT_ID(N'revolv.Users', N'U') IS NULL
BEGIN
    CREATE TABLE [revolv].[Users] (
        [Id] int NOT NULL IDENTITY,
        [Email] nvarchar(450) NOT NULL,
        [PasswordHash] nvarchar(max) NOT NULL,
        [Name] nvarchar(max) NULL,
        [CreatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_Users] PRIMARY KEY ([Id])
    );
END
ELSE IF COL_LENGTH(N'revolv.Users', N'Name') IS NULL
BEGIN
    ALTER TABLE [revolv].[Users] ADD [Name] nvarchar(max) NULL;
END

IF OBJECT_ID(N'revolv.AiRecommendations', N'U') IS NULL
BEGIN
    CREATE TABLE [revolv].[AiRecommendations] (
        [Id] int NOT NULL IDENTITY,
        [ArticleId] int NOT NULL,
        [AiSummaryText] nvarchar(max) NULL,
        [ReturnRate] decimal(5,2) NULL,
        [IsFullyResolved] bit NOT NULL,
        CONSTRAINT [PK_AiRecommendations] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_AiRecommendations_Articles_ArticleId]
            FOREIGN KEY ([ArticleId]) REFERENCES [revolv].[Articles] ([Id]) ON DELETE CASCADE
    );
END

IF OBJECT_ID(N'revolv.ActionRecommendations', N'U') IS NULL
BEGIN
    CREATE TABLE [revolv].[ActionRecommendations] (
        [Id] int NOT NULL IDENTITY,
        [AiRecommendationId] int NOT NULL,
        [ActionText] nvarchar(max) NOT NULL,
        [ImpactBadge] nvarchar(max) NOT NULL,
        [Priority] nvarchar(max) NOT NULL,
        [IsCompleted] bit NOT NULL,
        CONSTRAINT [PK_ActionRecommendations] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_ActionRecommendations_AiRecommendations_AiRecommendationId]
            FOREIGN KEY ([AiRecommendationId]) REFERENCES [revolv].[AiRecommendations] ([Id]) ON DELETE CASCADE
    );
END

IF OBJECT_ID(N'revolv.DescriptionProposals', N'U') IS NULL
BEGIN
    CREATE TABLE [revolv].[DescriptionProposals] (
        [Id] int NOT NULL IDENTITY,
        [AiRecommendationId] int NOT NULL,
        [CurrentText] nvarchar(max) NULL,
        [ProposedText] nvarchar(max) NULL,
        [Status] nvarchar(max) NOT NULL,
        CONSTRAINT [PK_DescriptionProposals] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_DescriptionProposals_AiRecommendations_AiRecommendationId]
            FOREIGN KEY ([AiRecommendationId]) REFERENCES [revolv].[AiRecommendations] ([Id]) ON DELETE CASCADE
    );
END

IF OBJECT_ID(N'dbo.QualityIssues', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[QualityIssues] (
        [Id] int NOT NULL IDENTITY,
        [AiRecommendationId] int NOT NULL,
        [IssueText] nvarchar(max) NULL,
        [Status] nvarchar(max) NULL,
        CONSTRAINT [PK_QualityIssues] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_QualityIssues_AiRecommendations_AiRecommendationId]
            FOREIGN KEY ([AiRecommendationId]) REFERENCES [revolv].[AiRecommendations] ([Id]) ON DELETE CASCADE
    );
END

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'IX_ActionRecommendations_AiRecommendationId'
      AND object_id = OBJECT_ID(N'revolv.ActionRecommendations')
)
    CREATE INDEX [IX_ActionRecommendations_AiRecommendationId]
        ON [revolv].[ActionRecommendations] ([AiRecommendationId]);

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'IX_AiRecommendations_ArticleId'
      AND object_id = OBJECT_ID(N'revolv.AiRecommendations')
)
    CREATE INDEX [IX_AiRecommendations_ArticleId]
        ON [revolv].[AiRecommendations] ([ArticleId]);

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'IX_DescriptionProposals_AiRecommendationId'
      AND object_id = OBJECT_ID(N'revolv.DescriptionProposals')
)
    CREATE INDEX [IX_DescriptionProposals_AiRecommendationId]
        ON [revolv].[DescriptionProposals] ([AiRecommendationId]);

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'IX_QualityIssues_AiRecommendationId'
      AND object_id = OBJECT_ID(N'dbo.QualityIssues')
)
    CREATE INDEX [IX_QualityIssues_AiRecommendationId]
        ON [dbo].[QualityIssues] ([AiRecommendationId]);

-- Goal of #233: unique Email on DB level. Skip if any unique index/constraint already covers Email
-- (RevolvSchema.sql uses Email NVARCHAR(256) NOT NULL UNIQUE).
IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes AS i
    INNER JOIN sys.index_columns AS ic
        ON i.object_id = ic.object_id AND i.index_id = ic.index_id
    INNER JOIN sys.columns AS c
        ON ic.object_id = c.object_id AND ic.column_id = c.column_id
    WHERE i.object_id = OBJECT_ID(N'revolv.Users')
      AND i.is_unique = 1
      AND c.name = N'Email'
)
    CREATE UNIQUE INDEX [IX_Users_Email] ON [revolv].[Users] ([Email]);
");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF OBJECT_ID(N'revolv.ActionRecommendations', N'U') IS NOT NULL
    DROP TABLE [revolv].[ActionRecommendations];

IF OBJECT_ID(N'revolv.DescriptionProposals', N'U') IS NOT NULL
    DROP TABLE [revolv].[DescriptionProposals];

IF OBJECT_ID(N'dbo.QualityIssues', N'U') IS NOT NULL
    DROP TABLE [dbo].[QualityIssues];

IF OBJECT_ID(N'revolv.ShopSettings', N'U') IS NOT NULL
    DROP TABLE [revolv].[ShopSettings];

IF OBJECT_ID(N'revolv.Users', N'U') IS NOT NULL
    DROP TABLE [revolv].[Users];

IF OBJECT_ID(N'revolv.AiRecommendations', N'U') IS NOT NULL
    DROP TABLE [revolv].[AiRecommendations];

IF OBJECT_ID(N'revolv.Articles', N'U') IS NOT NULL
    DROP TABLE [revolv].[Articles];
");
        }
    }
}
