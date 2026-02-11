import { nanoid } from "nanoid";

export interface QueueItem {
  id: string;
  type: "location_update" | "beacon_signal" | "sitrep" | "visit";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: any;
  createdAt: number;
}

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public push(type: QueueItem["type"], payload: any) {
    if (this.queue.length >= this.MAX_SIZE) {
      this.queue.shift(); // Drop oldest
    }
    const item: QueueItem = {
      id: nanoid(),
      type,
      payload,
      createdAt: Date.now(),
    };
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
