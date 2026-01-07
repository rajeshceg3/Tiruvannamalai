import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, sessionParser } from "./auth";
import { validateRequest } from "./middleware/validation";
import { insertVisitSchema, insertGroupSchema, joinGroupSchema } from "@shared/schema";
import { z } from "zod";
import "./types";
import rateLimit from "express-rate-limit";
import { calculateDistance } from "./lib/geo";
import { WebSocketServer, WebSocket } from "ws";

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many requests from this IP, please try again later."
});

const VERIFICATION_THRESHOLD_METERS = 200; // Distance tolerance for check-in
const MAX_ACCURACY_THRESHOLD_METERS = 100; // Minimum GPS accuracy required

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

        const isAccurateEnough = accuracy === undefined || accuracy <= MAX_ACCURACY_THRESHOLD_METERS;
        const isInRange = distance <= VERIFICATION_THRESHOLD_METERS;

        if (isAccurateEnough && isInRange) {
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

  // --- Group Routes ---

  // Create Group
  app.post("/api/groups", requireAuth, validateRequest(insertGroupSchema), async (req, res, next) => {
    try {
      const { name } = req.body;
      const group = await storage.createGroup(name, req.user!.id);
      res.status(201).json(group);
    } catch (error) {
      next(error);
    }
  });

  // Join Group
  app.post("/api/groups/join", requireAuth, validateRequest(joinGroupSchema), async (req, res, next) => {
    try {
      const { code } = req.body;
      const group = await storage.getGroupByCode(code);

      if (!group) {
        return res.status(404).json({ message: "Invalid group code" });
      }

      // Check if already a member
      const existingGroup = await storage.getUserGroup(req.user!.id);
      if (existingGroup && existingGroup.id === group.id) {
        return res.json({ message: "Already a member", group });
      }

      // For MVP, user can only be in one group at a time or we just track the latest join.
      // Logic in storage.getUserGroup returns the latest.
      await storage.addGroupMember(group.id, req.user!.id);

      res.json(group);
    } catch (error) {
      next(error);
    }
  });

  // Get Current Group
  app.get("/api/groups/current", requireAuth, async (req, res, next) => {
    try {
      const group = await storage.getUserGroup(req.user!.id);
      if (!group) {
        // Not in a group is a valid state, return null or empty
        return res.json(null);
      }

      const members = await storage.getGroupMembers(group.id);
      res.json({ ...group, members });
    } catch (error) {
      next(error);
    }
  });

  const httpServer = createServer(app);

  // --- WebSocket Setup ---
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on("upgrade", (request, socket, head) => {
    if (request.url === "/ws") {
      sessionParser(request as any, {} as any, () => {
        const req = request as any;
        if (!req.session || !req.session.passport || !req.session.passport.user) {
          socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
          socket.destroy();
          return;
        }

        wss.handleUpgrade(request, socket, head, (ws) => {
          // Attach user ID to the socket
          (ws as any).userId = req.session.passport.user;
          wss.emit("connection", ws, request);
        });
      });
    }
  });

  // Map to store clients: groupId -> Set<WebSocket>
  const groupClients = new Map<number, Set<WebSocket>>();

  wss.on("connection", (ws, req) => {
    let currentGroupId: number | null = null;
    // We trust this because we set it in the upgrade handler
    const currentUserId = (ws as any).userId as number;

    ws.on("message", async (data) => {
      try {
        const message = JSON.parse(data.toString());

        if (message.type === "join_group") {
          const { groupId } = message; // We ignore claimed userId

          // Validate user membership in the requested group
          const member = await storage.getUserGroup(currentUserId);

          // User MUST be in the group they are trying to join
          if (member && member.id === groupId) {
            currentGroupId = groupId;

            if (!groupClients.has(groupId)) {
              groupClients.set(groupId, new Set());
            }
            groupClients.get(groupId)!.add(ws);

            // Broadcast join
            broadcastToGroup(groupId, {
                type: "member_update",
                userId: currentUserId,
                status: "online"
            });
          } else {
             // Invalid attempt, close connection or ignore
             ws.close();
          }
        } else if (message.type === "location_update" && currentGroupId) {
          // Broadcast location to others in group
          broadcastToGroup(currentGroupId, {
            type: "location_update",
            userId: currentUserId, // Use authenticated ID
            location: message.location // { lat, lng, timestamp }
          }, ws); // Exclude sender
        }
      } catch (e) {
        console.error("WS Error:", e);
      }
    });

    ws.on("close", () => {
      if (currentGroupId && groupClients.has(currentGroupId)) {
        groupClients.get(currentGroupId)!.delete(ws);
        if (groupClients.get(currentGroupId)!.size === 0) {
          groupClients.delete(currentGroupId);
        } else {
             broadcastToGroup(currentGroupId, {
                type: "member_update",
                userId: currentUserId,
                status: "offline"
            });
        }
      }
    });
  });

  function broadcastToGroup(groupId: number, message: any, excludeWs?: WebSocket) {
    if (groupClients.has(groupId)) {
      groupClients.get(groupId)!.forEach(client => {
        if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(message));
        }
      });
    }
  }

  return httpServer;
}
