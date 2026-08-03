USE revolv;
GO

--  Tabelle 'AiRecommendations' im Schema 'revolv' erstellen
--  ArtikelId zeigt logisch auf den echten WAWI-Artikel (dbo.tArtikel.kArtikel / DAL.Items.Id).
--  Bewusst KEINE FK-Constraint hierher: der Artikel lebt im WAWI-Schema (siehe wawidb.sql),
--  nicht in einer eigenen 'revolv.Articles'-Tabelle.
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
