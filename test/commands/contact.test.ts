import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseArgs } from "../../src/cli/args.js";
import {
  contactAddCommand,
  contactGetCommand,
  contactRmCommand,
  contactUpdateCommand,
} from "../../src/commands/contact.js";

function captureStdout() {
  const lines: string[] = [];
  const spy = vi.spyOn(process.stdout, "write").mockImplementation((chunk: unknown) => {
    lines.push(String(chunk));
    return true;
  });
  return { lines, restore: () => spy.mockRestore() };
}

describe("contact detail/add/rm/update", () => {
  beforeEach(() => {
    process.env["GHL_API_KEY"] = "test-token";
    process.env["GHL_LOCATION_ID"] = "loc1";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("contact <id> prints detail and truncates a long custom field", async () => {
    const longValue = "x".repeat(2000);
    const fetchMock = vi.fn(async (url: string | URL) => {
      expect(String(url)).toContain("/contacts/c1");
      return new Response(
        JSON.stringify({
          contact: { id: "c1", firstName: "Jane", lastName: "Doe", email: "jane@example.com", customFields: [{ id: "f1", value: longValue }] },
        }),
        { status: 200 },
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const out = captureStdout();
    const parsed = parseArgs(["c1"], contactGetCommand.spec);
    const code = await contactGetCommand.run(parsed);
    out.restore();

    expect(code).toBe(0);
    const output = out.lines.join("");
    expect(output).toContain("name: Jane Doe");
    expect(output).toContain("truncated");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("contact add without --confirm makes no network call and exits 0", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const out = captureStdout();
    const parsed = parseArgs(["--first-name", "Jane", "--email", "jane@example.com"], contactAddCommand.spec);
    const code = await contactAddCommand.run(parsed);
    out.restore();

    expect(code).toBe(0);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(out.lines.join("")).toContain("dry-run:");
    expect(out.lines.join("")).toContain("--confirm");
  });

  it("contact add with --confirm calls POST /contacts/ exactly once", async () => {
    const fetchMock = vi.fn(async (url: string | URL, init?: RequestInit) => {
      expect(init?.method).toBe("POST");
      expect(String(url)).toContain("/contacts/");
      const body = JSON.parse(String(init?.body));
      expect(body).toMatchObject({ locationId: "loc1", firstName: "Jane", email: "jane@example.com" });
      return new Response(JSON.stringify({ contact: { id: "new1", firstName: "Jane" } }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const parsed = parseArgs(
      ["--first-name", "Jane", "--email", "jane@example.com", "--confirm"],
      contactAddCommand.spec,
    );
    const out = captureStdout();
    const code = await contactAddCommand.run(parsed);
    out.restore();

    expect(code).toBe(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(out.lines.join("")).toContain("created: new1");
  });

  it("contact add requires at least one field flag", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const parsed = parseArgs([], contactAddCommand.spec);
    await expect(contactAddCommand.run(parsed)).rejects.toThrow(/at least one field/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("contact rm without --confirm makes no network call (destructive no-op)", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const out = captureStdout();
    const parsed = parseArgs(["c1"], contactRmCommand.spec);
    const code = await contactRmCommand.run(parsed);
    out.restore();
    expect(code).toBe(0);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(out.lines.join("")).toContain("dry-run: delete contact c1");
  });

  it("contact rm with --confirm calls DELETE /contacts/{id}", async () => {
    const fetchMock = vi.fn(async (url: string | URL, init?: RequestInit) => {
      expect(init?.method).toBe("DELETE");
      expect(String(url)).toContain("/contacts/c1");
      return new Response(JSON.stringify({ succeded: true }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);
    const parsed = parseArgs(["c1", "--confirm"], contactRmCommand.spec);
    const code = await contactRmCommand.run(parsed);
    expect(code).toBe(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("contact update is ungated: calls PUT immediately with no --confirm needed", async () => {
    const fetchMock = vi.fn(async (url: string | URL, init?: RequestInit) => {
      expect(init?.method).toBe("PUT");
      expect(String(url)).toContain("/contacts/c1");
      const body = JSON.parse(String(init?.body));
      expect(body).toEqual({ email: "new@example.com" });
      return new Response(JSON.stringify({ contact: { id: "c1", email: "new@example.com" } }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);
    const parsed = parseArgs(["c1", "--email", "new@example.com"], contactUpdateCommand.spec);
    const code = await contactUpdateCommand.run(parsed);
    expect(code).toBe(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("contact update requires at least one field flag to change", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const parsed = parseArgs(["c1"], contactUpdateCommand.spec);
    await expect(contactUpdateCommand.run(parsed)).rejects.toThrow(/at least one field/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
