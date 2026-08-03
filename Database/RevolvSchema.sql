USE revolv;
GO

IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'revolv')
BEGIN
    EXEC('CREATE SCHEMA revolv');
END
GO

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'revolv.Users') AND type in (N'U'))
BEGIN
    CREATE TABLE revolv.Users (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        Email NVARCHAR(256) NOT NULL UNIQUE,
        PasswordHash NVARCHAR(MAX) NOT NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE()
    );
END
GO
