// DECISIONS #29, #84: no religious symbols on pieces. The open-licence sets from Lichess draw a cross on the king;
// it was removed by hand (public/art/pieces/CREDITS.md). This guards against a re-download putting it back.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (set: string, p: string) => readFileSync(new URL(`../public/art/pieces/${set}/${p}.svg`, import.meta.url), "utf8");
const CROSSES: Record<string, string[]> = {
  cburnett: ["M22.5 11.63V6", "M22.5 11.6V6", "M20 8h5"],
  chessnut: ["M404.3 94.6v189", "V94.6h-30.2"],
  spatial: ['<path id="cross', "V72.16h-69.602"],   // (its "cross-gradient" is only a colour fill's name)
};

describe("open-licence piece sets", () => {
  for (const [set, marks] of Object.entries(CROSSES))
    for (const k of ["wK", "bK"]) it(`${set} ${k} has no cross`, () => { for (const m of marks) expect(read(set, k)).not.toContain(m); });
  const BISHOP_CROSSES: Record<string, string[]> = {
    cburnett: ["m-7.5-14.5v5M20 18h5"], chessnut: ["v184.7m-70.2-94h140.4", "v184.7m-69.1-94h140.4"], spatial: ["m-14.743 321.674"],
  };
  for (const [set, marks] of Object.entries(BISHOP_CROSSES))
    for (const b of ["wB", "bB"]) it(`${set} ${b} has no cross`, () => { for (const m of marks) expect(read(set, b)).not.toContain(m); });
  it("merida bishops have their cross covered", () => {
    for (const b of ["wB", "bB"]) expect(read("merida", b)).toContain('<ellipse cx="24.9" cy="22.7"');
  });
  it("merida kings are clipped below the cross", () => {
    for (const k of ["wK", "bK"]) expect(read("merida", k)).toContain('clip-path="url(#nocross)"');
  });
  it("every open set has all twelve pieces and no scripts", () => {
    for (const set of ["cburnett", "merida", "chessnut", "spatial"])
      for (const c of "wb") for (const p of "KQRBNP") expect(read(set, c + p)).not.toMatch(/<script|onload=/i);
  });
});
