import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { Server, IncomingMessage } from "http";
import { getSessionMiddleware } from "./auth";
import { wsMessageSchema, type ServerToClientMessage } from "@shared/schema";
import { locationService } from "./services/location-service";
import { logger } from "./lib/logger";
import { Request, Response } from "express";

// UserSocket must be exported or used consistently
export interface UserSocket extends WebSocket {
  userId: number;
}

// Extend IncomingMessage to support session
export interface SessionRequest extends IncomingMessage {
  session?: {
    passport?: {
      user?: number;
    };
  };
}

export function setupWebSocket(httpServer: Server) {
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on("upgrade", (request, socket, head) => {
    if (request.url === "/ws") {
      const sessionMiddleware = getSessionMiddleware();

      // Use the session middleware to attach session to the request
      // We cast to Request/Response to satisfy express-session types (which expects Express.Request).
      // IncomingMessage is compatible enough for session parsing purposes here.
      sessionMiddleware(request as unknown as Request, {} as unknown as Response, () => {
        const req = request as SessionRequest;

        if (!req.session?.passport?.user) {
          socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
          socket.destroy();
          return;
        }

        wss.handleUpgrade(request, socket, head, (ws) => {
          const userSocket = ws as UserSocket;
          userSocket.userId = req.session!.passport!.user!;
          wss.emit("connection", userSocket, request);
        });
      });
    }
  });

  // Map to store clients: groupId -> Set<UserSocket>
  const groupClients = new Map<number, Set<UserSocket>>();

  wss.on("connection", (ws: WebSocket, _req) => {
    // Cast to UserSocket safely as we ensured it in handleUpgrade
    const userSocket = ws as UserSocket;
    const currentUserId = userSocket.userId;
    let currentGroupId: number | null = null;

    userSocket.on("message", async (data) => {
      try {
        let raw;
        try {
           raw = JSON.parse(data.toString());
        } catch {
           return; // Invalid JSON, ignore silently
        }

        const validation = wsMessageSchema.safeParse(raw);
        if (!validation.success) {
           logger.error("Invalid WS Message:", { error: validation.error });
           return;
        }

        const message = validation.data;

        if (message.type === "join_group") {
          const { groupId } = message;

          // Validate user membership in the requested group
          const member = await storage.getUserGroup(currentUserId);

          // User MUST be in the group they are trying to join
          if (member && member.id === groupId) {
            currentGroupId = groupId;

            if (!groupClients.has(groupId)) {
              groupClients.set(groupId, new Set());
            }
            groupClients.get(groupId)!.add(userSocket);

            // Broadcast join
            broadcastToGroup(groupId, {
                type: "member_update",
                userId: currentUserId,
                status: "online"
            });
          } else {
             // Invalid attempt, close connection or ignore
             userSocket.close();
          }
        } else if (message.type === "location_update" && currentGroupId) {
          const { sitrep } = await locationService.handleLocationUpdate(
            currentUserId,
            currentGroupId,
            message.location
          );

          // Broadcast location to others in group
          broadcastToGroup(currentGroupId, {
            type: "location_update",
            userId: currentUserId, // Use authenticated ID
            location: message.location // { lat, lng, timestamp }
          }, userSocket); // Exclude sender

          // Broadcast SitRep if generated (e.g., entered waypoint)
          if (sitrep) {
             broadcastToGroup(currentGroupId, { type: "sitrep", sitrep });
          }
        } else if (message.type === "beacon_signal" && currentGroupId) {
          // Persist beacon/status
          await storage.updateGroupMemberStatus(currentUserId, currentGroupId, {
             lastStatus: message.signal,
             lastSeenAt: new Date()
          });

          // Create a SitRep for the record
          await storage.createSitRep(currentGroupId, currentUserId, `BEACON: ${message.signal}`, message.signal === "SOS" ? "alert" : "info");

          // Broadcast emergency/status beacon
          broadcastToGroup(currentGroupId, {
            type: "beacon_signal",
            userId: currentUserId,
            signal: message.signal // e.g. "SOS", "REGROUP", "MOVING"
          });
        } else if (message.type === "status_update" && currentGroupId) {
           // Broadcast general status
           broadcastToGroup(currentGroupId, {
             type: "status_update",
             userId: currentUserId,
             status: message.status // e.g. "safe", "tired", "resting"
           });
        } else if (message.type === "sitrep" && currentGroupId) {
            // New: Handle textual SitReps
            const sitrep = await storage.createSitRep(currentGroupId, currentUserId, message.text, "chat");

            // Broadcast the full sitrep object
            broadcastToGroup(currentGroupId, {
                type: "sitrep",
                sitrep
            });
        }
      } catch (e) {
        logger.error("WS Error:", { error: e });
      }
    });

    userSocket.on("close", () => {
      if (currentGroupId && groupClients.has(currentGroupId)) {
        groupClients.get(currentGroupId)!.delete(userSocket);
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

  function broadcastToGroup(groupId: number, message: ServerToClientMessage, excludeWs?: UserSocket) {
    if (groupClients.has(groupId)) {
      groupClients.get(groupId)!.forEach(client => {
        if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(message));
        }
      });
    }
  }
}
