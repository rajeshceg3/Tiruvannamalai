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

type LogLevel = "info" | "warn" | "error" | "debug";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatLog(level: LogLevel, message: string, context?: Record<string, any>, source = "app") {
  if (process.env.NODE_ENV === "production") {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      source,
      message,
      context,
    });
  } else {
    const formattedTime = new Date().toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
    const contextStr = context ? ` \n${JSON.stringify(context, null, 2)}` : "";
    return `${formattedTime} [${source}] [${level.toUpperCase()}] ${message}${contextStr}`;
  }
}

export const logger = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  info: (message: string, context?: Record<string, any>, source = "app") => {
    console.log(formatLog("info", message, context, source));
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  warn: (message: string, context?: Record<string, any>, source = "app") => {
    console.warn(formatLog("warn", message, context, source));
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  error: (message: string, context?: Record<string, any>, source = "app") => {
    console.error(formatLog("error", message, context, source));
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  debug: (message: string, context?: Record<string, any>, source = "app") => {
     if (process.env.NODE_ENV !== "production") {
        console.debug(formatLog("debug", message, context, source));
     }
  }
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
