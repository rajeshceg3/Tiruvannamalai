import { describe, it, expect, vi, beforeEach } from "vitest";
import { calculateJourneyStats, checkAchievements } from "../lib/analytics";
import { storage } from "../storage";
import { type Visit, type Shrine, type Achievement } from "@shared/schema";

// Mock storage
vi.mock("../storage", () => ({
  storage: {
    getVisits: vi.fn(),
    getShrines: vi.fn(),
    getAchievements: vi.fn(),
    createAchievement: vi.fn(),
  },
}));

describe("Analytics", () => {
  const mockShrines: Shrine[] = [
    { id: "1", order: 1 } as Shrine,
    { id: "2", order: 2 } as Shrine,
    { id: "3", order: 3 } as Shrine,
    { id: "4", order: 4 } as Shrine,
    { id: "5", order: 5 } as Shrine,
    { id: "6", order: 6 } as Shrine,
    { id: "7", order: 7 } as Shrine,
    { id: "8", order: 8 } as Shrine,
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(storage.getShrines).mockResolvedValue(mockShrines);
  });

  it("should calculate zero stats for new user", async () => {
    vi.mocked(storage.getVisits).mockResolvedValue([]);
    vi.mocked(storage.getAchievements).mockResolvedValue([]);

    const stats = await calculateJourneyStats(1);
    expect(stats.totalVisits).toBe(0);
    expect(stats.completionPercentage).toBe(0);
  });

  it("should calculate partial completion", async () => {
    const mockVisits = [
      { userId: 1, shrineId: "1", isVirtual: true, visitedAt: new Date() } as Visit,
      { userId: 1, shrineId: "2", isVirtual: false, visitedAt: new Date() } as Visit,
    ];
    vi.mocked(storage.getVisits).mockResolvedValue(mockVisits);
    vi.mocked(storage.getAchievements).mockResolvedValue([]);

    const stats = await calculateJourneyStats(1);
    expect(stats.totalVisits).toBe(2);
    expect(stats.physicalVisits).toBe(1);
    expect(stats.virtualVisits).toBe(1);
    expect(stats.completionPercentage).toBe(25); // 2 out of 8
  });

  it("should award Pilgrim Initiate badge", async () => {
    const mockVisits = [
      { userId: 1, shrineId: "1", isVirtual: true, visitedAt: new Date() } as Visit,
    ];
    vi.mocked(storage.getVisits).mockResolvedValue(mockVisits);
    vi.mocked(storage.getAchievements).mockResolvedValue([]);
    // Setup createAchievement to return something so it doesn't crash if awaited
    vi.mocked(storage.createAchievement).mockResolvedValue({ id: 1, badgeId: "pilgrim_initiate" } as Achievement);

    const newBadges = await checkAchievements(1);
    expect(newBadges).toContain("pilgrim_initiate");
    expect(storage.createAchievement).toHaveBeenCalledWith(1, "pilgrim_initiate");
  });

  it("should NOT award badge if already earned", async () => {
    const mockVisits = [
      { userId: 1, shrineId: "1", isVirtual: true, visitedAt: new Date() } as Visit,
    ];
    vi.mocked(storage.getVisits).mockResolvedValue(mockVisits);
    vi.mocked(storage.getAchievements).mockResolvedValue([
      { badgeId: "pilgrim_initiate" } as Achievement
    ]);

    const newBadges = await checkAchievements(1);
    expect(newBadges).not.toContain("pilgrim_initiate");
    expect(storage.createAchievement).not.toHaveBeenCalled();
  });
});
