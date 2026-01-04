import { describe, it, expect } from "vitest";
import { calculateDistance } from "../lib/geo";

describe("Geo Utils - calculateDistance", () => {
  it("should calculate distance between two points accurately (approx)", () => {
    // Distance between New York (40.7128, -74.0060) and London (51.5074, -0.1278)
    // Approx 5570 km
    const dist = calculateDistance(40.7128, -74.0060, 51.5074, -0.1278);
    expect(dist).toBeGreaterThan(5500000);
    expect(dist).toBeLessThan(5600000);
  });

  it("should return 0 for same location", () => {
    const dist = calculateDistance(10, 10, 10, 10);
    expect(dist).toBe(0);
  });

  it("should calculate short distances correctly", () => {
    // 1 degree of latitude is approx 111km
    const dist = calculateDistance(10, 10, 11, 10);
    expect(dist).toBeGreaterThan(110000);
    expect(dist).toBeLessThan(112000);
  });
});
