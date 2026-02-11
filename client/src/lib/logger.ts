export type LogLevel = 'info' | 'warn' | 'error';

export interface TelemetryEvent {
  level: LogLevel;
  message: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  context?: Record<string, any>;
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  log(message: string, context?: Record<string, any>) {
    this.send({
      level: 'info',
      message,
      context,
      timestamp: new Date().toISOString()
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  warn(message: string, context?: Record<string, any>) {
    this.send({
      level: 'warn',
      message,
      context,
      timestamp: new Date().toISOString()
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  error(message: string, context?: Record<string, any>) {
    this.send({
      level: 'error',
      message,
      context,
      timestamp: new Date().toISOString()
    });
  }
}

export const telemetry = new TelemetryClient();
