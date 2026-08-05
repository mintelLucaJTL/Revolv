USE eazybusiness;
GO

-- Folge-Ticket zu #190: AiRecommendations und ShopSettings brauchen CompanyId, damit
-- Controller Daten nach Firma filtern koennen. Bestehende Zeilen (aus der Zeit vor
-- Mandantentrennung) werden der "Default Company" zugeordnet - dieselbe Company, der auch
-- bestehende User zugeordnet wurden (siehe revolv.Users_AddCompanyAndRole.sql).

IF NOT EXISTS (
    SELECT * FROM sys.columns
    WHERE object_id = OBJECT_ID(N'revolv.AiRecommendations') AND name = 'CompanyId'
)
BEGIN
    ALTER TABLE revolv.AiRecommendations ADD CompanyId INT NULL;
END
GO

IF NOT EXISTS (SELECT * FROM [revolv].[Companies] WHERE [Name] = 'Default Company')
BEGIN
    INSERT INTO [revolv].[Companies] ([Name]) VALUES ('Default Company');
END
GO

UPDATE r
SET r.CompanyId = (SELECT TOP 1 Id FROM revolv.Companies WHERE Name = 'Default Company')
FROM revolv.AiRecommendations r
WHERE r.CompanyId IS NULL;
GO

IF EXISTS (
    SELECT * FROM sys.columns
    WHERE object_id = OBJECT_ID(N'revolv.AiRecommendations') AND name = 'CompanyId' AND is_nullable = 1
)
BEGIN
    ALTER TABLE revolv.AiRecommendations ALTER COLUMN CompanyId INT NOT NULL;
END
GO

IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_AiRecommendations_Companies')
BEGIN
    ALTER TABLE revolv.AiRecommendations
    ADD CONSTRAINT FK_AiRecommendations_Companies FOREIGN KEY (CompanyId) REFERENCES revolv.Companies(Id);
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_AiRecommendations_CompanyId')
BEGIN
    CREATE INDEX IX_AiRecommendations_CompanyId ON revolv.AiRecommendations (CompanyId);
END
GO

-- ShopSettings: von "eine globale Zeile fuer alle" auf "eine Zeile pro Firma" umstellen.
IF NOT EXISTS (
    SELECT * FROM sys.columns
    WHERE object_id = OBJECT_ID(N'revolv.ShopSettings') AND name = 'CompanyId'
)
BEGIN
    ALTER TABLE revolv.ShopSettings ADD CompanyId INT NULL;
END
GO

UPDATE s
SET s.CompanyId = (SELECT TOP 1 Id FROM revolv.Companies WHERE Name = 'Default Company')
FROM revolv.ShopSettings s
WHERE s.CompanyId IS NULL;
GO

-- Bisheriger Code hat sich defensiv gegen mehrere globale Settings-Zeilen abgesichert
-- (GetOrCreateSingletonAsync) - vor dem Unique-Index pro Firma sicherheitshalber aufraeumen.
DELETE s
FROM revolv.ShopSettings s
WHERE s.Id NOT IN (SELECT MIN(Id) FROM revolv.ShopSettings);
GO

IF EXISTS (
    SELECT * FROM sys.columns
    WHERE object_id = OBJECT_ID(N'revolv.ShopSettings') AND name = 'CompanyId' AND is_nullable = 1
)
BEGIN
    ALTER TABLE revolv.ShopSettings ALTER COLUMN CompanyId INT NOT NULL;
END
GO

IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_ShopSettings_Companies')
BEGIN
    ALTER TABLE revolv.ShopSettings
    ADD CONSTRAINT FK_ShopSettings_Companies FOREIGN KEY (CompanyId) REFERENCES revolv.Companies(Id);
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'UX_ShopSettings_CompanyId')
BEGIN
    CREATE UNIQUE INDEX UX_ShopSettings_CompanyId ON revolv.ShopSettings (CompanyId);
END
GO
