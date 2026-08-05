USE eazybusiness;
GO

-- Ticket #252: automatische KI-Analyse bei neuen QualityIssues.
-- AutoAnalyzedAt markiert, ob/wann der Background-Job (AutoAnalysisBackgroundService) dieses
-- Issue bereits geclaimt/bearbeitet hat. NULL = noch nicht bearbeitet; dient als Idempotenz-
-- Schlüssel, damit ein Issue nie zweimal automatisch analysiert wird.
IF NOT EXISTS (
    SELECT * FROM sys.columns
    WHERE object_id = OBJECT_ID(N'dbo.QualityIssues') AND name = 'AutoAnalyzedAt'
)
BEGIN
    ALTER TABLE dbo.QualityIssues
    ADD AutoAnalyzedAt DATETIME2 NULL;

    -- Issues, die bereits vor diesem Feature existierten, gelten nicht als "neu" - sie sollen
    -- vom Restart-Recovery-Scan des Background-Jobs (der alles mit AutoAnalyzedAt IS NULL erneut
    -- einreiht) nicht rückwirkend automatisch analysiert werden.
    -- EXEC(...) statt eines direkten UPDATE: sonst kompiliert SQL Server den UPDATE-Teil des
    -- Batches bereits VOR Ausführung des ALTER und bricht mit "Ungültiger Spaltenname" ab, weil
    -- die Spalte zu Kompilierzeit des Batches noch nicht existiert.
    EXEC('UPDATE dbo.QualityIssues SET AutoAnalyzedAt = SYSUTCDATETIME() WHERE AutoAnalyzedAt IS NULL');
END
GO
