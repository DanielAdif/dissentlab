import { describe, it, expect } from "vitest";
import { getPersonaStyle } from "@/lib/utils";


describe("getPersonaStyle (Scholar's Notebook)", () => {
  it("returns stripeColor for optimist", () => {
    expect(getPersonaStyle("optimist").stripeColor).toBe("#9b8f82");
  });

  it("returns stripeColor for pessimist", () => {
    expect(getPersonaStyle("pessimist").stripeColor).toBe("#5f5550");
  });

  it("returns stripeColor for contrarian", () => {
    expect(getPersonaStyle("contrarian").stripeColor).toBe("#b5a99b");
  });

  it("returns stripeColor for observer", () => {
    expect(getPersonaStyle("observer").stripeColor).toBe("#c8bdb0");
  });

  it("returns fallback stripeColor for unknown persona", () => {
    expect(getPersonaStyle("unknown").stripeColor).toBe("#9b8f82");
  });
});
