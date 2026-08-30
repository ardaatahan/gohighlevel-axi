import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseArgs } from "../../src/cli/args.js";
import { contactsCommand } from "../../src/commands/contacts.js";

function run(argv: string[]) {
  const parsed = parseArgs(argv, contactsCommand.spec);
  return contactsCommand.run(parsed);
}

describe("contacts command", () => {
  beforeEach(() => {
    process.env["GHL_API_KEY"] = "test-token";
    process.env["GHL_LOCATION_ID"] = "loc1";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("lists contacts with the default 4-column schema and total-count aggregate", async () => {
    const fetchMock = vi.fn(async (url: string | URL) => {
      expect(String(url)).toContain("/contacts/?locationId=loc1&limit=100");
      return new Response(
        JSON.stringify({
          contacts: [{ id: "c1", firstName: "Jane", lastName: "Doe", email: "jane@example.com", phone: "+1555" }],
          count: 42,
        }),
        { status: 200 },
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const stdout: string[] = [];
    const spy = vi.spyOn(process.stdout, "write").mockImplementation((chunk: unknown) => {
      stdout.push(String(chunk));
      return true;
    });

    const code = await run([]);
    spy.mockRestore();

    expect(code).toBe(0);
    const output = stdout.join("");
    expect(output).toContain("contacts[1 of 42 total]{id,name,email,phone}:");
    expect(output).toContain("Jane Doe");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("shows a definitive empty state naming the active query filter", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ contacts: [], count: 0 }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const stdout: string[] = [];
    const spy = vi.spyOn(process.stdout, "write").mockImplementation((chunk: unknown) => {
      stdout.push(String(chunk));
      return true;
    });
    const code = await run(["--query", "nobody"]);
    spy.mockRestore();

    expect(code).toBe(0);
    expect(stdout.join("")).toContain("0 contacts found matching query 'nobody'");
  });

  it("rejects an unknown --fields column before any network call", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(run(["--fields", "id,bogus"])).rejects.toThrow(/unknown field/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
