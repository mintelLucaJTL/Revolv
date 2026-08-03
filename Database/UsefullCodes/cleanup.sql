-- Setzt nur die App-eigenen KI-Tabellen ('revolv'-Schema + dbo.QualityIssues) zurück.
-- Die echten WAWI-Tabellen (dbo.tArtikel, dbo.tRMRetoure, ...) werden NICHT angefasst.

-- 1. Delete all child tables
DELETE FROM dbo.QualityIssues;
DELETE FROM revolv.DescriptionProposals;
DELETE FROM revolv.ActionRecommendations;

-- 2. Delete the parent table
DELETE FROM revolv.AiRecommendations;

DBCC CHECKIDENT ('dbo.QualityIssues', RESEED, 0);
DBCC CHECKIDENT ('revolv.DescriptionProposals', RESEED, 0);
DBCC CHECKIDENT ('revolv.ActionRecommendations', RESEED, 0);
DBCC CHECKIDENT ('revolv.AiRecommendations', RESEED, 0);
