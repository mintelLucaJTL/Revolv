USE eazybusiness;
GO

-- Feature: KI-Beschreibungsvorschlag per Knopfdruck in die live WAWI-Artikelbeschreibung
-- uebernehmen (siehe WawiDescriptionPushService). PushedToWawiAt markiert, ob/wann das fuer
-- diesen Vorschlag bereits passiert ist - NULL = noch nicht. Dient als Idempotenz-Schluessel,
-- damit ein Vorschlag nie zweimal in WAWI geschrieben wird (analog zu
-- dbo.QualityIssues.AutoAnalyzedAt).
IF NOT EXISTS (
    SELECT * FROM sys.columns
    WHERE object_id = OBJECT_ID(N'revolv.DescriptionProposals') AND name = 'PushedToWawiAt'
)
BEGIN
    ALTER TABLE revolv.DescriptionProposals ADD PushedToWawiAt DATETIME2 NULL;
END
GO
