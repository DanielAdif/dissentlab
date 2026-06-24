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
});
