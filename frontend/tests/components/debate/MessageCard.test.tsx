/* frontend/tests/components/debate/MessageCard.test.tsx */
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
  it("renders persona name from style lookup", () => {
    render(<MessageCard message={baseMessage} personaId="optimist" />);
    expect(screen.getByText("Optimist")).toBeDefined();
  });

  it("renders content", () => {
    render(<MessageCard message={baseMessage} personaId="optimist" />);
    expect(screen.getByText("This looks promising.")).toBeDefined();
  });

  it("renders confidence badge", () => {
    render(<MessageCard message={baseMessage} personaId="optimist" />);
    expect(screen.getByText("High")).toBeDefined();
  });

  it("renders waiting placeholder when no message", () => {
    render(<MessageCard personaId="optimist" />);
    expect(screen.getByText("Preparing position…")).toBeDefined();
  });

  it("renders cited sources", () => {
    render(<MessageCard message={baseMessage} personaId="optimist" />);
    expect(screen.getByText("source-a")).toBeDefined();
  });

  it("does not render sources section when empty", () => {
    const msg = { ...baseMessage, cited_sources: [] };
    render(<MessageCard message={msg} personaId="optimist" />);
    expect(screen.queryByText("source-a")).toBeNull();
  });

  it("renders persona symbol in avatar", () => {
    render(<MessageCard message={baseMessage} personaId="optimist" />);
    expect(screen.getByText("O")).toBeDefined();
  });

  it("renders different persona correctly", () => {
    render(<MessageCard message={{ ...baseMessage, persona_id: "pessimist" }} personaId="pessimist" />);
    expect(screen.getByText("Pessimist")).toBeDefined();
    expect(screen.getByText("P")).toBeDefined();
  });
});
