import { type Request, type Response } from "express";

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export function requestLogger(req: Request, res: Response, duration: number, capturedJsonResponse?: Record<string, any>) {
  const path = req.path;
  const method = req.method;

  if (process.env.NODE_ENV === "production") {
    const logEntry = {
      timestamp: new Date().toISOString(),
      method,
      path,
      statusCode: res.statusCode,
      durationMs: duration,
    };
    console.log(JSON.stringify(logEntry));
  } else {
    let logLine = `${method} ${path} ${res.statusCode} in ${duration}ms`;
    if (capturedJsonResponse) {
      logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
    }

    if (logLine.length > 80) {
      logLine = logLine.slice(0, 79) + "…";
    }

    log(logLine);
  }
}
