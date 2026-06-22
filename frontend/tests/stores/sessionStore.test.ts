import { describe, it, expect, beforeEach } from "vitest";
import { useSessionStore } from "@/stores/sessionStore";

describe("sessionStore", () => {
  beforeEach(() => useSessionStore.getState().reset());

  it("sets session and resets", () => {
    useSessionStore.getState().setSession("abc", "Should I quit my job?");
    expect(useSessionStore.getState().sessionId).toBe("abc");
    expect(useSessionStore.getState().question).toBe("Should I quit my job?");
    useSessionStore.getState().reset();
    expect(useSessionStore.getState().sessionId).toBeNull();
  });

  it("accumulates messages", () => {
    const msg = {
      round_number: 1,
      persona_id: "optimist",
      persona_name: "Optimist",
      content: "Good idea",
      cited_sources: [],
      confidence: "High",
      created_at: "",
    };
    useSessionStore.getState().addMessage(msg);
    expect(useSessionStore.getState().messages).toHaveLength(1);
  });
});
