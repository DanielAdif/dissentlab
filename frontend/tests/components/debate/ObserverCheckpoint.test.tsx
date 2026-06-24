import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ObserverCheckpointCard } from "@/components/debate/ObserverCheckpoint";
import type { ObserverCheckpoint } from "@/lib/api";

const baseCheckpoint: ObserverCheckpoint = {
  round_number: 2,
  consensus_score: 0.65,
  agreements: ["Both agree on fundamentals"],
  disagreements: ["Disagree on timeline"],
  should_continue: true,
  reason: "Still meaningful divergence.",
};

describe("ObserverCheckpointCard", () => {
  it("renders round number", () => {
    render(<ObserverCheckpointCard checkpoint={baseCheckpoint} />);
    expect(screen.getByText(/Observer — Round 2/)).toBeDefined();
  });

  it("renders consensus percentage", () => {
    render(<ObserverCheckpointCard checkpoint={baseCheckpoint} />);
    expect(screen.getByText("65%")).toBeDefined();
  });

  it("renders agreements", () => {
    render(<ObserverCheckpointCard checkpoint={baseCheckpoint} />);
    expect(screen.getByText("· Both agree on fundamentals")).toBeDefined();
  });

  it("renders disagreements", () => {
    render(<ObserverCheckpointCard checkpoint={baseCheckpoint} />);
    expect(screen.getByText("· Disagree on timeline")).toBeDefined();
  });

  it("renders reason", () => {
    render(<ObserverCheckpointCard checkpoint={baseCheckpoint} />);
    expect(screen.getByText("Still meaningful divergence.")).toBeDefined();
  });

  it("does not render agreements section when empty", () => {
    const cp = { ...baseCheckpoint, agreements: [] };
    render(<ObserverCheckpointCard checkpoint={cp} />);
    expect(screen.queryByText("Agreements")).toBeNull();
  });

  it("does not render disagreements section when empty", () => {
    const cp = { ...baseCheckpoint, disagreements: [] };
    render(<ObserverCheckpointCard checkpoint={cp} />);
    expect(screen.queryByText("Disagreements")).toBeNull();
  });
});
