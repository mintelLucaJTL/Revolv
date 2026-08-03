USE revolv;
GO

-- Migration für bestehende Datenbanken (Umstellung der Retouren-Analyse auf die echte
-- JTL-WAWI): 'AiRecommendations' hängt nicht mehr an einer eigenen 'revolv.Articles'-Tabelle,
-- sondern zeigt per 'ArtikelId' direkt auf den echten WAWI-Artikel (dbo.tArtikel.kArtikel).
-- Idempotent: kann mehrfach ausgeführt werden.

-- 1. FK auf die (nun entfallende) Articles-Tabelle entfernen, falls vorhanden.
IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_AiRecommendations_Articles')
BEGIN
    ALTER TABLE [revolv].[AiRecommendations] DROP CONSTRAINT [FK_AiRecommendations_Articles];
END
GO

-- 2. Spalte ArticleId -> ArtikelId umbenennen (falls die alte Spalte noch existiert).
IF COL_LENGTH('revolv.AiRecommendations', 'ArticleId') IS NOT NULL
   AND COL_LENGTH('revolv.AiRecommendations', 'ArtikelId') IS NULL
BEGIN
    EXEC sp_rename 'revolv.AiRecommendations.ArticleId', 'ArtikelId', 'COLUMN';
END
GO

-- 3. Eigene Artikel-Tabelle entfernen - Artikel-Stammdaten kommen jetzt aus der WAWI (dbo.tArtikel).
IF OBJECT_ID(N'revolv.Articles', N'U') IS NOT NULL
BEGIN
    DROP TABLE [revolv].[Articles];
END
GO
