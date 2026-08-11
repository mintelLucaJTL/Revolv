USE eazybusiness;
GO

-- Erfolgsmessung-Feature: markiert, WANN ein einzelner KI-Vorschlag tatsächlich angenommen/
-- erledigt wurde. Ohne diesen Zeitpunkt gibt es keine sinnvolle "vorher/nachher"-Grenze für den
-- Retourenquote-Trend pro Artikel. NULL = (noch) nicht angenommen/erledigt.
IF NOT EXISTS (
    SELECT * FROM sys.columns
    WHERE object_id = OBJECT_ID(N'revolv.DescriptionProposals') AND name = 'AcceptedAt'
)
BEGIN
    ALTER TABLE revolv.DescriptionProposals
    ADD AcceptedAt DATETIME2 NULL;
END
GO

IF NOT EXISTS (
    SELECT * FROM sys.columns
    WHERE object_id = OBJECT_ID(N'dbo.QualityIssues') AND name = 'ResolvedAt'
)
BEGIN
    ALTER TABLE dbo.QualityIssues
    ADD ResolvedAt DATETIME2 NULL;
END
GO

IF NOT EXISTS (
    SELECT * FROM sys.columns
    WHERE object_id = OBJECT_ID(N'revolv.ActionRecommendations') AND name = 'CompletedAt'
)
BEGIN
    ALTER TABLE revolv.ActionRecommendations
    ADD CompletedAt DATETIME2 NULL;
END
GO
