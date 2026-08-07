USE eazybusiness;
GO

-- Ticket #271: Status-Werte vereinheitlicht. dbo.QualityIssues.Status hatte hier den
-- abweichenden Default 'Offen', obwohl der Rest der App (DescriptionProposal.Status,
-- AiRecommendationStatuses.QualityIssuePending in RevolvAPI/Services/
-- AiRecommendationProgressRules.cs) durchgehend 'Ausstehend' verwendet.
IF EXISTS (
    SELECT * FROM sys.default_constraints dc
    JOIN sys.columns c ON c.object_id = dc.parent_object_id AND c.column_id = dc.parent_column_id
    WHERE dc.parent_object_id = OBJECT_ID(N'dbo.QualityIssues') AND c.name = 'Status'
      AND dc.definition = N'(''Offen'')'
)
BEGIN
    DECLARE @cn sysname;
    SELECT @cn = dc.name FROM sys.default_constraints dc
    JOIN sys.columns c ON c.object_id = dc.parent_object_id AND c.column_id = dc.parent_column_id
    WHERE dc.parent_object_id = OBJECT_ID(N'dbo.QualityIssues') AND c.name = 'Status';

    EXEC('ALTER TABLE dbo.QualityIssues DROP CONSTRAINT ' + @cn);
    ALTER TABLE dbo.QualityIssues ADD DEFAULT ('Ausstehend') FOR Status;

    -- Bereits vor diesem Fix angelegte Issues mit dem alten Default nachziehen.
    UPDATE dbo.QualityIssues SET Status = 'Ausstehend' WHERE Status = 'Offen';
END
GO
