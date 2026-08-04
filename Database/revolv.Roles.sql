USE eazybusiness;
GO


IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'revolv.Roles') AND type IN (N'U'))
BEGIN
    CREATE TABLE [revolv].[Roles] (
        [Id] INT IDENTITY(1,1) PRIMARY KEY,
        [RoleName] NVARCHAR(50) NOT NULL UNIQUE
    );
END
GO

-- Seed der beiden Rollen (Admin vs. Mitarbeiter). Idempotent per NOT EXISTS.
IF NOT EXISTS (SELECT * FROM [revolv].[Roles] WHERE [RoleName] = 'Admin')
BEGIN
    INSERT INTO [revolv].[Roles] ([RoleName]) VALUES ('Admin');
END
GO

IF NOT EXISTS (SELECT * FROM [revolv].[Roles] WHERE [RoleName] = 'Mitarbeiter')
BEGIN
    INSERT INTO [revolv].[Roles] ([RoleName]) VALUES ('Mitarbeiter');
END
GO
