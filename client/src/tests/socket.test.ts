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
});

vi.stubGlobal('WebSocket', MockWebSocket);

describe("SocketClient Resilience", () => {
  let socketClient: any;

  beforeEach(async () => {
    wsInstances = [];
    vi.useFakeTimers();
    vi.resetModules();
    // Import fresh instance
    const mod = await import("../lib/socket");
    socketClient = mod.socketClient;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
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

    // Logic:
    // Initial delay resets to 1000 on open.
    // On close:
    // nextDelay = min(1000 * 2, 30000) = 2000.
    // jitter = 2000 * 0.2 * random (-1 to 1) => +/- 400.
    // range: [1600, 2400].
    // Also max(1000, ...) ensures it doesn't go below 1000.

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
    // delay ~ 2000 (1600-2400)

    // Fast forward time to trigger connect
    vi.runOnlyPendingTimers();

    // New WS created
    expect(wsInstances.length).toBe(2);
    const ws2 = wsInstances[1];

    // 2nd Fail (without opening)
    ws2.onclose();

    // Logic:
    // Previous reconnectDelay was 2000.
    // nextDelay = min(2000 * 2, 30000) = 4000.
    // Jitter: +/- 800.
    // Range: [3200, 4800].

    const secondCallDelay = setTimeoutSpy.mock.calls[1][1] as number;
    console.log(`2nd Reconnect Delay: ${secondCallDelay}ms`);

    expect(secondCallDelay).toBeGreaterThanOrEqual(3200);
    expect(secondCallDelay).toBeLessThanOrEqual(4800);
  });
});
