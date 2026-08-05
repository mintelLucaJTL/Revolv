import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ArticleDetailsPanel from "../components/ArticleDetailsPanel";

vi.mock("../utils/api", () => ({
  apiFetch: vi.fn(),
}));

vi.mock("../hooks/useArticleReview", () => ({
  useArticleReview: () => ({
    aiRec: null,
    reviewProgress: { reviewedCount: 0, totalCount: 0, openCount: 0, resolvedCount: 0 },
  }),
}));

vi.mock("./ArticleReviewSections", () => ({
  default: () => null,
}));

vi.mock("@jtl-software/platform-ui-react", () => ({
  Box: ({ children, ...props }: { children?: React.ReactNode }) => <div {...props}>{children}</div>,
  Text: ({ children }: { children?: React.ReactNode }) => <span>{children}</span>,
  Card: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Button: ({ label, onClick, ...props }: { label?: string; onClick?: () => void }) => (
    <button type="button" onClick={onClick} {...props}>
      {label}
    </button>
  ),
  Badge: ({ label }: { label?: string }) => <span>{label}</span>,
}));

import { apiFetch } from "../utils/api";

const mockedApiFetch = vi.mocked(apiFetch);

function jsonResponse(data: unknown, ok = true): Response {
  return {
    ok,
    status: ok ? 200 : 500,
    json: async () => data,
    text: async () => JSON.stringify(data),
  } as Response;
}

describe("ArticleDetailsPanel articleId fetch", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    mockedApiFetch.mockReset();
    mockedApiFetch.mockResolvedValue(
      jsonResponse({
        id: "1",
        name: "Test Article",
        articleNumber: "A-1",
        aiRecommendations: [],
      }),
    );
  });

  it("requests /api/articles/{articleId} even when recommendationId differs", async () => {
    const articleId = 1;
    const recommendationId = 42;

    render(
      <ArticleDetailsPanel
        open
        onClose={() => undefined}
        article={{
          articleId,
          name: "Test Article",
          number: "A-1",
          // recommendationId is intentionally not used for the detail request
          returnRate: "low",
        }}
      />,
    );

    await waitFor(() => {
      expect(mockedApiFetch).toHaveBeenCalledWith(`/api/articles/${articleId}`);
    });

    expect(mockedApiFetch).not.toHaveBeenCalledWith(`/api/articles/${recommendationId}`);
  });
});
