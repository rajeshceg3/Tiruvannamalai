import { render, screen } from "@testing-library/react";
import { describe, it, vi, expect } from "vitest";
import MapSection from "@/components/map-section";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock Leaflet dynamic import
vi.mock("leaflet", () => {
  const mapInstance = {
    setView: vi.fn().mockReturnThis(),
    addTo: vi.fn().mockReturnThis(),
    remove: vi.fn(),
  };
  return {
    default: {
      map: () => mapInstance,
      tileLayer: () => ({ addTo: () => {} }),
      marker: () => ({ addTo: () => ({ bindPopup: () => {} }) }),
      circleMarker: () => ({ addTo: () => ({ bindPopup: () => {} }) }),
      Icon: {
        Default: {
          prototype: {},
          mergeOptions: () => {},
        },
      },
    },
  };
});

// Mock ResizeObserver for framer-motion or other layout dependent components
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock IntersectionObserver for framer-motion
class MockIntersectionObserver implements IntersectionObserver {
  readonly root: Element | Document | null = null;
  readonly rootMargin: string = "";
  readonly thresholds: ReadonlyArray<number> = [];

  constructor() {}

  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return []; }
}

global.IntersectionObserver = MockIntersectionObserver;

describe("MapSection Component", () => {
  it("renders without crashing", () => {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
            },
        },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MapSection />
      </QueryClientProvider>
    );

    // Check for the heading
    expect(screen.getByText(/Sacred Geography/i)).toBeDefined();
  });
});
