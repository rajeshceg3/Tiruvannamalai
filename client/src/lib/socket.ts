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

export class SocketClient {
  private ws: WebSocket | null = null;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private userId: number | null = null;
  private groupId: number | null = null;

  constructor() {
    this.connect();
  }

  private connect() {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const url = `${protocol}//${host}/ws`;

    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      if (this.userId && this.groupId) {
        this.joinGroup(this.userId, this.groupId);
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.emit(data.type, data);
      } catch (e) {
        // Silently ignore parse errors in production
      }
    };

    this.ws.onclose = () => {
      this.reconnectTimeout = setTimeout(() => this.connect(), 3000);
    };
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

  public on<K extends keyof SocketEventMap>(type: K, callback: (data: SocketEventMap[K]) => void) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(callback as (data: any) => void);
    return () => this.listeners.get(type)!.delete(callback as (data: any) => void);
  }

  private emit(type: string, data: any) {
    this.listeners.get(type)?.forEach(cb => cb(data));
  }
}

export const socketClient = new SocketClient();
