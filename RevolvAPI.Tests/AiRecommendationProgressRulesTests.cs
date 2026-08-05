using RevolvAPI.Services;

namespace RevolvAPI.Tests;

public class AiRecommendationProgressRulesTests
{
    [Theory]
    [InlineData("Ausstehend", 1, 0)]
    [InlineData("Erledigt", 0, 1)]
    [InlineData("Akzeptiert", 1, 0)] // not the quality-issue resolved status
    public void QualityIssue_StatusMatrix(string status, int expectedOpen, int expectedResolved)
    {
        var counts = AiRecommendationProgressRules.Count(
            qualityIssueStatuses: [status],
            descriptionProposalStatuses: [],
            actionIsCompletedFlags: []);

        Assert.Equal(expectedOpen, counts.OpenCount);
        Assert.Equal(expectedResolved, counts.ResolvedCount);
    }

    [Theory]
    [InlineData("Ausstehend", 1, 0)]
    [InlineData("Akzeptiert", 0, 1)]
    [InlineData("Abgelehnt", 0, 1)]
    [InlineData("Erledigt", 1, 0)] // legacy/wrong status must not count as completed
    public void DescriptionProposal_StatusMatrix(string status, int expectedOpen, int expectedResolved)
    {
        var counts = AiRecommendationProgressRules.Count(
            qualityIssueStatuses: [],
            descriptionProposalStatuses: [status],
            actionIsCompletedFlags: []);

        Assert.Equal(expectedOpen, counts.OpenCount);
        Assert.Equal(expectedResolved, counts.ResolvedCount);
    }

    [Theory]
    [InlineData(false, 1, 0)]
    [InlineData(true, 0, 1)]
    public void ActionRecommendation_CompletionMatrix(bool isCompleted, int expectedOpen, int expectedResolved)
    {
        var counts = AiRecommendationProgressRules.Count(
            qualityIssueStatuses: [],
            descriptionProposalStatuses: [],
            actionIsCompletedFlags: [isCompleted]);

        Assert.Equal(expectedOpen, counts.OpenCount);
        Assert.Equal(expectedResolved, counts.ResolvedCount);
    }

    [Fact]
    public void Count_MixedItems_MatchesSharedOpenResolvedRules()
    {
        var counts = AiRecommendationProgressRules.Count(
            qualityIssueStatuses: ["Ausstehend", "Erledigt"],
            descriptionProposalStatuses: ["Akzeptiert", "Abgelehnt", "Ausstehend"],
            actionIsCompletedFlags: [true, false]);

        // open: 1 quality + 1 proposal + 1 action = 3
        // resolved: 1 quality + 2 proposals + 1 action = 4
        Assert.Equal(3, counts.OpenCount);
        Assert.Equal(4, counts.ResolvedCount);
        Assert.Equal(7, counts.TotalCount);
        Assert.False(counts.IsFullyResolved);
    }

    [Fact]
    public void Count_AllCompleted_IsFullyResolved()
    {
        var counts = AiRecommendationProgressRules.Count(
            qualityIssueStatuses: ["Erledigt"],
            descriptionProposalStatuses: ["Akzeptiert"],
            actionIsCompletedFlags: [true]);

        Assert.Equal(0, counts.OpenCount);
        Assert.Equal(3, counts.ResolvedCount);
        Assert.True(counts.IsFullyResolved);
    }

    [Fact]
    public void SelectLatestPerArticle_ArticleId1_KeepsNewestRecommendationId()
    {
        // Integration-style fixture: article id 1 with recommendation ids > 1 (diverging ID spaces).
        var rows = new (int ArticleId, int RecommendationId)[]
        {
            (1, 2),
            (1, 5),
            (1, 3),
            (7, 8),
            (7, 4),
        };

        var latest = AiRecommendationProgressRules.SelectLatestPerArticle(rows);

        Assert.Equal(2, latest.Count);
        Assert.Contains(latest, x => x.ArticleId == 1 && x.RecommendationId == 5);
        Assert.Contains(latest, x => x.ArticleId == 7 && x.RecommendationId == 8);
        Assert.DoesNotContain(latest, x => x.RecommendationId == 2);
        Assert.DoesNotContain(latest, x => x.RecommendationId == 3);
        Assert.DoesNotContain(latest, x => x.RecommendationId == 4);
    }

    [Fact]
    public void OverviewMapping_ExposesDistinctArticleAndRecommendationIds()
    {
        const int articleId = 1;
        const int recommendationId = 42;

        var latest = AiRecommendationProgressRules.SelectLatestPerArticle(
            [(articleId, recommendationId), (articleId, 10)]);

        Assert.Single(latest);
        Assert.Equal(articleId, latest[0].ArticleId);
        Assert.Equal(recommendationId, latest[0].RecommendationId);
        Assert.NotEqual(latest[0].ArticleId, latest[0].RecommendationId);
    }
}
