USE eazybusiness;
GO

-- Audit-Log fuer jeden Versuch, einen KI-Beschreibungsvorschlag in die live WAWI-Datenbank
-- (dbo.tArtikelBeschreibung.cBeschreibung) zu uebernehmen - der einzige Schreibzugriff dieser
-- App auf eine sonst rein lesend genutzte externe Datenbank. Jeder Versuch (Erfolg wie
-- Fehlschlag) wird protokolliert, inkl. eines Snapshots der ueberschriebenen Texte, damit ein
-- Mensch die vorherigen Werte im Zweifel manuell wiederherstellen kann - es gibt kein
-- automatisches Undo.
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'revolv.DescriptionPushLog') AND type IN (N'U'))
BEGIN
    CREATE TABLE [revolv].[DescriptionPushLog] (
        [Id] INT IDENTITY(1,1) PRIMARY KEY,
        [DescriptionProposalId] INT NOT NULL,
        [ArtikelId] INT NOT NULL,                     -- WAWI-Artikel (kArtikel), kein FK (anderes Schema)
        [PushedAt] DATETIME2 NOT NULL,
        [PushedByUserId] INT NOT NULL,
        [PreviousTextSnapshot] NVARCHAR(MAX) NULL,     -- JSON: [{SpracheId,PlattformId,ShopId,PreviousText}, ...]
        [NewText] NVARCHAR(MAX) NOT NULL,
        [RowsAffected] INT NOT NULL,
        [Status] NVARCHAR(20) NOT NULL,                -- "Success" | "Failed"
        [ErrorMessage] NVARCHAR(2000) NULL
    );
END
GO

-- Restrict statt Cascade: das Audit-Log muss auch dann erhalten bleiben, wenn der zugehoerige
-- Vorschlag irgendwann geloescht wird.
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_DescriptionPushLog_DescriptionProposals')
BEGIN
    ALTER TABLE [revolv].[DescriptionPushLog]
    ADD CONSTRAINT FK_DescriptionPushLog_DescriptionProposals
    FOREIGN KEY ([DescriptionProposalId]) REFERENCES [revolv].[DescriptionProposals]([Id]);
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_DescriptionPushLog_DescriptionProposalId')
BEGIN
    CREATE INDEX IX_DescriptionPushLog_DescriptionProposalId ON [revolv].[DescriptionPushLog] ([DescriptionProposalId]);
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_DescriptionPushLog_ArtikelId')
BEGIN
    CREATE INDEX IX_DescriptionPushLog_ArtikelId ON [revolv].[DescriptionPushLog] ([ArtikelId]);
END
GO
