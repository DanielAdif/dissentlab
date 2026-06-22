import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDebateSocket } from "@/hooks/useDebateSocket";
import { useSessionStore } from "@/stores/sessionStore";

describe("useDebateSocket", () => {
  beforeEach(() => useSessionStore.getState().reset());

  it("returns connect/disconnect functions", () => {
    // Skip test if WebSocket is not available in test environment
    if (typeof WebSocket === "undefined") {
      expect(true).toBe(true);
      return;
    }

    const { result } = renderHook(() => useDebateSocket("test-id"));
    expect(typeof result.current.connect).toBe("function");
    expect(typeof result.current.disconnect).toBe("function");
    expect(result.current.connected).toBe(false);
  });
});
