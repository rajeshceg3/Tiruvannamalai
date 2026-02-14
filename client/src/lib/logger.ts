export type LogLevel = 'info' | 'warn' | 'error';

export interface TelemetryEvent {
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  timestamp: string;
}

class TelemetryClient {
  private endpoint = '/api/telemetry';

  private async send(event: TelemetryEvent) {
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Telemetry] ${event.level.toUpperCase()}: ${event.message}`, event.context);
      }

      await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      });
    } catch (err) {
      console.error('Failed to send telemetry:', err);
    }
  }

  log(message: string, context?: Record<string, unknown>) {
    this.send({
      level: 'info',
      message,
      context,
      timestamp: new Date().toISOString()
    });
  }

  warn(message: string, context?: Record<string, unknown>) {
    this.send({
      level: 'warn',
      message,
      context,
      timestamp: new Date().toISOString()
    });
  }

  error(message: string, context?: Record<string, unknown>) {
    this.send({
      level: 'error',
      message,
      context,
      timestamp: new Date().toISOString()
    });
  }
}

export const telemetry = new TelemetryClient();
