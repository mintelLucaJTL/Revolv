USE revolv;
GO

-- AiRecommendations.ArtikelId references WAWI dbo.tArtikel.kArtikel (no FK; different schema).
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
