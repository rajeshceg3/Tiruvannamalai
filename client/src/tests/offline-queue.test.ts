import { describe, it, expect, beforeEach, vi } from "vitest";
import { OfflineQueue } from "../lib/offline-queue";

describe("OfflineQueue", () => {
  let queue: OfflineQueue;

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    queue = new OfflineQueue();
  });

  it("should start empty", () => {
    expect(queue.length).toBe(0);
  });

  it("should push items", () => {
    queue.push("location_update", { lat: 10, lng: 20 });
    expect(queue.length).toBe(1);
    expect(queue.peek()?.type).toBe("location_update");
  });

  it("should pop items", () => {
    queue.push("sitrep", { text: "test" });
    const item = queue.pop();
    expect(item?.type).toBe("sitrep");
    expect(queue.length).toBe(0);
  });

  it("should persist to localStorage", () => {
    queue.push("beacon_signal", { signal: "SOS" });
    const stored = localStorage.getItem("offline_mutation_queue");
    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored!);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].type).toBe("beacon_signal");
  });

  it("should load from localStorage on init", () => {
    const data = [{ id: "1", type: "sitrep", payload: {}, createdAt: 123 }];
    localStorage.setItem("offline_mutation_queue", JSON.stringify(data));

    const newQueue = new OfflineQueue();
    expect(newQueue.length).toBe(1);
    expect(newQueue.peek()?.id).toBe("1");
  });

  it("should limit size", () => {
    // Access private property for testing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (queue as any).MAX_SIZE = 5;

    for (let i = 0; i < 10; i++) {
        queue.push("sitrep", { i });
    }

    expect(queue.length).toBe(5);
    // Should have dropped 0-4, kept 5-9.
    const first = queue.peek();
    expect(first?.payload.i).toBe(5);
  });
});
