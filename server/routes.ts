import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { validateRequest } from "./middleware/validation";
import { insertVisitSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup Authentication
  setupAuth(app, storage);

  // --- Shrine Routes ---
  app.get("/api/shrines", async (req, res) => {
    try {
      const shrines = await storage.getShrines();
      res.json(shrines);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch shrines" });
    }
  });

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

  // --- Protected Routes ---

  // Middleware to check authentication
  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    next();
  };

  // Get Visits
  app.get("/api/visits", requireAuth, async (req, res) => {
    try {
      const visits = await storage.getVisits(req.user!.id);
      res.json(visits);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch visits" });
    }
  });

  // Create Visit (Check-in)
  app.post("/api/visits", requireAuth, validateRequest(insertVisitSchema), async (req, res) => {
    try {
      const { shrineId, notes } = req.body;

      // Verify shrine exists
      const shrine = await storage.getShrine(shrineId);
      if (!shrine) {
        return res.status(404).json({ message: "Invalid shrine" });
      }

      const visit = await storage.createVisit(req.user!.id, shrineId, notes);

      // Update journey progress
      await storage.createOrUpdateJourney(req.user!.id, shrine.order);

      res.status(201).json(visit);
    } catch (error) {
      res.status(500).json({ message: "Failed to create visit" });
    }
  });

  // Update Visit Note
  app.patch("/api/visits/:id", requireAuth, validateRequest(z.object({ notes: z.string() })), async (req, res) => {
    try {
      const visitId = parseInt(req.params.id);
      const { notes } = req.body;

      const visit = await storage.updateVisitNote(visitId, notes);
      if (!visit) {
        return res.status(404).json({ message: "Visit not found" });
      }
      res.json(visit);
    } catch (error) {
      res.status(500).json({ message: "Failed to update visit" });
    }
  });

  // Get Journey Status
  app.get("/api/journey", requireAuth, async (req, res) => {
    try {
      const journey = await storage.getJourney(req.user!.id);
      res.json(journey || { status: "not_started", currentShrineOrder: 0 });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch journey" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
