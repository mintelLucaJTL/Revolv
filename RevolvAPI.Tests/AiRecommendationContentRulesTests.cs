using RevolvAPI.DTOs;
using RevolvAPI.Services;

namespace RevolvAPI.Tests;

public class AiRecommendationContentRulesTests
{
    [Fact]
    public void IsUsable_NullOrEmptyShell_IsFalse()
    {
        Assert.False(AiRecommendationContentRules.IsUsable(null));
        Assert.False(AiRecommendationContentRules.IsUsable(new AiResponseDTO()));
        Assert.False(AiRecommendationContentRules.IsUsable(new AiResponseDTO
        {
            Summary = "   ",
            DescriptionProposals = [],
            ActionRecommendations = [],
        }));
    }

    [Fact]
    public void IsUsable_WithVisibleContent_IsTrue()
    {
        Assert.True(AiRecommendationContentRules.IsUsable(new AiResponseDTO { Summary = "Analyse" }));
        Assert.True(AiRecommendationContentRules.IsUsable(new AiResponseDTO
        {
            DescriptionProposals = [new() { ProposedText = "Neuer Text" }],
        }));
        Assert.True(AiRecommendationContentRules.IsUsable(new AiResponseDTO
        {
            ActionRecommendations = [new() { ActionText = "Aktion" }],
        }));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("not json at all")]
    [InlineData("{ broken")]
    public void Parse_EmptyOrInvalidJson_ReturnsNull(string? raw)
    {
        Assert.Null(AiResponseParser.Parse(raw));
    }

    [Fact]
    public void Parse_EmptyJsonObject_IsNotUsableSuccess()
    {
        // Provider-Mock with empty JSON → must not count as a successful recommendation (#242).
        var parsed = AiResponseParser.Parse("""{"summary":"","descriptionProposals":[],"actionRecommendations":[]}""");

        Assert.NotNull(parsed);
        Assert.False(AiRecommendationContentRules.IsUsable(parsed));
    }

    [Fact]
    public void Parse_ValidPayload_IsUsable()
    {
        var parsed = AiResponseParser.Parse(
            """{"summary":"Retouren wegen Passform","descriptionProposals":[{"proposedText":"Besser"}],"actionRecommendations":[]}""");

        Assert.NotNull(parsed);
        Assert.True(AiRecommendationContentRules.IsUsable(parsed));
        Assert.Equal("Retouren wegen Passform", parsed!.Summary);
    }
}
