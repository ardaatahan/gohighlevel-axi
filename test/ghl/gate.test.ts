import { describe, expect, it } from "vitest";
import { isConfirmed, renderDryRun } from "../../src/ghl/gate.js";

describe("gate", () => {
  it("renders the method, path, summary, payload, and confirm example", () => {
    const output = renderDryRun({
      method: "POST",
      path: "/conversations/messages",
      summary: "send SMS to contact abc123",
      payload: { contactId: "abc123", type: "SMS", message: "hi" },
      confirmExample: "gohighlevel-axi message send --contact abc123 --body hi --confirm",
    });

    expect(output).toContain("dry-run: send SMS to contact abc123");
    expect(output).toContain("would-call: POST /conversations/messages");
    expect(output).toContain('contactId: "abc123"');
    expect(output).toContain("gohighlevel-axi message send --contact abc123 --body hi --confirm");
  });

  it("omits the payload block when there is no payload", () => {
    const output = renderDryRun({
      method: "DELETE",
      path: "/contacts/abc123",
      summary: "delete contact abc123",
      confirmExample: "gohighlevel-axi contact rm abc123 --confirm",
    });
    expect(output).not.toContain("payload[");
  });

  it("isConfirmed reads only an explicit boolean --confirm flag", () => {
    expect(isConfirmed({})).toBe(false);
    expect(isConfirmed({ confirm: false })).toBe(false);
    expect(isConfirmed({ confirm: "true" })).toBe(false);
    expect(isConfirmed({ confirm: true })).toBe(true);
  });
});
