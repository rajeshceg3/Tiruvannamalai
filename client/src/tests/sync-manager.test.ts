import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { offlineQueue } from "../lib/offline-queue";
import { socketClient } from "../lib/socket";
import { apiRequest } from "../lib/queryClient";

// Mock dependencies
vi.mock("../lib/offline-queue", () => ({
  offlineQueue: {
    subscribe: vi.fn(),
    peek: vi.fn(),
    pop: vi.fn(),
    length: 0
  }
}));

vi.mock("../lib/socket", () => ({
  socketClient: {
    onStatusChange: vi.fn(),
    sendRaw: vi.fn(),
    status: "disconnected"
  }
}));

vi.mock("../lib/queryClient", () => ({
  apiRequest: vi.fn(),
  queryClient: {
    invalidateQueries: vi.fn()
  }
}));

vi.mock("../lib/logger", () => ({
  telemetry: {
    error: vi.fn()
  }
}));

describe("SyncManager", () => {
  let syncManager: any;

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();

    // Mock Navigator
    Object.defineProperty(global.navigator, 'onLine', {
        value: true,
        configurable: true
    });

    const mod = await import("../lib/sync-manager");
    syncManager = mod.syncManager;
  });

  it("should process visit item via apiRequest", async () => {
    // Setup queue
    const visitItem = { type: "visit", payload: { shrineId: "1" }, id: "1" };

    let queueLength = 1;
    vi.spyOn(offlineQueue, 'length', 'get').mockImplementation(() => queueLength);
    vi.mocked(offlineQueue.peek).mockReturnValue(visitItem as any);
    vi.mocked(offlineQueue.pop).mockImplementation(() => {
        queueLength = 0;
        return visitItem as any;
    });

    await syncManager.processQueue();

    expect(apiRequest).toHaveBeenCalledWith("POST", "/api/visits", { shrineId: "1" });
    expect(offlineQueue.pop).toHaveBeenCalled();
  });

  it("should process socket item via socketClient", async () => {
     // Setup socket connected
     socketClient.status = "connected";

     const item = { type: "sitrep", payload: "test", id: "1" };

     let queueLength = 1;
     vi.spyOn(offlineQueue, 'length', 'get').mockImplementation(() => queueLength);

    vi.mocked(offlineQueue.peek).mockReturnValue(item as any);
    vi.mocked(offlineQueue.pop).mockImplementation(() => {
        queueLength = 0;
        return item as any;
    });
    vi.mocked(socketClient.sendRaw).mockReturnValue(true);

    await syncManager.processQueue();

    expect(socketClient.sendRaw).toHaveBeenCalled();
    expect(offlineQueue.pop).toHaveBeenCalled();
  });

  it("should not pop item if API request fails with network error", async () => {
      const visitItem = { type: "visit", payload: { shrineId: "1" }, id: "1" };
      vi.spyOn(offlineQueue, 'length', 'get').mockReturnValue(1);
      vi.mocked(offlineQueue.peek).mockReturnValue(visitItem as any);

      // Fail API request
      vi.mocked(apiRequest).mockRejectedValue(new Error("Network Error"));

      await syncManager.processQueue();

      expect(apiRequest).toHaveBeenCalled();
      expect(offlineQueue.pop).not.toHaveBeenCalled();
  });
});
