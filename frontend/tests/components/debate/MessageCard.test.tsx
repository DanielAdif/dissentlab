import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MessageCard } from "@/components/debate/MessageCard";
import type { DebateMessage } from "@/lib/api";

const baseMessage: DebateMessage = {
  round_number: 1,
  persona_id: "optimist",
  persona_name: "Optimist",
  content: "This looks promising.",
  cited_sources: ["source-a"],
  confidence: "High",
  created_at: "",
};

describe("MessageCard", () => {
  it("renders persona name", () => {
    render(<MessageCard message={baseMessage} />);
    expect(screen.getByText("Optimist")).toBeDefined();
  });

  it("renders content", () => {
    render(<MessageCard message={baseMessage} />);
    expect(screen.getByText("This looks promising.")).toBeDefined();
  });

  it("renders round number when > 0", () => {
    render(<MessageCard message={baseMessage} />);
    expect(screen.getByText("Round 1")).toBeDefined();
  });

  it("does not render round label when round_number is 0", () => {
    const msg = { ...baseMessage, round_number: 0 };
    render(<MessageCard message={msg} />);
    expect(screen.queryByText(/Round/)).toBeNull();
  });

  it("renders cited sources", () => {
    render(<MessageCard message={baseMessage} />);
    expect(screen.getByText("source-a")).toBeDefined();
  });

  it("does not render sources section when empty", () => {
    const msg = { ...baseMessage, cited_sources: [] };
    render(<MessageCard message={msg} />);
    expect(screen.queryByText("source-a")).toBeNull();
  });

  it("renders confidence", () => {
    render(<MessageCard message={baseMessage} />);
    expect(screen.getByText("· High")).toBeDefined();
  });
});
