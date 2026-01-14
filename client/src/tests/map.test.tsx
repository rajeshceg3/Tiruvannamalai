import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { GroupMap } from "@/components/groups/group-map";

// Mock React Leaflet components since they require DOM API not available in standard jsdom
vi.mock("react-leaflet", () => {
  return {
    MapContainer: ({ children, className }: any) => <div data-testid="map-container" className={className}>{children}</div>,
    TileLayer: () => <div data-testid="tile-layer" />,
    Marker: ({ children }: any) => <div data-testid="marker">{children}</div>,
    Popup: ({ children }: any) => <div data-testid="popup">{children}</div>,
    Circle: ({ children }: any) => <div data-testid="circle">{children}</div>,
    useMap: () => ({ setView: vi.fn(), fitBounds: vi.fn(), getZoom: () => 13 }),
    useMapEvents: () => ({}),
  };
});

describe("GroupMap Component", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the map container", () => {
    const members = [
        { userId: 1, username: "Operative 1", isSelf: true, location: { lat: 12, lng: 79 } }
    ];
    render(<GroupMap members={members} />);
    expect(screen.getByTestId("map-container")).toBeDefined();
  });

  it("renders markers for members with location", () => {
    const members = [
        { userId: 1, username: "Operative 1", isSelf: true, location: { lat: 12, lng: 79 } },
        { userId: 2, username: "Operative 2", isSelf: false, location: { lat: 13, lng: 80 } }
    ];
    render(<GroupMap members={members} />);
    expect(screen.getAllByTestId("marker")).toHaveLength(2);
  });

  it("does not render markers for members without location", () => {
    const members = [
        { userId: 1, username: "Operative 1", isSelf: true, location: { lat: 12, lng: 79 } },
        { userId: 2, username: "Operative 2", isSelf: false } // No location
    ];
    render(<GroupMap members={members} />);
    expect(screen.getAllByTestId("marker")).toHaveLength(1);
  });
});
