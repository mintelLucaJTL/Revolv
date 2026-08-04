USE eazybusiness;
GO

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'revolv.Companies') AND type IN (N'U'))
BEGIN
    CREATE TABLE [revolv].[Companies] (
        [Id] INT IDENTITY(1,1) PRIMARY KEY,
        [Name] NVARCHAR(255) NOT NULL,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT GETDATE()
    );
END
GO
