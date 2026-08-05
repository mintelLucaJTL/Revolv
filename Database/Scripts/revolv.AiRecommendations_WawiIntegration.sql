USE eazybusiness;
GO

-- Migrate AiRecommendations from revolv.Articles FK to WAWI ArtikelId. Idempotent.

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
