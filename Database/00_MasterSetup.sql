-- =============================================================================
-- Revolv - Master-Setup-Skript
-- =============================================================================
-- Legt ALLE App-eigenen Objekte (Schema `revolv` + Tabellen) in einem Rutsch an.
-- Ersetzt das manuelle, nacheinander-Ausführen der Einzelskripte in diesem Ordner.
--
-- WICHTIG:
--   - Voraussetzung ist eine bereits bestehende, laufende JTL-WAWI-Datenbank
--     (Name z. B. `revolv`, Schemas `dbo`/`DAL`). Dieses Skript legt KEINE
--     WAWI-Struktur an und rührt die WAWI-Tabellen nicht an.
--   - `Database/wawidb.sql` wird NICHT ausgeführt - es dient nur als Referenz,
--     um die WAWI-Struktur nachzuschlagen.
--   - Das Skript ist idempotent (IF NOT EXISTS ...) und kann beliebig oft
--     erneut ausgeführt werden, ohne bestehende Daten zu verlieren.
--
-- Passe bei Bedarf den Datenbanknamen in der ersten Zeile an, falls deine
-- WAWI-Datenbank nicht `revolv` heißt.
-- =============================================================================

USE revolv;
GO

-- -----------------------------------------------------------------------------
-- 1) Schema `revolv`
-- -----------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'revolv')
BEGIN
    EXEC('CREATE SCHEMA revolv');
END
GO

-- -----------------------------------------------------------------------------
-- 2) revolv.Users (Login/Registrierung) inkl. Name- und Passwort-Reset-Spalten
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- 3) revolv.AiRecommendations
--    ArtikelId zeigt logisch auf den echten WAWI-Artikel (dbo.tArtikel.kArtikel /
--    DAL.Items.Id). Bewusst KEINE FK-Constraint hierher, da der Artikel im
--    WAWI-Schema lebt, nicht in einer eigenen 'revolv.Articles'-Tabelle.
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- 4) dbo.QualityIssues (FK -> revolv.AiRecommendations)
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- 6) revolv.ActionRecommendations (FK -> revolv.AiRecommendations)
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- 7) revolv.ShopSettings
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- 8) Migration für alte Projekt-Stände mit eigener 'revolv.Articles'-Tabelle
--    (ArticleId -> ArtikelId umbenennen, revolv.Articles entfernen)
-- -----------------------------------------------------------------------------
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

PRINT 'Revolv-Setup abgeschlossen: Schema revolv + alle App-Tabellen sind vorhanden.';
GO
