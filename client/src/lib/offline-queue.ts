import { nanoid } from "nanoid";
import { type InsertVisit } from "@shared/schema";

export type LocationPayload = { lat: number; lng: number; timestamp?: number };
export type BeaconPayload = "SOS" | "REGROUP" | "MOVING";
export type SitrepPayload = string;
export type VisitPayload = InsertVisit;

export type QueueItem =
  | { id: string; type: "location_update"; payload: LocationPayload; createdAt: number }
  | { id: string; type: "beacon_signal"; payload: BeaconPayload; createdAt: number }
  | { id: string; type: "sitrep"; payload: SitrepPayload; createdAt: number }
  | { id: string; type: "visit"; payload: VisitPayload; createdAt: number };

export class OfflineQueue {
  private queue: QueueItem[] = [];
  private readonly STORAGE_KEY = "offline_mutation_queue";
  private readonly MAX_SIZE = 1000;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.load();
  }

  private load() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.queue = JSON.parse(stored);
      }
    } catch (e) {
      console.error("Failed to load offline queue", e);
      this.queue = [];
    }
  }

  private save() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.queue));
      this.notifyListeners();
    } catch (e) {
      console.error("Failed to save offline queue", e);
    }
  }

  public push<T extends QueueItem["type"]>(
    type: T,
    payload: Extract<QueueItem, { type: T }>["payload"]
  ) {
    if (this.queue.length >= this.MAX_SIZE) {
      this.queue.shift(); // Drop oldest
    }
    // We need to cast here because TS has trouble inferring the union type correctly
    // when constructing the object dynamically with generics,
    // but the input types are strictly checked by the function signature.
    const item = {
      id: nanoid(),
      type,
      payload,
      createdAt: Date.now(),
    } as QueueItem;

    this.queue.push(item);
    this.save();
  }

  public pop(): QueueItem | undefined {
    const item = this.queue.shift();
    this.save();
    return item;
  }

  public peek(): QueueItem | undefined {
    return this.queue[0];
  }

  public get length(): number {
    return this.queue.length;
  }

  public getItems(): QueueItem[] {
    return [...this.queue];
  }

  public remove(id: string) {
    this.queue = this.queue.filter(item => item.id !== id);
    this.save();
  }

  public clear() {
    this.queue = [];
    this.save();
  }

  public subscribe(callback: () => void) {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(cb => cb());
  }
}

export const offlineQueue = new OfflineQueue();
