import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SourcePanel } from "@/components/debate/SourcePanel";
import { useSessionStore } from "@/stores/sessionStore";
import type { Source } from "@/stores/sessionStore";

describe("SourcePanel", () => {
  beforeEach(() => {
    useSessionStore.getState().reset();
  });

  it("does not render when no sources", () => {
    const { container } = render(<SourcePanel />);
    expect(container.firstChild).toBeNull();
  });

  it("renders source count in button", () => {
    const source: Source = {
      title: "Example Article",
      url: "https://example.com/article",
      domain: "example.com",
      summary: "A test source",
      persona_id: "optimist",
    };
    useSessionStore.getState().addSource(source);

    render(<SourcePanel />);
    expect(screen.getByText("Sources (1)")).toBeDefined();
  });

  it("toggles open state on button click", async () => {
    const user = userEvent.setup();
    const source: Source = {
      title: "Example Article",
      url: "https://example.com/article",
      domain: "example.com",
      summary: "A test source",
      persona_id: "optimist",
    };
    useSessionStore.getState().addSource(source);

    render(<SourcePanel />);
    const button = screen.getByText("Sources (1)");

    // Initially closed
    expect(screen.queryByText("example.com")).toBeNull();

    // Open
    await user.click(button);
    expect(screen.getByText("example.com")).toBeDefined();

    // Close
    await user.click(button);
    expect(screen.queryByText("example.com")).toBeNull();
  });

  it("renders source title as link", async () => {
    const user = userEvent.setup();
    const source: Source = {
      title: "Example Article",
      url: "https://example.com/article",
      domain: "example.com",
      summary: "A test source",
      persona_id: "optimist",
    };
    useSessionStore.getState().addSource(source);

    render(<SourcePanel />);
    await user.click(screen.getByText("Sources (1)"));

    const link = screen.getByRole("link");
    expect(link.textContent).toBe("Example Article");
    expect(link.getAttribute("href")).toBe("https://example.com/article");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
  });

  it("renders domain when title is missing", async () => {
    const user = userEvent.setup();
    const source: Source = {
      title: "",
      url: "https://example.com/article",
      domain: "example.com",
      summary: "A test source",
      persona_id: "optimist",
    };
    useSessionStore.getState().addSource(source);

    render(<SourcePanel />);
    await user.click(screen.getByText("Sources (1)"));

    const link = screen.getByRole("link");
    expect(link.textContent).toBe("example.com");
  });

  it("renders persona id", async () => {
    const user = userEvent.setup();
    const source: Source = {
      title: "Example Article",
      url: "https://example.com/article",
      domain: "example.com",
      summary: "A test source",
      persona_id: "pessimist",
    };
    useSessionStore.getState().addSource(source);

    render(<SourcePanel />);
    await user.click(screen.getByText("Sources (1)"));

    expect(screen.getByText("pessimist")).toBeDefined();
  });

  it("renders multiple sources", async () => {
    const user = userEvent.setup();
    const source1: Source = {
      title: "Article 1",
      url: "https://example1.com",
      domain: "example1.com",
      summary: "First source",
      persona_id: "optimist",
    };
    const source2: Source = {
      title: "Article 2",
      url: "https://example2.com",
      domain: "example2.com",
      summary: "Second source",
      persona_id: "pessimist",
    };
    useSessionStore.getState().addSource(source1);
    useSessionStore.getState().addSource(source2);

    render(<SourcePanel />);
    expect(screen.getByText("Sources (2)")).toBeDefined();

    await user.click(screen.getByText("Sources (2)"));

    expect(screen.getByText("Article 1")).toBeDefined();
    expect(screen.getByText("Article 2")).toBeDefined();
    expect(screen.getByText("example1.com")).toBeDefined();
    expect(screen.getByText("example2.com")).toBeDefined();
  });

  it("shows up arrow when open and down arrow when closed", async () => {
    const user = userEvent.setup();
    const source: Source = {
      title: "Example Article",
      url: "https://example.com/article",
      domain: "example.com",
      summary: "A test source",
      persona_id: "optimist",
    };
    useSessionStore.getState().addSource(source);

    const { container } = render(<SourcePanel />);
    const button = screen.getByRole("button");

    // Initially closed (down arrow)
    expect(container.textContent).toContain("▼");
    expect(container.textContent).not.toContain("▲");

    // Open (up arrow)
    await user.click(button);
    expect(container.textContent).toContain("▲");
    expect(container.textContent).not.toContain("▼");
  });
});
