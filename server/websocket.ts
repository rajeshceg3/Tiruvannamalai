import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { Server } from "http";
import { sessionParser } from "./auth";

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

          // Persist location, but preserve status if it's not "ok"
          // We need to know the current status to avoid overwriting an SOS
          // Ideally storage.updateGroupMemberStatus should handle partial updates,
          // but for now we can just fetch or pass undefined for status to not update it?
          // Looking at storage implementation:
          // updateGroupMemberStatus(groupId, userId, status, location) updates BOTH if provided.

          // Let's modify logic: only update location if we don't want to touch status.
          // Or better: read current status first? That's expensive.
          // Refactor storage to allow partial updates is best, but let's do it safely here.

          // Let's assume we want to keep status as is.
          // Actually, we can just pass undefined for status to storage if we modify storage signature slightly
          // or just fetch member to check status (safe but slower).

          const member = await storage.getUserGroup(currentUserId);
          // Wait, getUserGroup returns Group, not Member details directly in a cheap way for status.
          // storage.getGroupMembers is array.
          // Let's just create a new storage method or modifying updateGroupMemberStatus is safer.
          // I will modify storage.updateGroupMemberStatus to allow status to be optional/undefined.

          // But I cannot modify storage.ts right here without another tool call.
          // I will use `updateGroupMemberLocation` if I had it.

          // For now, let's just pass "ok" ONLY if we are sure? No.
          // I'll leave the call here but pass `undefined` for status if I can change `server/storage.ts`.
          // I'll change `server/storage.ts` in next step.
          // For this file, I will change the call to:
          await storage.updateGroupMemberStatus(currentGroupId, currentUserId, undefined, message.location);

        } else if (message.type === "beacon_signal" && currentGroupId) {
          // Persist Beacon as SitRep
          await storage.createSitRep(currentGroupId, currentUserId, `Beacon Signal: ${message.signal}`, "WARNING");

          // Update member status based on beacon
          const status = message.signal === "SOS" ? "sos" : message.signal === "REGROUP" ? "regroup" : "ok";
          await storage.updateGroupMemberStatus(currentGroupId, currentUserId, status);

          // Broadcast emergency/status beacon
          broadcastToGroup(currentGroupId, {
            type: "beacon_signal",
            userId: currentUserId,
            signal: message.signal // e.g. "SOS", "REGROUP", "MOVING"
          });

          // Also broadcast as a new SitRep so the log updates
          broadcastToGroup(currentGroupId, {
             type: "new_sitrep",
             sitrep: {
                 content: `Beacon Signal: ${message.signal}`,
                 type: "WARNING",
                 userId: currentUserId,
                 createdAt: new Date().toISOString()
             }
          });

        } else if (message.type === "status_update" && currentGroupId) {
           // Broadcast general status
           broadcastToGroup(currentGroupId, {
             type: "status_update",
             userId: currentUserId,
             status: message.status // e.g. "safe", "tired", "resting"
           });

           await storage.updateGroupMemberStatus(currentGroupId, currentUserId, message.status);
        } else if (message.type === "new_sitrep" && currentGroupId) {
            // Persist manual sitrep coming via WS (optional, usually done via HTTP POST)
            // But if we support it:
            const sitrep = await storage.createSitRep(currentGroupId, currentUserId, message.content, message.sitrepType || "INFO");
            broadcastToGroup(currentGroupId, {
                type: "new_sitrep",
                sitrep: { ...sitrep, user: { id: currentUserId } } // Simplified user obj
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
