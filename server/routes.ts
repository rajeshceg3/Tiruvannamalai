import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { validateRequest } from "./middleware/validation";
import { insertVisitSchema } from "@shared/schema";
import { z } from "zod";
import "./types";
import rateLimit from "express-rate-limit";
import { calculateDistance } from "./lib/geo";

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many requests from this IP, please try again later."
});

const VERIFICATION_THRESHOLD_METERS = 200; // Distance tolerance for check-in

export async function registerRoutes(app: Express): Promise<Server> {
  // Apply rate limiting to all API routes
  app.use("/api", apiLimiter);

  // Setup Authentication
  setupAuth(app, storage);

  // --- Shrine Routes ---
  app.get("/api/shrines", async (req, res, next) => {
    try {
      const shrines = await storage.getShrines();
      res.json(shrines);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/shrines/:id", async (req, res, next) => {
    try {
      const shrine = await storage.getShrine(req.params.id);
      if (!shrine) {
        return res.status(404).json({ message: "Shrine not found" });
      }
      res.json(shrine);
    } catch (error) {
      next(error);
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
  app.get("/api/visits", requireAuth, async (req, res, next) => {
    try {
      const visits = await storage.getVisits(req.user!.id);
      res.json(visits);
    } catch (error) {
      next(error);
    }
  });

  // Create Visit (Check-in)
  app.post("/api/visits", requireAuth, validateRequest(insertVisitSchema), async (req, res, next) => {
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

        if (distance <= VERIFICATION_THRESHOLD_METERS) {
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

      res.status(201).json(visit);
    } catch (error) {
      next(error);
    }
  });

  // Update Visit Note
  app.patch("/api/visits/:id", requireAuth, validateRequest(z.object({ notes: z.string() })), async (req, res, next) => {
    try {
      const visitId = parseInt(req.params.id);
      const { notes } = req.body;

      const visit = await storage.updateVisitNote(visitId, notes);
      if (!visit) {
        return res.status(404).json({ message: "Visit not found" });
      }
      res.json(visit);
    } catch (error) {
      next(error);
    }
  });

  // Get Journey Status
  app.get("/api/journey", requireAuth, async (req, res, next) => {
    try {
      const journey = await storage.getJourney(req.user!.id);
      res.json(journey || { status: "not_started", currentShrineOrder: 0 });
    } catch (error) {
      next(error);
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
