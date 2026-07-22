-- 1. Delete all child tables
DELETE FROM dbo.QualityIssues;
DELETE FROM revolv.DescriptionProposals;
DELETE FROM revolv.ActionRecommendations;

-- 2. Delete the middle table
DELETE FROM revolv.AiRecommendations;

-- 3. Delete the main table
DELETE FROM revolv.Articles;

DBCC CHECKIDENT ('dbo.QualityIssues', RESEED, 0);
DBCC CHECKIDENT ('revolv.DescriptionProposals', RESEED, 0);
DBCC CHECKIDENT ('revolv.ActionRecommendations', RESEED, 0);
DBCC CHECKIDENT ('revolv.AiRecommendations', RESEED, 0);
DBCC CHECKIDENT ('revolv.Articles', RESEED, 0);