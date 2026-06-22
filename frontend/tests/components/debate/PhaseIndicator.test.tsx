import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PhaseIndicator } from "@/components/debate/PhaseIndicator";

describe("PhaseIndicator", () => {
  it("renders all phase labels", () => {
    render(<PhaseIndicator phase="idle" round={0} />);
    expect(screen.getByText("Researching")).toBeDefined();
    expect(screen.getByText("Initial Positions")).toBeDefined();
    expect(screen.getByText("Final Report")).toBeDefined();
  });

  it("shows Round label when debating with round > 0", () => {
    render(<PhaseIndicator phase="debating" round={2} />);
    expect(screen.getByText("Round 2")).toBeDefined();
  });

  it("shows Debate label when round is 0", () => {
    render(<PhaseIndicator phase="debating" round={0} />);
    expect(screen.getByText("Debate")).toBeDefined();
  });

  it("applies accent class to active phases", () => {
    render(<PhaseIndicator phase="positions" round={0} />);
    // "Researching" and "Initial Positions" should both render as accent (active or prior)
    const researching = screen.getByText("Researching");
    const initialPositions = screen.getByText("Initial Positions");
    expect(researching.className).toContain("text-accent");
    expect(initialPositions.className).toContain("text-accent");
  });
});
