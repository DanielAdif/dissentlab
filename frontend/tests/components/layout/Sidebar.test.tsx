import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/Sidebar";

vi.mock("next/navigation", () => ({ usePathname: () => "/" }));
vi.mock("@/hooks/useSession", () => ({
  useSessionList: () => ({
    data: [
      { id: "abc", question: "Is AI safe?", created_at: "", debate_intensity: "standard" },
    ],
  }),
}));

function wrap(ui: React.ReactElement) {
  const qc = new QueryClient();
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe("Sidebar", () => {
  it("renders DissentLab wordmark", () => {
    wrap(<Sidebar />);
    expect(screen.getByText("DissentLab")).toBeDefined();
  });

  it("renders New Session link", () => {
    wrap(<Sidebar />);
    expect(screen.getByText("+ New Session")).toBeDefined();
  });

  it("renders nav links", () => {
    wrap(<Sidebar />);
    expect(screen.getByText("Models")).toBeDefined();
    expect(screen.getByText("Personas")).toBeDefined();
    expect(screen.getByText("History")).toBeDefined();
  });

  it("renders session question in list", () => {
    wrap(<Sidebar />);
    expect(screen.getByText("Is AI safe?")).toBeDefined();
  });
});
