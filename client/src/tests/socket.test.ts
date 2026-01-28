import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock implementation for WebSocket
let wsInstances: any[] = [];
const MockWebSocket = vi.fn(() => {
  const ws = {
    onopen: null,
    onclose: null,
    onerror: null,
    onmessage: null,
    readyState: 0,
    send: vi.fn(),
    close: vi.fn(),
  };
  wsInstances.push(ws);
  return ws;
}) as any;

MockWebSocket.OPEN = 1;
MockWebSocket.CONNECTING = 0;
MockWebSocket.CLOSING = 2;
MockWebSocket.CLOSED = 3;

vi.stubGlobal('WebSocket', MockWebSocket);

// Mock offline queue
const mockPush = vi.fn();
const mockPeek = vi.fn();
const mockPop = vi.fn();
let mockQueueLength = 0;

vi.mock("../lib/offline-queue", () => ({
  offlineQueue: {
    push: (...args: any[]) => mockPush(...args),
    peek: () => mockPeek(),
    pop: () => mockPop(),
    get length() { return mockQueueLength; }
  }
}));

describe("SocketClient Resilience", () => {
  let socketClient: any;

  beforeEach(async () => {
    wsInstances = [];
    vi.useFakeTimers();
    vi.resetModules();
    vi.clearAllMocks();

    // Reset queue mock state
    mockQueueLength = 0;
    mockPeek.mockReturnValue(undefined);

    // Import fresh instance
    const mod = await import("../lib/socket");
    socketClient = mod.socketClient;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should initialize in connecting state", () => {
    expect(socketClient.status).toBe("connecting");
    expect(MockWebSocket).toHaveBeenCalledTimes(1);
  });

  it("should transition to connected state on open", () => {
    const ws = wsInstances[0];
    expect(ws).toBeDefined();

    // Simulate connection open
    ws.onopen();

    expect(socketClient.status).toBe("connected");
  });

  it("should apply jitter to reconnection delay", () => {
    const setTimeoutSpy = vi.spyOn(global, 'setTimeout');
    const ws = wsInstances[0];

    // Establish connection first to reset backoff
    ws.onopen();

    // Simulate connection drop
    ws.onclose();

    expect(socketClient.status).toBe("disconnected");

    // Verify reconnection scheduled
    expect(setTimeoutSpy).toHaveBeenCalled();
    const delay = setTimeoutSpy.mock.calls[0][1] as number;

    console.log(`Measured Reconnect Delay: ${delay}ms`);

    expect(delay).toBeGreaterThanOrEqual(1600);
    expect(delay).toBeLessThanOrEqual(2400);
  });

  it("should implement exponential backoff with jitter over multiple failures", () => {
    const setTimeoutSpy = vi.spyOn(global, 'setTimeout');
    const ws = wsInstances[0];

    // Open
    ws.onopen();

    // 1st Fail
    ws.onclose();

    // Fast forward time to trigger connect
    vi.runOnlyPendingTimers();

    // New WS created
    expect(wsInstances.length).toBe(2);
    const ws2 = wsInstances[1];

    // 2nd Fail (without opening)
    ws2.onclose();

    const secondCallDelay = setTimeoutSpy.mock.calls[1][1] as number;
    console.log(`2nd Reconnect Delay: ${secondCallDelay}ms`);

    expect(secondCallDelay).toBeGreaterThanOrEqual(3200);
    expect(secondCallDelay).toBeLessThanOrEqual(4800);
  });

  it("should queue items when offline", () => {
    const ws = wsInstances[0];
    // status is connecting (not connected)

    // sendLocation
    socketClient.sendLocation({ lat: 1, lng: 2, timestamp: 123 });

    expect(ws.send).not.toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("location_update", { lat: 1, lng: 2, timestamp: 123 });
  });

  it("should flush queue on reconnect", () => {
     const ws = wsInstances[0];
     // Setup mock queue to have items
     mockQueueLength = 1;
     mockPeek.mockReturnValueOnce({ type: "sitrep", payload: "test", id: "1" });
     // After pop, length becomes 0 (simulated by logic in test or loop)
     mockPop.mockImplementation(() => { mockQueueLength = 0; });

     ws.readyState = 1; // OPEN

     // Simulate open
     ws.onopen();

     expect(ws.send).toHaveBeenCalledWith(JSON.stringify({ type: "sitrep", text: "test" }));
     expect(mockPop).toHaveBeenCalled();
  });
});
