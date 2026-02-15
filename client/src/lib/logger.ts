export type LogLevel = 'info' | 'warn' | 'error';

export interface TelemetryEvent {
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  timestamp: string;
}

class TelemetryClient {
  private endpoint = '/api/telemetry';

  private safeSerialize(event: TelemetryEvent): string {
    try {
      return JSON.stringify(event);
    } catch (error) {
      // If serialization fails (e.g. circular reference), strip context
      // and send a simplified event to ensure the error is at least logged.
      const fallbackEvent: TelemetryEvent = {
        ...event,
        context: {
          serializationError: 'Failed to serialize context',
          originalErrorMessage: error instanceof Error ? error.message : String(error)
        }
      };
      // If this fails, we're really in trouble, but it shouldn't as we built it safely
      try {
        return JSON.stringify(fallbackEvent);
      } catch {
        return JSON.stringify({
          level: 'error',
          message: 'Critical Telemetry Failure: Unserializable Event',
          timestamp: new Date().toISOString()
        });
      }
    }
  }

  private async send(event: TelemetryEvent) {
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Telemetry] ${event.level.toUpperCase()}: ${event.message}`, event.context);
      }

      const body = this.safeSerialize(event);

      await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body,
      });
    } catch (err) {
      // Network errors or other fetch issues
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
