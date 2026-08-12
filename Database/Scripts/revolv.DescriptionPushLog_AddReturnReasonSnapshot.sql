USE eazybusiness;
GO

-- Re-Analyse-Sperre: Snapshot der Retourengruende-Verteilung eines Artikels zum Zeitpunkt der
-- WAWI-Uebernahme (siehe ReturnAnalyticsService.GetReanalyzeGateAsync). Eine neue KI-Analyse ist
-- erst wieder sinnvoll, wenn sich seither genug neue Retouren angesammelt haben UND sich die
-- Gewichtung der Gruende signifikant verschoben hat - vorher wuerde eine neue Analyse nur
-- unnoetig KI-Anfragen verbrauchen, ohne neue Erkenntnisse zu liefern.
IF NOT EXISTS (
    SELECT * FROM sys.columns
    WHERE object_id = OBJECT_ID(N'revolv.DescriptionPushLog') AND name = 'ReturnReasonSnapshotJson'
)
BEGIN
    ALTER TABLE revolv.DescriptionPushLog ADD ReturnReasonSnapshotJson NVARCHAR(MAX) NULL;
END
GO

IF NOT EXISTS (
    SELECT * FROM sys.columns
    WHERE object_id = OBJECT_ID(N'revolv.DescriptionPushLog') AND name = 'ReturnLineItemCountAtPush'
)
BEGIN
    ALTER TABLE revolv.DescriptionPushLog ADD ReturnLineItemCountAtPush INT NOT NULL DEFAULT 0;
END
GO
