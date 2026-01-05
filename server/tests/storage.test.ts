import { describe, it, expect, beforeEach } from "vitest";
import { MemStorage } from "../storage";
import { shrineData } from "@shared/schema";

describe("MemStorage", () => {
  let storage: MemStorage;

  beforeEach(() => {
    storage = new MemStorage();
  });

  describe("Shrines", () => {
    it("should return all 8 shrines", async () => {
      const shrines = await storage.getShrines();
      expect(shrines).toHaveLength(8);
      expect(shrines[0].id).toBe("indra-lingam"); // Sorted by order
    });

    it("should return a specific shrine", async () => {
      const shrine = await storage.getShrine("agni-lingam");
      expect(shrine).toBeDefined();
      expect(shrine?.name).toBe("Agni Lingam");
    });

    it("should include Yama Lingam", async () => {
      const shrine = await storage.getShrine("yama-lingam");
      expect(shrine).toBeDefined();
      expect(shrine?.name).toBe("Yama Lingam");
      expect(shrine?.direction).toBe("South");
    });
  });

  describe("Users", () => {
    it("should create and retrieve a user", async () => {
      const newUser = { username: "testuser", password: "hashedpassword" };
      const created = await storage.createUser(newUser);

      expect(created.id).toBeDefined();
      expect(created.username).toBe(newUser.username);

      const retrieved = await storage.getUser(created.id);
      expect(retrieved).toEqual(created);
    });

    it("should find user by username", async () => {
      const newUser = { username: "testuser2", password: "hashedpassword" };
      await storage.createUser(newUser);

      const found = await storage.getUserByUsername("testuser2");
      expect(found).toBeDefined();
      expect(found?.username).toBe("testuser2");
    });
  });
});
