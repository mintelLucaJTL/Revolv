USE eazybusiness;
GO

-- Re-Analyse-Sperre (ReturnAnalyticsService.GetReanalyzeGateAsync) pro Firma einstellbar statt
-- fest im Code verdrahtet - Settings-Seite, Bereich "Re-Analyse-Sperre".
IF NOT EXISTS (
    SELECT * FROM sys.columns
    WHERE object_id = OBJECT_ID(N'revolv.ShopSettings') AND name = 'MinNewReturnsForReanalyze'
)
BEGIN
    ALTER TABLE revolv.ShopSettings ADD MinNewReturnsForReanalyze INT NOT NULL DEFAULT 3;
END
GO

IF NOT EXISTS (
    SELECT * FROM sys.columns
    WHERE object_id = OBJECT_ID(N'revolv.ShopSettings') AND name = 'SignificantReasonShiftPercentagePoints'
)
BEGIN
    ALTER TABLE revolv.ShopSettings ADD SignificantReasonShiftPercentagePoints DECIMAL(5,2) NOT NULL DEFAULT 15.0;
END
GO
