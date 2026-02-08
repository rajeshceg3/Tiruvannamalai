import { storage } from "../storage";
import { calculateDistance } from "@shared/geo";
import { Waypoint, SitRep } from "@shared/schema";

class LocationService {
  // Cache for geofencing optimization
  private waypointCache = new Map<number, { waypoints: Waypoint[], lastFetched: number }>();
  private CACHE_TTL = 10000; // 10 seconds

  // Rate limiter for movement logging (prevent DB flooding)
  private lastMovementLog = new Map<number, number>(); // userId -> timestamp
  private MOVEMENT_LOG_INTERVAL = 5000; // 5 seconds

  async getGroupWaypoints(groupId: number): Promise<Waypoint[]> {
    const cached = this.waypointCache.get(groupId);
    if (cached && Date.now() - cached.lastFetched < this.CACHE_TTL) {
      return cached.waypoints;
    }
    const waypoints = await storage.getWaypoints(groupId);
    this.waypointCache.set(groupId, { waypoints, lastFetched: Date.now() });
    return waypoints;
  }

  async handleLocationUpdate(userId: number, groupId: number, location: { lat: number, lng: number }): Promise<{ sitrep?: SitRep, movementLogged: boolean }> {
    // 1. Persist location
    await storage.updateGroupMemberStatus(userId, groupId, {
      lastLocation: location,
      lastSeenAt: new Date()
    });

    let movementLogged = false;
    const now = Date.now();
    const lastLog = this.lastMovementLog.get(userId) || 0;

    // 2. TACTICAL LOGGING: Persist movement history for AAR
    if (now - lastLog > this.MOVEMENT_LOG_INTERVAL) {
      // We don't await this to avoid blocking the return (fire and forget for log)
      storage.logMovement(
        groupId,
        userId,
        location.lat,
        location.lng,
        "MOVING"
      ).catch(err => console.error("Error logging movement:", err));

      this.lastMovementLog.set(userId, now);
      movementLogged = true;
    }

    // 3. GEOFENCING CHECK
    let sitrep: SitRep | undefined;
    const waypoints = await this.getGroupWaypoints(groupId);

    if (waypoints.length > 0) {
      const members = await storage.getGroupMembers(groupId);
      const member = members.find(m => m.userId === userId);

      if (member) {
        let insideAnyWaypoint = false;
        for (const waypoint of waypoints) {
          const dist = calculateDistance(
            location.lat,
            location.lng,
            waypoint.latitude,
            waypoint.longitude
          );

          if (dist <= waypoint.radius) {
            insideAnyWaypoint = true;
            // Only trigger if we weren't already here
            if (member.lastWaypointId !== waypoint.id) {
              await storage.updateGroupMemberStatus(userId, groupId, { lastWaypointId: waypoint.id });

              sitrep = await storage.createSitRep(
                groupId,
                userId,
                `ARRIVED at ${waypoint.name}`,
                "status"
              );
            }
            break; // Assume strictly one waypoint at a time for now
          }
        }

        // If not inside any waypoint but was previously recorded as being in one, clear it
        if (!insideAnyWaypoint && member.lastWaypointId !== null) {
          await storage.updateGroupMemberStatus(userId, groupId, { lastWaypointId: null });
        }
      }
    }

    return { sitrep, movementLogged };
  }
}

export const locationService = new LocationService();
