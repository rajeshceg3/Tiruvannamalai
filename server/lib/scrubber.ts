export function scrubPII(data: any): any {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === 'string') {
    // Basic email regex
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    return data.replace(emailRegex, '[REDACTED_EMAIL]');
  }

  if (Array.isArray(data)) {
    return data.map(item => scrubPII(item));
  }

  if (typeof data === 'object') {
    const scrubbedObj: any = {};
    for (const [key, value] of Object.entries(data)) {
      // Check sensitive keys
      const sensitiveKeys = ['password', 'token', 'secret', 'authorization', 'cookie', 'credit_card', 'cc_number'];
      if (sensitiveKeys.some(k => key.toLowerCase().includes(k))) {
        scrubbedObj[key] = '[REDACTED]';
      } else {
        scrubbedObj[key] = scrubPII(value);
      }
    }
    return scrubbedObj;
  }

  return data;
}
