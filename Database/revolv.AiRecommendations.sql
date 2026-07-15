--  Tabelle 'AiRecommendations' im Schema 'revolv' erstellen
CREATE TABLE [revolv].[AiRecommendations] (
    [Id] INT IDENTITY(1,1) PRIMARY KEY,
    [ArticleId] INT NOT NULL,
    [AiSummaryText] NVARCHAR(MAX) NULL,
    [ReturnRate] DECIMAL(5,2) NULL,
    [IsFullyResolved] BIT NOT NULL DEFAULT 0
);
GO

--  Fremdschlüssel auf die Artikel-Tabelle setzen
ALTER TABLE [revolv].[AiRecommendations]
ADD CONSTRAINT FK_AiRecommendations_Articles
FOREIGN KEY ([ArticleId]) REFERENCES [revolv].[Articles]([Id]);
GO