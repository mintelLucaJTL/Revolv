SELECT 
    a.Id AS ArticleId,
    a.ArticleNumber, 
    a.Name AS ProductName, 
    a.Color,
    r.ReturnRate, 
    q.Id AS QualityIssueId,
    q.IssueText AS ReturnReason, 
    q.Status AS IssueStatus
FROM 
    revolv.Articles a
LEFT JOIN 
    revolv.AiRecommendations r ON a.Id = r.ArticleId
LEFT JOIN 
    dbo.QualityIssues q ON r.Id = q.AiRecommendationId
ORDER BY 
    a.Id;