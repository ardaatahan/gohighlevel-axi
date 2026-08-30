import { describe, expect, it } from "vitest";
import { emitKV, parseToon } from "../../src/output/toon.js";

describe("emitKV", () => {
  it("quotes and escapes a value containing a comma and embedded quotes, matching toonValue", () => {
    const output = emitKV([
      ["companyName", 'Acme, "Prime" Inc.'],
      ["id", "abc123"],
    ]);
    const lines = output.split("\n");
    expect(lines[0]).toBe('companyName: "Acme, ""Prime"" Inc."');
    expect(lines[1]).toBe("id: abc123");
  });

  it("stays parseable by parseToon once a comma-bearing value is quoted", () => {
    // Before the fix, emitKV interpolated the raw unescaped String(v), so a
    // value like "Acme, Inc." emitted an un-quoted comma; parseToon still
    // accepts that shape (it only checks line structure, not per-field
    // content), but downstream TOON consumers that split on "," would
    // misparse the field boundary. Quoting via toonValue is what makes the
    // comma safe to embed.
    const output = emitKV([["companyName", "Acme, Inc."]]);
    expect(output).toBe('companyName: "Acme, Inc."');
    expect(parseToon(output).ok).toBe(true);
  });

  it("renders an empty string for null/undefined without a stray literal", () => {
    const output = emitKV([["middleName", null], ["suffix", undefined]]);
    expect(output).toBe("middleName:\nsuffix:");
  });
});
