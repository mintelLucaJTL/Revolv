USE eazybusiness;
GO

-- Ticket #190: Users um CompanyId/RoleId erweitern. Erfordert revolv.Companies und revolv.Roles
-- (siehe revolv.Companies.sql / revolv.Roles.sql) - vorher ausführen.

IF NOT EXISTS (
    SELECT * FROM sys.columns
    WHERE object_id = OBJECT_ID(N'revolv.Users') AND name = 'CompanyId'
)
BEGIN
    ALTER TABLE revolv.Users ADD CompanyId INT NULL;
END
GO

IF NOT EXISTS (
    SELECT * FROM sys.columns
    WHERE object_id = OBJECT_ID(N'revolv.Users') AND name = 'RoleId'
)
BEGIN
    ALTER TABLE revolv.Users ADD RoleId INT NULL;
END
GO

-- Backfill: bestehende User (aus der Zeit vor Mandantentrennung) einer gemeinsamen
-- "Default Company" zuordnen, mit Rolle Admin (sie hatten vorher uneingeschränkten Zugriff).
-- Neu registrierte User erhalten künftig ihre eigene Company + Rolle Admin (siehe AuthController).
IF NOT EXISTS (SELECT * FROM [revolv].[Companies] WHERE [Name] = 'Default Company')
BEGIN
    INSERT INTO [revolv].[Companies] ([Name]) VALUES ('Default Company');
END
GO

UPDATE u
SET u.CompanyId = (SELECT TOP 1 Id FROM revolv.Companies WHERE Name = 'Default Company')
FROM revolv.Users u
WHERE u.CompanyId IS NULL;
GO

UPDATE u
SET u.RoleId = (SELECT TOP 1 Id FROM revolv.Roles WHERE RoleName = 'Admin')
FROM revolv.Users u
WHERE u.RoleId IS NULL;
GO

-- Ab hier ist jeder User einer Company und Rolle zugeordnet - Spalten künftig als Pflichtfeld
-- führen, damit neue Inserts (Register) sie nicht mehr leer lassen können.
IF EXISTS (
    SELECT * FROM sys.columns
    WHERE object_id = OBJECT_ID(N'revolv.Users') AND name = 'CompanyId' AND is_nullable = 1
)
BEGIN
    ALTER TABLE revolv.Users ALTER COLUMN CompanyId INT NOT NULL;
END
GO

IF EXISTS (
    SELECT * FROM sys.columns
    WHERE object_id = OBJECT_ID(N'revolv.Users') AND name = 'RoleId' AND is_nullable = 1
)
BEGIN
    ALTER TABLE revolv.Users ALTER COLUMN RoleId INT NOT NULL;
END
GO

IF NOT EXISTS (
    SELECT * FROM sys.foreign_keys WHERE name = 'FK_Users_Companies'
)
BEGIN
    ALTER TABLE revolv.Users
    ADD CONSTRAINT FK_Users_Companies FOREIGN KEY (CompanyId) REFERENCES revolv.Companies(Id);
END
GO

IF NOT EXISTS (
    SELECT * FROM sys.foreign_keys WHERE name = 'FK_Users_Roles'
)
BEGIN
    ALTER TABLE revolv.Users
    ADD CONSTRAINT FK_Users_Roles FOREIGN KEY (RoleId) REFERENCES revolv.Roles(Id);
END
GO
