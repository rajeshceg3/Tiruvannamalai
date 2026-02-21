import { useState, useEffect } from "react";
import { telemetry } from "@/lib/logger";
import { offlineQueue } from "./offline-queue";
import { type WsMessage, type ServerToClientMessage, serverToClientMessageSchema } from "@shared/schema";

export type SocketEventMap = {
  [K in ServerToClientMessage["type"]]: Extract<ServerToClientMessage, { type: K }>;
};

export type ConnectionStatus = "connecting" | "connected" | "disconnected";

type Listener<T> = (data: T) => void;

type EventListeners = {
  [K in keyof SocketEventMap]?: Set<Listener<SocketEventMap[K]>>;
};

export class SocketClient {
  private ws: WebSocket | null = null;
  private listeners: EventListeners = {};
  private statusListeners: Set<Listener<ConnectionStatus>> = new Set();

  private reconnectTimeout: NodeJS.Timeout | null = null;
  private reconnectDelay = 1000;
  private maxReconnectDelay = 30000;

  private userId: number | null = null;
  private groupId: number | null = null;

  public status: ConnectionStatus = "disconnected";

  constructor() {
    this.connect();
    if (typeof window !== "undefined") {
      window.addEventListener("online", () => {
        this.reconnectDelay = 1000;
        this.connect();
      });
      window.addEventListener("offline", () => {
        this.ws?.close();
        this.updateStatus("disconnected");
      });
    }
  }

  private connect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    this.updateStatus("connecting");

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const url = `${protocol}//${host}/ws`;

    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.updateStatus("connected");
      this.reconnectDelay = 1000; // Reset backoff
      if (this.userId && this.groupId) {
        this.joinGroup(this.userId, this.groupId);
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const raw = JSON.parse(event.data);
        const validation = serverToClientMessageSchema.safeParse(raw);

        if (validation.success) {
            const data = validation.data;
            // Explicit switch to help TypeScript narrow the discriminated union for emit
            switch (data.type) {
                case "location_update": this.emit("location_update", data); break;
                case "beacon_signal": this.emit("beacon_signal", data); break;
                case "sitrep": this.emit("sitrep", data); break;
                case "member_update": this.emit("member_update", data); break;
                case "status_update": this.emit("status_update", data); break;
            }
        } else {
             // Silently ignore or log warning for unknown messages to avoid crashing
             // console.warn("Invalid socket message:", validation.error);
        }
      } catch (e) {
        console.error("Socket message parse error:", e);
        telemetry.error("Socket message parse error", { error: String(e) });
      }
    };

    this.ws.onclose = () => {
      this.updateStatus("disconnected");

      // Calculate next base delay (Exponential backoff)
      const nextDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay);
      this.reconnectDelay = nextDelay;

      // Apply Random Jitter (±20%) to prevent Thundering Herd
      const jitter = nextDelay * 0.2 * (Math.random() * 2 - 1);
      const finalDelay = Math.max(1000, nextDelay + jitter);

      this.reconnectTimeout = setTimeout(() => {
        this.connect();
      }, finalDelay);
    };

    this.ws.onerror = (error) => {
       // On error, we rely on onclose to handle reconnection
       const errorMessage = (error instanceof ErrorEvent) ? error.message : "Unknown WebSocket Error";
       telemetry.error("Socket Connection Error", { error: errorMessage });
       if (this.status !== "disconnected") {
           this.updateStatus("disconnected");
       }
    };
  }

  private updateStatus(newStatus: ConnectionStatus) {
      this.status = newStatus;
      this.statusListeners.forEach(cb => cb(newStatus));
  }

  public sendRaw(message: WsMessage): boolean {
    if (this.ws?.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(message));
        return true;
      } catch (e) {
        console.error("Socket send error:", e);
        return false;
      }
    }
    return false;
  }

  public joinGroup(userId: number, groupId: number) {
    this.userId = userId;
    this.groupId = groupId;
    if (this.ws?.readyState === WebSocket.OPEN) {
      const msg: WsMessage = { type: "join_group", userId, groupId };
      this.ws.send(JSON.stringify(msg));
    }
  }

  public sendLocation(location: { lat: number; lng: number; timestamp: number }) {
    if (this.ws?.readyState === WebSocket.OPEN && navigator.onLine) {
      const msg: WsMessage = { type: "location_update", location };
      this.ws.send(JSON.stringify(msg));
    } else {
      offlineQueue.push("location_update", location);
    }
  }

  public sendBeacon(signal: "SOS" | "REGROUP" | "MOVING") {
    if (this.ws?.readyState === WebSocket.OPEN && navigator.onLine) {
      const msg: WsMessage = { type: "beacon_signal", signal };
      this.ws.send(JSON.stringify(msg));
    } else {
      offlineQueue.push("beacon_signal", signal);
    }
  }

  public sendSitrep(text: string) {
    if (this.ws?.readyState === WebSocket.OPEN && navigator.onLine) {
      const msg: WsMessage = { type: "sitrep", text };
      this.ws.send(JSON.stringify(msg));
    } else {
      offlineQueue.push("sitrep", text);
    }
  }

  public on<K extends keyof SocketEventMap>(type: K, callback: Listener<SocketEventMap[K]>) {
    // Cast to access the underlying set without strict generic variance issues
    const listeners = this.listeners as Record<string, Set<unknown>>;
    if (!listeners[type]) {
      listeners[type] = new Set();
    }
    listeners[type].add(callback);
    return () => { listeners[type]?.delete(callback); };
  }

  public onStatusChange(callback: Listener<ConnectionStatus>) {
      this.statusListeners.add(callback);
      // Immediately invoke with current status
      callback(this.status);
      return () => { this.statusListeners.delete(callback); };
  }

  private emit<K extends keyof SocketEventMap>(type: K, data: SocketEventMap[K]) {
    this.listeners[type]?.forEach(cb => cb(data));
  }
}

export const socketClient = new SocketClient();

// React Hook for using socket status
export function useSocketStatus() {
    const [status, setStatus] = useState<ConnectionStatus>(socketClient.status);

    useEffect(() => {
        return socketClient.onStatusChange(setStatus);
    }, []);

    return status;
}
