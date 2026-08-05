USE eazybusiness;
GO

-- Ticket #190: feste Rollen-Referenztabelle (kein Selbstverwaltungs-UI - Rollen werden von der
-- App vorgegeben, nicht von Nutzern angelegt).
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'revolv.Roles') AND type IN (N'U'))
BEGIN
    CREATE TABLE [revolv].[Roles] (
        [Id] INT IDENTITY(1,1) PRIMARY KEY,
        [RoleName] NVARCHAR(50) NOT NULL UNIQUE
    );
END
GO

-- Seed der beiden Rollen aus Ticket #190 (Admin vs. Mitarbeiter). Idempotent per NOT EXISTS.
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
