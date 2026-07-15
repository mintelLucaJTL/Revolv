USE eazybusiness;
GO

-- Check if the table in the revolv schema already exists
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'revolv.ActionRecommendations') AND type in (N'U'))
BEGIN
    CREATE TABLE revolv.ActionRecommendations (
        Id INT IDENTITY(1,1) PRIMARY KEY, 
        AiRecommendationId INT NOT NULL, 
        ActionText NVARCHAR(255) NOT NULL, 
        ImpactBadge NVARCHAR(255), 
        Priority NVARCHAR(50), 
        IsCompleted BIT NOT NULL DEFAULT 0, 
        
        -- Set the foreign key directly when creating the table
        CONSTRAINT FK_ActionRecommendations_AiRecommendations FOREIGN KEY (AiRecommendationId) REFERENCES revolv.AiRecommendations(Id)
    );
END
GO