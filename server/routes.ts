import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { validateRequest } from "./middleware/validation";
import { insertVisitSchema, LOCATION_VERIFICATION_THRESHOLD } from "@shared/schema";
import { z } from "zod";
import "./types";
import rateLimit from "express-rate-limit";
import { calculateDistance } from "./lib/geo";
import { calculateJourneyStats, checkAchievements, BADGE_DEFINITIONS } from "./lib/analytics";

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many requests from this IP, please try again later."
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Apply rate limiting to all API routes
  app.use("/api", apiLimiter);

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
      const { shrineId, notes, latitude, longitude, accuracy } = req.body;

      // Verify shrine exists
      const shrine = await storage.getShrine(shrineId);
      if (!shrine) {
        return res.status(404).json({ message: "Invalid shrine" });
      }

      let isVirtual = true;
      let verifiedLocation = null;

      // Verification Logic
      if (latitude !== undefined && longitude !== undefined) {
        const distance = calculateDistance(latitude, longitude, shrine.latitude, shrine.longitude);

        // Check if within range (considering GPS accuracy if provided, but capping it)
        // If accuracy is huge (e.g. 2000m), we probably shouldn't trust it blindly,
        // but for now let's just use the calculated distance vs threshold.

        if (distance <= LOCATION_VERIFICATION_THRESHOLD) {
          isVirtual = false;
          verifiedLocation = {
            latitude,
            longitude,
            accuracy,
            distance,
            timestamp: new Date().toISOString()
          };
        }
      }

      const visit = await storage.createVisit(req.user!.id, shrineId, notes, isVirtual, verifiedLocation);

      // Update journey progress
      await storage.createOrUpdateJourney(req.user!.id, shrine.order);

      // Check for new achievements
      const newBadges = await checkAchievements(req.user!.id);

      res.status(201).json({ ...visit, newBadges });
    } catch (error) {
      console.error(error);
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

  // Analytics & Debrief
  app.get("/api/analytics", requireAuth, async (req, res) => {
    try {
      const stats = await calculateJourneyStats(req.user!.id);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  app.get("/api/badges", async (req, res) => {
    res.json(BADGE_DEFINITIONS);
  });

  const httpServer = createServer(app);
  return httpServer;
}
