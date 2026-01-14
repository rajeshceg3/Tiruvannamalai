import type { Express } from "express";
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
  app.get("/api/shrines", shrineController.getShrines);
  app.get("/api/shrines/:id", shrineController.getShrine);

  // --- Protected Routes ---

  // Middleware to check authentication
  const requireAuth = (req: any, res: any, next: any) => {
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

  const httpServer = createServer(app);

  // --- WebSocket Setup ---
  setupWebSocket(httpServer);

  return httpServer;
}
