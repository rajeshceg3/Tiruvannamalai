import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express, { Express } from "express";
import { registerRoutes } from "../routes";
import { storage } from "../storage";
import { User } from "@shared/schema";

// Mock storage
vi.mock("../storage", () => ({
  storage: {
    getUser: vi.fn(),
    getUserByUsername: vi.fn(),
    createUser: vi.fn(),
    getShrine: vi.fn(),
    createVisit: vi.fn(),
    getUserVisits: vi.fn(),
    createOrUpdateJourney: vi.fn(),
  },
}));

// Mock geo verification
vi.mock("../lib/geo", () => ({
  verifyLocation: vi.fn(),
  calculateDistance: vi.fn(),
}));

import { calculateDistance } from "../lib/geo";

describe("Shrine Visits API", () => {
  let app: Express;
  let mockUser: User;

  beforeEach(async () => {
    app = express();
    app.use(express.json());
    // Mock authentication middleware
    app.use((req, res, next) => {
      req.isAuthenticated = () => true;
      req.user = mockUser;
      next();
    });

    await registerRoutes(app);

    mockUser = {
      id: 1,
      username: "testuser",
      password: "hashedpassword",
      createdAt: new Date(),
    } as User;
  });

  it("should verify location and record a visit", async () => {
    const mockShrine = {
      id: "shrine-1",
      name: "Test Shrine",
      latitude: 10.0,
      longitude: 20.0,
      order: 1
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(storage.getShrine).mockResolvedValue(mockShrine as any);
    vi.mocked(calculateDistance).mockReturnValue(10); // 10 meters
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(storage.createVisit).mockResolvedValue({ id: 1, ...mockShrine } as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(storage.createOrUpdateJourney).mockResolvedValue({} as any);

    const res = await request(app)
      .post("/api/visits")
      .send({
        shrineId: "shrine-1",
        latitude: 10.0001,
        longitude: 20.0001,
      });

    expect(res.status).toBe(201);
    expect(calculateDistance).toHaveBeenCalled();
    expect(storage.createVisit).toHaveBeenCalled();
  });

  it("should mark visit as virtual if location is too far", async () => {
    const mockShrine = {
      id: "shrine-1",
      name: "Test Shrine",
      latitude: 10.0,
      longitude: 20.0,
      order: 1
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(storage.getShrine).mockResolvedValue(mockShrine as any);
    vi.mocked(calculateDistance).mockReturnValue(5000); // 5km away
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(storage.createOrUpdateJourney).mockResolvedValue({} as any);

    // We expect it to still create a visit, but with isVirtual=true
    vi.mocked(storage.createVisit).mockImplementation(async (userId, shrineId, notes, isVirtual) => {
      return {
        id: 1,
        userId,
        shrineId,
        notes,
        isVirtual, // This is what we want to verify
        visitedAt: new Date(),
        verifiedLocation: null
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;
    });

    const res = await request(app)
      .post("/api/visits")
      .send({
        shrineId: "shrine-1",
        latitude: 50.0,
        longitude: 50.0,
      });

    expect(res.status).toBe(201);
    expect(calculateDistance).toHaveBeenCalled();
    expect(storage.createVisit).toHaveBeenCalledWith(
      expect.anything(),
      "shrine-1",
      undefined,
      true, // isVirtual should be true
      null // verifiedLocation should be null
    );
  });
});
