USE eazybusiness;
GO

-- Create the 'ShopSettings' table in the 'revolv' schema
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'revolv.ShopSettings') AND type in (N'U'))
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
