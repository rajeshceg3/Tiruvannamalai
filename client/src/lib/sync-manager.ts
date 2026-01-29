import { offlineQueue } from "./offline-queue";
import { socketClient } from "./socket";
import { apiRequest, queryClient } from "./queryClient";
import { telemetry } from "./logger";

export class SyncManager {
  private isProcessing = false;

  constructor() {
    this.setupListeners();
  }

  private setupListeners() {
    socketClient.onStatusChange((status) => {
      if (status === "connected") {
        this.processQueue();
      }
    });

    window.addEventListener("online", () => {
      this.processQueue();
    });

    // Auto-flush if item added while online
    offlineQueue.subscribe(() => {
        if (navigator.onLine && !this.isProcessing) {
            this.processQueue();
        }
    });
  }

  public async processQueue() {
    if (this.isProcessing) return;
    if (offlineQueue.length === 0) return;
    if (!navigator.onLine) return;

    this.isProcessing = true;

    try {
      while (offlineQueue.length > 0) {
        // Check connection status
        if (!navigator.onLine) break;

        const item = offlineQueue.peek();
        if (!item) break;

        let success = false;

        if (item.type === "visit") {
          try {
             const { payload } = item;
             await apiRequest("POST", "/api/visits", payload);

             // Invalidate to refresh UI with server data (including real ID)
             await queryClient.invalidateQueries({ queryKey: ["/api/visits"] });
             await queryClient.invalidateQueries({ queryKey: ["/api/journey"] });

             success = true;
          } catch (e) {
             console.error("Sync failed for visit", e);
             const errStr = String(e);
             // Discard on client errors (Validation, etc.), but KEEP on 401 (Auth) or 500 (Server)
             if (errStr.includes("400") || errStr.includes("422")) {
                 telemetry.error("Sync Fatal Error", { error: errStr, item });
                 success = true; // Remove to unblock queue
             } else {
                 // Network error, 500, or 401 (Auth) - keep in queue to retry later
                 console.warn("Sync transient error (keeping in queue):", errStr);
                 success = false;
             }
          }
        } else {
           // Socket items
           // We require socket to be connected
           if (socketClient.status !== "connected") {
               break;
           }

           let message: any;
           switch (item.type) {
             case "location_update":
               message = { type: "location_update", location: item.payload };
               break;
             case "beacon_signal":
               message = { type: "beacon_signal", signal: item.payload };
               break;
             case "sitrep":
               message = { type: "sitrep", text: item.payload };
               break;
             default:
               success = true; // Discard unknown
               break;
           }

           if (message) {
               success = socketClient.sendRaw(message);
           }
        }

        if (success) {
          offlineQueue.pop();
        } else {
          break; // Stop processing (Head-of-Line Blocking to preserve order)
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }
}

export const syncManager = new SyncManager();
