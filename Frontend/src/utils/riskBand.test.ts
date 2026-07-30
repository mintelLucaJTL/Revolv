import { describe, expect, it } from "vitest";
import {
  buildRetourenAnalysePath,
  buildReturnsApiUrl,
  parseBand,
  type RiskBand,
} from "./riskBand";

const BANDS: RiskBand[] = ["red", "yellow", "green"];

describe("riskBand URL helpers", () => {
  it.each(BANDS)("buildRetourenAnalysePath(%s) routes to Retourenanalyse with band query", (band) => {
    expect(buildRetourenAnalysePath(band)).toBe(`/retouren-analyse?band=${band}`);
  });

  it.each(BANDS)("parseBand(%s) accepts valid band values", (band) => {
    expect(parseBand(band)).toBe(band);
  });

  it.each(BANDS)("buildReturnsApiUrl(%s) appends band to the returns endpoint", (band) => {
    expect(buildReturnsApiUrl(band)).toBe(`/api/articles/returns?band=${band}`);
  });

  it("parseBand rejects invalid values", () => {
    expect(parseBand(null)).toBeNull();
    expect(parseBand(undefined)).toBeNull();
    expect(parseBand("orange")).toBeNull();
    expect(parseBand("RED")).toBeNull();
  });

  it("buildReturnsApiUrl(null) returns the unfiltered endpoint", () => {
    expect(buildReturnsApiUrl(null)).toBe("/api/articles/returns");
  });
});
