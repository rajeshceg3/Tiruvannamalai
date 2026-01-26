import { useState, useEffect } from "react";
import { telemetry } from "@/lib/logger";

export type SocketSitRep = {
  id: number;
  groupId: number;
  userId: number;
  message: string;
  type: string;
  createdAt: string;
};

export type SocketEventMap = {
  "location_update": { userId: number; location: { lat: number; lng: number } };
  "beacon_signal": { userId: number; signal: "SOS" | "REGROUP" | "MOVING" };
  "sitrep": { sitrep: SocketSitRep };
  "member_update": { userId: number; status: string; type: "member_update" };
};

export type ConnectionStatus = "connecting" | "connected" | "disconnected";

type Listener<T> = (data: T) => void;

export class SocketClient {
  private ws: WebSocket | null = null;
  // Use a map of sets of typed functions.
  // We use 'any' for the Set content internally to allow storing different callback types in the same Map,
  // but the public API enforces strict typing.
  private listeners: Map<string, Set<Listener<any>>> = new Map();
  private statusListeners: Set<Listener<ConnectionStatus>> = new Set();

  private reconnectTimeout: NodeJS.Timeout | null = null;
  private reconnectDelay = 1000;
  private maxReconnectDelay = 30000;

  private userId: number | null = null;
  private groupId: number | null = null;

  public status: ConnectionStatus = "disconnected";

  constructor() {
    this.connect();
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
        const data = JSON.parse(event.data);
        this.emit(data.type, data);
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

  public joinGroup(userId: number, groupId: number) {
    this.userId = userId;
    this.groupId = groupId;
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: "join_group", userId, groupId }));
    }
  }

  public sendLocation(location: { lat: number; lng: number; timestamp: number }) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: "location_update", location }));
    }
  }

  public sendBeacon(signal: "SOS" | "REGROUP" | "MOVING") {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: "beacon_signal", signal }));
    }
  }

  public sendSitrep(text: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: "sitrep", text }));
    }
  }

  public on<K extends keyof SocketEventMap>(type: K, callback: Listener<SocketEventMap[K]>) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    // We cast to Listener<any> to store it, but strict type is enforced at the method signature
    this.listeners.get(type)!.add(callback as Listener<any>);
    return () => this.listeners.get(type)!.delete(callback as Listener<any>);
  }

  public onStatusChange(callback: Listener<ConnectionStatus>) {
      this.statusListeners.add(callback);
      // Immediately invoke with current status
      callback(this.status);
      return () => { this.statusListeners.delete(callback); };
  }

  private emit<K extends keyof SocketEventMap>(type: K, data: SocketEventMap[K]) {
    this.listeners.get(type)?.forEach(cb => cb(data));
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
