import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { Server } from "http";
import { sessionParser } from "./auth";
import { wsMessageSchema } from "@shared/schema";
import { locationService } from "./services/location-service";

interface WebSocketWithUser extends WebSocket {
  userId: number;
}

export function setupWebSocket(httpServer: Server) {
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
        let raw;
        try {
           raw = JSON.parse(data.toString());
        } catch {
           return; // Invalid JSON, ignore silently
        }

        const validation = wsMessageSchema.safeParse(raw);
        if (!validation.success) {
           console.error("Invalid WS Message:", validation.error);
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
          }, ws); // Exclude sender

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
}
