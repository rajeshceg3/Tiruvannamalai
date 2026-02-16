import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { validateRequest } from "./middleware/validation";
import { insertVisitSchema, insertGroupSchema, joinGroupSchema, insertWaypointSchema } from "@shared/schema";
import { z } from "zod";
import rateLimit from "express-rate-limit";
import { setupWebSocket } from "./websocket";
import * as shrineController from "./controllers/shrine-controller";
import * as visitController from "./controllers/visit-controller";
import * as groupController from "./controllers/group-controller";
import { logger } from "./lib/logger";
import { scrubPII } from "./lib/scrubber";

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many requests from this IP, please try again later."
});

const telemetryLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // Limit each IP to 60 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: "Telemetry rate limit exceeded."
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Apply rate limiting to all API routes
  app.use("/api", apiLimiter);

  // Health Check
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || "1.0.0"
    });
  });

  // Setup Authentication
  setupAuth(app, storage);

  // --- Shrine Routes ---
  app.get("/api/shrines", shrineController.getShrines);
  app.get("/api/shrines/:id", shrineController.getShrine);

  // --- Protected Routes ---

  // Middleware to check authentication
  const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    next();
  };

  // Visit Routes
  app.get("/api/visits", requireAuth, visitController.getVisits);
  app.post("/api/visits", requireAuth, validateRequest(insertVisitSchema), visitController.createVisit);
  app.patch("/api/visits/:id", requireAuth, validateRequest(z.object({ notes: z.string() })), visitController.updateVisitNote);
  app.get("/api/journey", requireAuth, visitController.getJourney);

  // Group Routes
  app.post("/api/groups", requireAuth, validateRequest(insertGroupSchema), groupController.createGroup);
  app.post("/api/groups/join", requireAuth, validateRequest(joinGroupSchema), groupController.joinGroup);
  app.get("/api/groups/current", requireAuth, groupController.getCurrentGroup);

  // Command Center Routes
  app.get("/api/groups/:id/command-center", requireAuth, groupController.getGroupCommandCenter);
  app.post("/api/groups/:id/waypoints", requireAuth, validateRequest(insertWaypointSchema), groupController.createWaypoint);
  app.delete("/api/groups/:id/waypoints/:waypointId", requireAuth, groupController.deleteWaypoint);

  // AAR Route
  app.get("/api/groups/:id/aar", requireAuth, groupController.getAARData);

  // Telemetry Route (Public)
  const insertTelemetrySchema = z.object({
    level: z.enum(['info', 'warn', 'error']),
    message: z.string(),
    context: z.record(z.string(), z.unknown()).optional(),
    timestamp: z.string(),
  });

  app.post("/api/telemetry", telemetryLimiter, validateRequest(insertTelemetrySchema), (req, res) => {
    const { level, message, context, timestamp } = req.body;

    // Sanitize level (now guaranteed by schema)
    const safeContext = scrubPII(context);

    logger[level as 'info' | 'warn' | 'error'](message, { ...(safeContext as object), clientTimestamp: timestamp }, "client-telemetry");
    res.status(200).send({ status: 'ok' });
  });

  const httpServer = createServer(app);

  // --- WebSocket Setup ---
  setupWebSocket(httpServer);

  return httpServer;
}
