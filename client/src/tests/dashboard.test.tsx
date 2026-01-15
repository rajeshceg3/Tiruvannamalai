import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import DashboardPage from "@/pages/dashboard-page";
import React from "react";
import { useQuery } from "@tanstack/react-query";

// Mock hooks
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    user: { id: 1, username: "TestUser" },
    logoutMutation: { mutate: vi.fn() }
  })
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: vi.fn(),
  useMutation: () => ({ mutate: vi.fn(), isPending: false }),
  useQueryClient: () => ({
    getQueryData: vi.fn(),
    setQueryData: vi.fn(),
    cancelQueries: vi.fn(),
    invalidateQueries: vi.fn()
  })
}));

// Mock API request imports
vi.mock("@/lib/queryClient", () => ({
  apiRequest: vi.fn(),
  queryClient: {
    getQueryData: vi.fn(),
    setQueryData: vi.fn(),
    cancelQueries: vi.fn(),
    invalidateQueries: vi.fn()
  }
}));

// Mock UI components
vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: any) => <div data-testid="scroll-area">{children}</div>
}));

// Mock Sidebar components
vi.mock("@/components/layout/sidebar", () => ({
  Sidebar: () => <div data-testid="sidebar">Sidebar</div>
}));

vi.mock("@/components/layout/mobile-sidebar", () => ({
  MobileSidebar: () => <div data-testid="mobile-sidebar">Mobile</div>
}));

// Mock Toaster hook
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() })
}));

describe("DashboardPage", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders loading state when data is missing", () => {
    (useQuery as any).mockReturnValue({ data: undefined, isLoading: true });
    render(<DashboardPage />);
    const title = screen.queryByText("Dashboard");
    expect(title).toBeNull();
  });

  it("renders dashboard content when data is loaded", () => {
    (useQuery as any).mockImplementation(({ queryKey }: any) => {
      if (queryKey[0] === "/api/shrines") return { data: [{ id: "1", name: "Shrine 1", order: 1 }] };
      if (queryKey[0] === "/api/visits") return { data: [] };
      if (queryKey[0] === "/api/journey") return { data: { currentShrineOrder: 0 } };
      return { data: null };
    });

    render(<DashboardPage />);
    expect(screen.getByText("Dashboard")).toBeDefined();
    expect(screen.getByText("Namaste, TestUser")).toBeDefined();
    expect(screen.getByText("Shrines on the Path")).toBeDefined();
  });

  it("renders empty journal message when no visits", () => {
    (useQuery as any).mockImplementation(({ queryKey }: any) => {
      if (queryKey[0] === "/api/shrines") return { data: [{ id: "1", name: "Shrine 1", order: 1 }] };
      if (queryKey[0] === "/api/visits") return { data: [] };
      return { data: null };
    });

    render(<DashboardPage />);
    expect(screen.getByText("Your journal is empty.")).toBeDefined();
  });

  it("renders visits in journal", () => {
     const shrines = [{ id: "1", name: "Shrine 1", emoji: "🕉️", direction: "North", imageUrl: "img.jpg", order: 1 }];
     const visits = [{ id: 1, shrineId: "1", visitedAt: new Date().toISOString(), notes: "Test note" }];

     (useQuery as any).mockImplementation(({ queryKey }: any) => {
      if (queryKey[0] === "/api/shrines") return { data: shrines };
      if (queryKey[0] === "/api/visits") return { data: visits };
      if (queryKey[0] === "/api/journey") return { data: { currentShrineOrder: 1 } };
      return { data: null };
    });

    render(<DashboardPage />);
    // Check if the note is present in the textarea (by display value)
    expect(screen.getByDisplayValue("Test note")).toBeDefined();
  });
});
