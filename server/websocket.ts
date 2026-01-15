import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { Server } from "http";
import { sessionParser } from "./auth";
import { calculateDistance } from "@shared/geo";
import { Waypoint } from "@shared/schema";

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

  // Cache for geofencing optimization
  const waypointCache = new Map<number, { waypoints: Waypoint[], lastFetched: number }>();
  const CACHE_TTL = 10000; // 10 seconds

  async function getGroupWaypoints(groupId: number) {
      const cached = waypointCache.get(groupId);
      if (cached && Date.now() - cached.lastFetched < CACHE_TTL) {
          return cached.waypoints;
      }
      const waypoints = await storage.getWaypoints(groupId);
      waypointCache.set(groupId, { waypoints, lastFetched: Date.now() });
      return waypoints;
  }

  wss.on("connection", (ws, req) => {
    let currentGroupId: number | null = null;
    // We trust this because we set it in the upgrade handler
    const currentUserId = (ws as any).userId as number;

    // Rate limiter for movement logging (prevent DB flooding)
    let lastMovementLogTime = 0;
    const MOVEMENT_LOG_INTERVAL = 5000; // 5 seconds

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
          // Persist location
          await storage.updateGroupMemberStatus(currentUserId, currentGroupId, {
            lastLocation: message.location, // { lat, lng }
            lastSeenAt: new Date()
          });

          // TACTICAL LOGGING: Persist movement history for AAR
          // We rate limit this to avoid excessive DB writes
          const now = Date.now();
          if (now - lastMovementLogTime > MOVEMENT_LOG_INTERVAL && currentGroupId !== null) {
             // We don't await this to avoid blocking the websocket loop
             storage.logMovement(
                 currentGroupId,
                 currentUserId,
                 message.location.lat,
                 message.location.lng,
                 "MOVING"
             ).catch(err => console.error("Error logging movement:", err));

             lastMovementLogTime = now;
          }

          // Broadcast location to others in group
          broadcastToGroup(currentGroupId, {
            type: "location_update",
            userId: currentUserId, // Use authenticated ID
            location: message.location // { lat, lng, timestamp }
          }, ws); // Exclude sender

          // GEOFENCING CHECK
          const waypoints = await getGroupWaypoints(currentGroupId);
          if (waypoints.length > 0) {
            const members = await storage.getGroupMembers(currentGroupId);
            const member = members.find(m => m.userId === currentUserId);

            if (member) {
              let insideAnyWaypoint = false;
              for (const waypoint of waypoints) {
                const dist = calculateDistance(
                  message.location.lat,
                  message.location.lng,
                  waypoint.latitude,
                  waypoint.longitude
                );

                if (dist <= waypoint.radius) {
                  insideAnyWaypoint = true;
                  // Only trigger if we weren't already here
                  if (member.lastWaypointId !== waypoint.id) {
                    await storage.updateGroupMemberStatus(currentUserId, currentGroupId, { lastWaypointId: waypoint.id });

                    const sitrep = await storage.createSitRep(
                      currentGroupId,
                      currentUserId,
                      `ARRIVED at ${waypoint.name}`,
                      "status"
                    );

                    broadcastToGroup(currentGroupId, { type: "sitrep", sitrep });
                  }
                  break; // Assume strictly one waypoint at a time for now
                }
              }

              // If not inside any waypoint but was previously recorded as being in one, clear it
              if (!insideAnyWaypoint && member.lastWaypointId !== null) {
                 await storage.updateGroupMemberStatus(currentUserId, currentGroupId, { lastWaypointId: null });
              }
            }
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
