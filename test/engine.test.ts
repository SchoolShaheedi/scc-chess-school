import { describe, expect, it } from "vitest";
import { asNumber } from "../src/engine/uci";
import { nodeEngine } from "./engine";

describe("stockfish (node)", () => {
  it("finds mate in one, and scores KQ vs K as winning", async () => {
    const e = await nodeEngine();
    const m = await e.analyse("6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1", { depth: 8 });
    expect(m.best).toBe("a1a8");
    expect(m.score.mate).toBe(1);
    const kq = await e.analyse("8/8/8/4k3/8/8/8/3QK3 w - - 0 1", { depth: 10 });
    expect(asNumber(kq.score)).toBeGreaterThan(500);
  }, 30000);
});
