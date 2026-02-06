
import { describe, it, expect, beforeEach } from "vitest";
import { MemStorage } from "../storage";
import { User } from "@shared/schema";

describe("MemStorage Visit Logic", () => {
  let storage: MemStorage;
  let user: User;

  beforeEach(async () => {
    storage = new MemStorage();
    user = await storage.createUser({ username: "test", password: "password" });
  });

  it("should allow re-visiting after 10 minutes", async () => {
    // 1. Create first visit
    const v1 = await storage.createVisit(user.id, "shrine-1", "first visit");

    // 2. Try creating immediate duplicate - should return same visit
    const v2 = await storage.createVisit(user.id, "shrine-1", "duplicate attempt");
    expect(v2.id).toBe(v1.id);
    expect(v2.notes).toBe("first visit"); // Notes shouldn't change on duplicate return

    // 3. Mock time travel (11 minutes later)
    // We can't easily mock Date inside the class without dependency injection or global mock
    // But we can check the implementation: it compares visitedAt vs Date.now() - 10m

    // Let's manually manipulate the visitedAt of the stored visit
    const visits = await storage.getVisits(user.id);
    const existing = visits[0];

    // Set it to 15 mins ago
    // We need to access the map or hack the object reference if it's the same
    // getVisits returns array of values, objects are references in MemStorage
    existing.visitedAt = new Date(Date.now() - 15 * 60 * 1000);

    // 4. Try creating new visit
    const v3 = await storage.createVisit(user.id, "shrine-1", "new visit");
    expect(v3.id).not.toBe(v1.id);
    expect(v3.notes).toBe("new visit");
  });
});
