import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import express from "express";
import { registerRoutes } from "../routes";
import { Server } from "http";

describe("API Routes", () => {
  let app: express.Express;
  let server: Server;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let agent: any;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));

    // Mock session and passport for testing
    // In a real integration test we might want to use the real setupAuth,
    // but avoiding rate limits and complexity is often better for basic route testing.
    // However, registerRoutes calls setupAuth.
    // So we just need to ensure we can auth.

    // We'll use the real app setup via registerRoutes
    server = await registerRoutes(app);
    agent = request.agent(app);
  });

  afterAll(() => {
    server.close();
  });

  describe("Public Routes", () => {
    it("GET /api/shrines should return list of shrines", async () => {
      const res = await agent.get("/api/shrines");
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it("GET /api/shrines/:id should return shrine details", async () => {
      const res = await agent.get("/api/shrines/indra-lingam");
      expect(res.status).toBe(200);
      expect(res.body.id).toBe("indra-lingam");
    });

    it("GET /api/shrines/:id with invalid id should return 404", async () => {
      const res = await agent.get("/api/shrines/invalid-id");
      expect(res.status).toBe(404);
    });
  });

  describe("Authentication Flow", () => {
    const testUser = {
      username: "integration_test_user",
      password: "password123"
    };

    it("POST /api/register should create a new user", async () => {
      const res = await agent.post("/api/register").send(testUser);
      expect(res.status).toBe(201);
      expect(res.body.username).toBe(testUser.username);
      expect(res.body.password).toBeUndefined(); // Should be sanitized
    });

    it("POST /api/login should login the user", async () => {
      const res = await agent.post("/api/login").send(testUser);
      expect(res.status).toBe(200);
      expect(res.body.username).toBe(testUser.username);
    });

    it("GET /api/user should return current user", async () => {
      const res = await agent.get("/api/user");
      expect(res.status).toBe(200);
      expect(res.body.username).toBe(testUser.username);
    });
  });
});
