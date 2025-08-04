import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

export async function registerRoutes(app: Express): Promise<Server> {
  // Get all shrines
  app.get("/api/shrines", async (req, res) => {
    try {
      const shrines = await storage.getShrines();
      res.json(shrines);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch shrines" });
    }
  });

  // Get single shrine by ID
  app.get("/api/shrines/:id", async (req, res) => {
    try {
      const shrine = await storage.getShrine(req.params.id);
      if (!shrine) {
        return res.status(404).json({ message: "Shrine not found" });
      }
      res.json(shrine);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch shrine" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
