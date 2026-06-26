import { describe, it, expect } from "vitest";
import { getPersonaStyle } from "@/lib/utils";

describe("getPersonaStyle", () => {
  it("returns correct style for optimist", () => {
    const s = getPersonaStyle("optimist");
    expect(s.bubbleBg).toBe("bg-bubble-1");
    expect(s.avatarBg).toBe("bg-optimist");
  });

  it("returns correct style for pessimist", () => {
    const s = getPersonaStyle("pessimist");
    expect(s.bubbleBg).toBe("bg-bubble-2");
    expect(s.avatarBg).toBe("bg-pessimist");
  });

  it("returns correct style for contrarian", () => {
    const s = getPersonaStyle("contrarian");
    expect(s.bubbleBg).toBe("bg-bubble-3");
    expect(s.avatarBg).toBe("bg-contrarian");
  });

  it("returns correct style for observer", () => {
    const s = getPersonaStyle("observer");
    expect(s.bubbleBg).toBe("bg-bubble-4");
    expect(s.avatarBg).toBe("bg-observer");
  });

  it("returns fallback style for unknown persona", () => {
    const s = getPersonaStyle("unknown-id");
    expect(s.bubbleBg).toBe("bg-bubble-1");
    expect(s.avatarBg).toBe("bg-optimist");
  });
});

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
