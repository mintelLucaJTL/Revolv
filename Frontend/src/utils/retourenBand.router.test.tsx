import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import RetourenAnalyseView from "../pages/Retouren-Analyse";
import { BAND_LABELS, type RiskBand } from "./riskBand";

const BANDS: RiskBand[] = ["red", "yellow", "green"];

vi.mock("./api", () => ({
  apiFetch: vi.fn(),
}));

vi.mock("../components/TopNavigationBar", () => ({
  default: () => <div data-testid="top-nav" />,
}));

vi.mock("../components/Sidebar", () => ({
  default: () => <div data-testid="sidebar" />,
}));

vi.mock("../components/QualityReviewModal", () => ({
  default: () => null,
}));

vi.mock("@jtl-software/platform-ui-react", () => ({
  Box: ({ children, ...props }: { children?: React.ReactNode }) => <div {...props}>{children}</div>,
  Button: ({ label, onClick }: { label: string; onClick?: () => void }) => (
    <button type="button" onClick={onClick}>
      {label}
    </button>
  ),
  Card: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children?: React.ReactNode }) => <h2>{children}</h2>,
}));

import { apiFetch } from "./api";

const mockedApiFetch = vi.mocked(apiFetch);

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{`${location.pathname}${location.search}`}</div>;
}

function jsonResponse(data: unknown, ok = true): Response {
  return {
    ok,
    status: ok ? 200 : 500,
    json: async () => data,
    text: async () => JSON.stringify(data),
  } as Response;
}

describe("Retourenanalyse band router", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    mockedApiFetch.mockReset();
    mockedApiFetch.mockImplementation(async (url: string) => {
      if (url.startsWith("/api/articles/returns")) {
        return jsonResponse([]);
      }
      if (url === "/api/settings") {
        return jsonResponse({ thresholdYellow: 10, thresholdRed: 25 });
      }
      return jsonResponse({}, false);
    });
  });

  it.each(BANDS)("loads band=%s from the URL and shows the active filter", async (band) => {
    render(
      <MemoryRouter initialEntries={[`/retouren-analyse?band=${band}`]}>
        <Routes>
          <Route
            path="/retouren-analyse"
            element={
              <>
                <LocationProbe />
                <RetourenAnalyseView />
              </>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId("location").textContent).toBe(`/retouren-analyse?band=${band}`);

    await waitFor(() => {
      expect(mockedApiFetch).toHaveBeenCalledWith(`/api/articles/returns?band=${band}`);
    });

    expect(screen.getByTestId("active-band-filter")).toHaveTextContent(BAND_LABELS[band]);
    expect(screen.getByTestId("returns-empty-state")).toHaveTextContent(
      `Keine Artikel in der Risikoklasse „${BAND_LABELS[band]}“.`,
    );
  });

  it("clears the band filter and reloads the unfiltered list", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={["/retouren-analyse?band=red"]}>
        <Routes>
          <Route
            path="/retouren-analyse"
            element={
              <>
                <LocationProbe />
                <RetourenAnalyseView />
              </>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("active-band-filter")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Filter löschen" }));

    await waitFor(() => {
      expect(screen.getByTestId("location").textContent).toBe("/retouren-analyse");
      expect(mockedApiFetch).toHaveBeenCalledWith("/api/articles/returns");
    });

    expect(screen.queryByTestId("active-band-filter")).not.toBeInTheDocument();
  });
});
