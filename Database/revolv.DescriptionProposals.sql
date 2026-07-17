USE eazybusiness;
GO

-- Tabelle im Schema 'revolv' erstellen
CREATE TABLE [revolv].[DescriptionProposals] (
    [Id] INT IDENTITY(1,1) PRIMARY KEY,
    [AiRecommendationId] INT NOT NULL,
    [CurrentText] NVARCHAR(MAX) NULL,
    [ProposedText] NVARCHAR(MAX) NULL,
    [Status] NVARCHAR(50) NOT NULL DEFAULT 'Ausstehend'
);
GO

--  Fremdschlüssel (FOREIGN KEY) für die AI-Empfehlungen anlegen
ALTER TABLE [revolv].[DescriptionProposals]
ADD CONSTRAINT FK_DescriptionProposals_AiRecommendations
FOREIGN KEY ([AiRecommendationId]) REFERENCES [revolv].[AiRecommendations]([Id]);
GO