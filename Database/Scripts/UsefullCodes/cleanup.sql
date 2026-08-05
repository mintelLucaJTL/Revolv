USE eazybusiness;
GO

-- Clears app AI tables only; does not touch WAWI data.

DELETE FROM dbo.QualityIssues;
DELETE FROM revolv.DescriptionProposals;
DELETE FROM revolv.ActionRecommendations;
DELETE FROM revolv.AiRecommendations;

DBCC CHECKIDENT ('dbo.QualityIssues', RESEED, 0);
DBCC CHECKIDENT ('revolv.DescriptionProposals', RESEED, 0);
DBCC CHECKIDENT ('revolv.ActionRecommendations', RESEED, 0);
DBCC CHECKIDENT ('revolv.AiRecommendations', RESEED, 0);
