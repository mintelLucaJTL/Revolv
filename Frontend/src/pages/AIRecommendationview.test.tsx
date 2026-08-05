import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AIRecommendationView from "../pages/AIRecommendationview";

vi.mock("../utils/api", () => ({
  apiFetch: vi.fn(),
}));

vi.mock("../components/TopNavigationBar", () => ({
  default: () => <div data-testid="top-nav" />,
}));

vi.mock("../components/Sidebar", () => ({
  default: () => <div data-testid="sidebar" />,
}));

vi.mock("../components/ArticleDetailsPanel", () => ({
  default: ({
    article,
    open,
  }: {
    article: { articleId: number } | null;
    open: boolean;
  }) =>
    open && article ? (
      <div data-testid="details-panel" data-article-id={article.articleId} />
    ) : null,
}));

vi.mock("../components/ArticleCard", () => ({
  ArticleCard: ({ name, onOpen }: { name: string; onOpen?: () => void }) => (
    <button type="button" onClick={onOpen}>
      {name}
    </button>
  ),
}));

vi.mock("@jtl-software/platform-ui-react", () => ({
  Box: ({ children, ...props }: { children?: React.ReactNode }) => <div {...props}>{children}</div>,
  Card: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children?: React.ReactNode }) => <h2>{children}</h2>,
  Text: ({ children }: { children?: React.ReactNode }) => <span>{children}</span>,
  Button: ({ label, onClick }: { label: string; onClick?: () => void }) => (
    <button type="button" onClick={onClick}>
      {label}
    </button>
  ),
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

describe("AIRecommendationView articleId selection", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    mockedApiFetch.mockReset();
    mockedApiFetch.mockResolvedValue(
      jsonResponse([
        {
          articleId: 1,
          recommendationId: 42,
          name: "Artikel Eins",
          articleNumber: "A-1",
          category: "Schuhe",
          size: "",
          returnRate: "low",
          hasQualityBadge: true,
          hasDescriptionBadge: false,
          hasRecommendationBadge: false,
          openCount: 1,
          resolvedCount: 0,
        },
      ]),
    );
  });

  it("opens the panel with articleId (not recommendationId) after card click", async () => {
    const user = userEvent.setup();

    render(<AIRecommendationView />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Artikel Eins" })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Artikel Eins" }));

    const panel = await screen.findByTestId("details-panel");
    expect(panel).toHaveAttribute("data-article-id", "1");
  });
});
