import { describe, expect, it, vi } from "vitest";
import { webhooksAdd, webhooksList, webhooksRm } from "../../src/commands/webhooks.js";

describe("webhooks", () => {
  it("explains the limitation and exits 0 without any network call", async () => {
    const fetchImpl = vi.fn();
    vi.stubGlobal("fetch", fetchImpl);
    const code = await webhooksList.run({ positionals: [], flags: {}, help: false });
    expect(code).toBe(0);
    expect(fetchImpl).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("webhooks add throws a structured not-supported error, no network call", async () => {
    const fetchImpl = vi.fn();
    vi.stubGlobal("fetch", fetchImpl);
    await expect(
      webhooksAdd.run({ positionals: ["https://example.com/hook"], flags: {}, help: false }),
    ).rejects.toThrow(/not available/);
    expect(fetchImpl).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("webhooks rm throws a structured not-supported error, no network call", async () => {
    const fetchImpl = vi.fn();
    vi.stubGlobal("fetch", fetchImpl);
    await expect(webhooksRm.run({ positionals: ["sub_123"], flags: {}, help: false })).rejects.toThrow(
      /not available/,
    );
    expect(fetchImpl).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
