import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RoundSection } from "@/components/debate/RoundSection";

describe("RoundSection", () => {
  it("renders the label", () => {
    render(<RoundSection label="Round 1"><p>content</p></RoundSection>);
    expect(screen.getByText("Round 1")).toBeDefined();
  });

  it("shows children by default", () => {
    render(<RoundSection label="Round 1"><p>content</p></RoundSection>);
    expect(screen.getByText("content")).toBeDefined();
  });

  it("hides children after clicking the header button", async () => {
    const user = userEvent.setup();
    render(<RoundSection label="Round 1"><p>content</p></RoundSection>);
    await user.click(screen.getByRole("button"));
    expect(screen.queryByText("content")).toBeNull();
  });

  it("shows children again after a second click", async () => {
    const user = userEvent.setup();
    render(<RoundSection label="Round 1"><p>content</p></RoundSection>);
    await user.click(screen.getByRole("button"));
    await user.click(screen.getByRole("button"));
    expect(screen.getByText("content")).toBeDefined();
  });

  it("renders label with correct styling classes", () => {
    render(<RoundSection label="Round 1"><p>content</p></RoundSection>);
    const label = screen.getByText("Round 1");
    expect(label.className).toContain("text-[10px]");
    expect(label.className).toContain("font-medium");
    expect(label.className).toContain("uppercase");
    expect(label.className).toContain("tracking-[0.08em]");
    expect(label.className).toContain("text-muted");
  });

  it("does not render a chevron icon", () => {
    render(<RoundSection label="Round 1"><p>content</p></RoundSection>);
    // Check that chevron characters are not present
    expect(screen.queryByText("▶")).toBeNull();
    expect(screen.queryByText("▼")).toBeNull();
    expect(screen.queryByText("▲")).toBeNull();
  });
});
