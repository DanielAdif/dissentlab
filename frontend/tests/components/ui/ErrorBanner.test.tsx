import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ErrorBanner } from "@/components/ui/ErrorBanner";

describe("ErrorBanner", () => {
  it("renders the message text", () => {
    render(<ErrorBanner message="Something went wrong." />);
    expect(screen.getByText("Something went wrong.")).toBeDefined();
  });

  it("does not render a dismiss button when onDismiss is not provided", () => {
    render(<ErrorBanner message="Error" />);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("renders dismiss button showing × when onDismiss is provided", () => {
    render(<ErrorBanner message="Error" onDismiss={vi.fn()} />);
    const btn = screen.getByRole("button");
    expect(btn.textContent).toBe("×");
  });

  it("dismiss button has text-muted class", () => {
    render(<ErrorBanner message="Error" onDismiss={vi.fn()} />);
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("text-muted");
  });

  it("calls onDismiss when dismiss button is clicked", async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    render(<ErrorBanner message="Error" onDismiss={onDismiss} />);
    await user.click(screen.getByRole("button"));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("root element has bg-surface-raised and border-border classes", () => {
    const { container } = render(<ErrorBanner message="Error" />);
    const root = container.firstChild as HTMLElement;
    expect(root.className).toContain("bg-surface-raised");
    expect(root.className).toContain("border-border");
  });
});
