USE eazybusiness;
GO

-- Joins WAWI articles to AiRecommendations / QualityIssues (ArtikelId = kArtikel).
SELECT
    art.kArtikel AS ArtikelId,
    art.cArtNr AS ArticleNumber,
    beschreibung.cName AS ProductName,
    r.ReturnRate,
    q.Id AS QualityIssueId,
    q.IssueText AS ReturnReason,
    q.Status AS IssueStatus
FROM
    dbo.tArtikel art
LEFT JOIN
    dbo.tArtikelBeschreibung beschreibung
        ON beschreibung.kArtikel = art.kArtikel AND beschreibung.kShop = 0
LEFT JOIN
    revolv.AiRecommendations r ON art.kArtikel = r.ArtikelId
LEFT JOIN
    dbo.QualityIssues q ON r.Id = q.AiRecommendationId
ORDER BY
    art.kArtikel;
