import { describe, it, expect } from "vitest";
import { scrubPII } from "../lib/scrubber";

describe("scrubPII", () => {
  it("should return null/undefined as is", () => {
    expect(scrubPII(null)).toBeNull();
    expect(scrubPII(undefined)).toBeUndefined();
  });

  it("should scrub emails from strings", () => {
    const input = "Contact me at user@example.com for details";
    const expected = "Contact me at [REDACTED_EMAIL] for details";
    expect(scrubPII(input)).toBe(expected);
  });

  it("should scrub sensitive keys in objects", () => {
    const input = {
      username: "user",
      password: "supersecretpassword",
      token: "xyz123",
      meta: {
        api_secret: "hidden"
      }
    };
    const expected = {
      username: "user",
      password: "[REDACTED]",
      token: "[REDACTED]",
      meta: {
        api_secret: "[REDACTED]"
      }
    };
    expect(scrubPII(input)).toEqual(expected);
  });

  it("should handle nested objects and arrays", () => {
    const input = {
        users: [
            { email: "test@test.com", password: "123" }
        ]
    };

    expect(scrubPII(input)).toEqual({
        users: [
            { email: "[REDACTED_EMAIL]", password: "[REDACTED]" }
        ]
    });
  });

  it("should preserve non-sensitive data", () => {
      const input = { val: 123, list: [1, 2] };
      expect(scrubPII(input)).toEqual(input);
  });
});
