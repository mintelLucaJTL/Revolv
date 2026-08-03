-- Revolv master setup: creates schema `revolv` and all app tables in the WAWI database.
-- Prerequisite: an existing JTL-WAWI database (default name `eazybusiness`). Does not modify WAWI tables.
-- Idempotent — safe to re-run. Change the USE line if your DB name differs.

USE eazybusiness;
GO

-- Schema
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'revolv')
BEGIN
    EXEC('CREATE SCHEMA revolv');
END
GO

-- Users (auth)
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'revolv.Users') AND type IN (N'U'))
BEGIN
    CREATE TABLE revolv.Users (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        Email NVARCHAR(256) NOT NULL UNIQUE,
        PasswordHash NVARCHAR(MAX) NOT NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE()
    );
END
GO

IF NOT EXISTS (
    SELECT * FROM sys.columns
    WHERE object_id = OBJECT_ID(N'revolv.Users') AND name = 'Name'
)
BEGIN
    ALTER TABLE revolv.Users ADD Name NVARCHAR(256) NULL;
END
GO

IF NOT EXISTS (
    SELECT * FROM sys.columns
    WHERE object_id = OBJECT_ID(N'revolv.Users') AND name = 'PasswordResetToken'
)
BEGIN
    ALTER TABLE revolv.Users ADD PasswordResetToken NVARCHAR(256) NULL;
END
GO

IF NOT EXISTS (
    SELECT * FROM sys.columns
    WHERE object_id = OBJECT_ID(N'revolv.Users') AND name = 'ResetTokenExpires'
)
BEGIN
    ALTER TABLE revolv.Users ADD ResetTokenExpires DATETIME2 NULL;
END
GO

-- AiRecommendations: ArtikelId references WAWI dbo.tArtikel.kArtikel (no FK across schemas)
IF OBJECT_ID(N'revolv.AiRecommendations', N'U') IS NULL
BEGIN
    CREATE TABLE [revolv].[AiRecommendations] (
        [Id] INT IDENTITY(1,1) PRIMARY KEY,
        [ArtikelId] INT NOT NULL,
        [AiSummaryText] NVARCHAR(MAX) NULL,
        [ReturnRate] DECIMAL(5,2) NULL,
        [IsFullyResolved] BIT NOT NULL DEFAULT 0
    );
END
GO

-- QualityIssues
IF OBJECT_ID(N'dbo.QualityIssues', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.QualityIssues (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        AiRecommendationId INT NOT NULL,
        IssueText NVARCHAR(MAX) NOT NULL,
        Status NVARCHAR(50) NOT NULL DEFAULT 'Offen',
        AutoAnalyzedAt DATETIME2 NULL,
        CONSTRAINT FK_QualityIssues_AiRecommendations
            FOREIGN KEY (AiRecommendationId)
            REFERENCES revolv.AiRecommendations(Id)
    );
END
GO

-- Ticket #252: automatische KI-Analyse bei neuen QualityIssues (ShopSetting.AutoAnalyzeNewIssues).
-- AutoAnalyzedAt = wann der Background-Job dieses Issue geclaimt/bearbeitet hat (NULL = noch
-- nicht). Siehe auch Database/dbo.QualityIssues_AddAutoAnalyzedAt.sql.
IF NOT EXISTS (
    SELECT * FROM sys.columns
    WHERE object_id = OBJECT_ID(N'dbo.QualityIssues') AND name = 'AutoAnalyzedAt'
)
BEGIN
    ALTER TABLE dbo.QualityIssues ADD AutoAnalyzedAt DATETIME2 NULL;

    -- Bereits vor diesem Feature vorhandene Issues gelten nicht als "neu" - sie sollen vom
    -- Restart-Recovery-Scan des Background-Jobs nicht rückwirkend automatisch analysiert werden.
    UPDATE dbo.QualityIssues
    SET AutoAnalyzedAt = SYSUTCDATETIME()
    WHERE AutoAnalyzedAt IS NULL;
END
GO

-- -----------------------------------------------------------------------------
-- 5) revolv.DescriptionProposals (FK -> revolv.AiRecommendations)
-- -----------------------------------------------------------------------------
IF OBJECT_ID(N'revolv.DescriptionProposals', N'U') IS NULL
BEGIN
    CREATE TABLE [revolv].[DescriptionProposals] (
        [Id] INT IDENTITY(1,1) PRIMARY KEY,
        [AiRecommendationId] INT NOT NULL,
        [CurrentText] NVARCHAR(MAX) NULL,
        [ProposedText] NVARCHAR(MAX) NULL,
        [Status] NVARCHAR(50) NOT NULL DEFAULT 'Ausstehend'
    );
END
GO

IF NOT EXISTS (
    SELECT * FROM sys.foreign_keys WHERE name = 'FK_DescriptionProposals_AiRecommendations'
)
BEGIN
    ALTER TABLE [revolv].[DescriptionProposals]
    ADD CONSTRAINT FK_DescriptionProposals_AiRecommendations
    FOREIGN KEY ([AiRecommendationId]) REFERENCES [revolv].[AiRecommendations]([Id]);
END
GO

-- ActionRecommendations
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'revolv.ActionRecommendations') AND type IN (N'U'))
BEGIN
    CREATE TABLE revolv.ActionRecommendations (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        AiRecommendationId INT NOT NULL,
        ActionText NVARCHAR(255) NOT NULL,
        ImpactBadge NVARCHAR(255),
        Priority NVARCHAR(50),
        IsCompleted BIT NOT NULL DEFAULT 0,

        CONSTRAINT FK_ActionRecommendations_AiRecommendations
            FOREIGN KEY (AiRecommendationId) REFERENCES revolv.AiRecommendations(Id)
    );
END
GO

-- ShopSettings
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'revolv.ShopSettings') AND type IN (N'U'))
BEGIN
    CREATE TABLE [revolv].[ShopSettings] (
        [Id] INT IDENTITY(1,1) PRIMARY KEY,
        [ToneOfVoice] NVARCHAR(255) NOT NULL DEFAULT 'Formell und sachlich',
        [ThresholdYellow] DECIMAL(5,2) NOT NULL DEFAULT 10.0,
        [ThresholdRed] DECIMAL(5,2) NOT NULL DEFAULT 25.0,
        [AutoAnalyzeNewIssues] BIT NOT NULL DEFAULT 0
    );
END
GO

-- Legacy migration: drop old revolv.Articles FK/table if present
IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_AiRecommendations_Articles')
BEGIN
    ALTER TABLE [revolv].[AiRecommendations] DROP CONSTRAINT [FK_AiRecommendations_Articles];
END
GO

IF COL_LENGTH('revolv.AiRecommendations', 'ArticleId') IS NOT NULL
   AND COL_LENGTH('revolv.AiRecommendations', 'ArtikelId') IS NULL
BEGIN
    EXEC sp_rename 'revolv.AiRecommendations.ArticleId', 'ArtikelId', 'COLUMN';
END
GO

IF OBJECT_ID(N'revolv.Articles', N'U') IS NOT NULL
BEGIN
    DROP TABLE [revolv].[Articles];
END
GO

PRINT 'Revolv setup complete: schema revolv and app tables are ready.';
GO
