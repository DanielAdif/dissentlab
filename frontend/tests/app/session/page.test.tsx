import { describe, it, expect, vi, beforeAll } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

// jsdom does not implement scrollIntoView
beforeAll(() => {
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
});

// Mock next/navigation before importing the page
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

// Mock React's `use` so the Promise<params> pattern works in jsdom
vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    use: (_promise: unknown) => ({ id: "session-123" }),
  };
});

vi.mock("@/hooks/useDebateSocket", () => ({
  useDebateSocket: () => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    sendStop: vi.fn(),
    connected: true,
  }),
}));

vi.mock("@/hooks/useSession", () => ({
  useSession: () => ({ data: { question: "Should AI be regulated?" } }),
}));

vi.mock("@/stores/sessionStore", () => ({
  useSessionStore: () => ({
    question: "Should AI be regulated?",
    phase: "debating",
    messages: [],
    checkpoints: [],
    sources: [],
    error: null,
    autoScroll: true,
    finalReport: null,
    reset: vi.fn(),
    setSession: vi.fn(),
    setAutoScroll: vi.fn(),
    setError: vi.fn(),
  }),
}));

vi.mock("@/components/debate/PhaseIndicator", () => ({
  PhaseIndicator: ({ phase }: { phase: string }) => (
    <span data-testid="phase-indicator">{phase}</span>
  ),
}));

vi.mock("@/components/debate/MessageCard", () => ({
  MessageCard: () => null,
}));

vi.mock("@/components/debate/ObserverCheckpoint", () => ({
  ObserverCheckpointCard: () => null,
}));

vi.mock("@/components/debate/SourcePanel", () => ({
  SourcePanel: () => null,
}));

vi.mock("@/components/ui/ErrorBanner", () => ({
  ErrorBanner: () => null,
}));

vi.mock("@/components/debate/RoundSection", () => ({
  RoundSection: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

// Import after mocks are set up
const { default: SessionPage } = await import("@/app/session/[id]/page");

describe("SessionPage header", () => {
  const mockParams = Promise.resolve({ id: "session-123" });

  it("renders the question with font-serif class", () => {
    render(<SessionPage params={mockParams} />);
    const questionEl = screen.getByText("Should AI be regulated?");
    expect(questionEl.className).toContain("font-serif");
  });

  it("renders the question with italic class", () => {
    render(<SessionPage params={mockParams} />);
    const questionEl = screen.getByText("Should AI be regulated?");
    expect(questionEl.className).toContain("italic");
  });

  it("renders the question with text-[15px] class", () => {
    render(<SessionPage params={mockParams} />);
    const questionEl = screen.getByText("Should AI be regulated?");
    expect(questionEl.className).toContain("text-[15px]");
  });

  it("renders PhaseIndicator in the header", () => {
    render(<SessionPage params={mockParams} />);
    expect(screen.getByTestId("phase-indicator")).toBeDefined();
  });

  it("does not render chevron characters in the header", () => {
    render(<SessionPage params={mockParams} />);
    expect(screen.queryByText("›")).toBeNull();
    expect(screen.queryByText("»")).toBeNull();
    expect(screen.queryByText("▶")).toBeNull();
    expect(screen.queryByText("▼")).toBeNull();
    expect(screen.queryByText("▲")).toBeNull();
  });

  it("renders auto-scroll toggle button", () => {
    render(<SessionPage params={mockParams} />);
    expect(screen.getByText("Pause scroll")).toBeDefined();
  });

  it("renders stop button", () => {
    render(<SessionPage params={mockParams} />);
    expect(screen.getByText("Stop")).toBeDefined();
  });
});
