// Share a game as a picture (DECISIONS #115): the card's words carry the result, the opponent, the moves and the date,
// and never a name.
import { describe, expect, it } from "vitest";
import { shareLines } from "../src/play/share";
import { UI } from "../src/i18n";

const tr = (lang: "en" | "pa") => (k: "shareWon" | "shareLost" | "shareDraw" | "shareSub") => UI[k][lang];
describe("share card words", () => {
  const day = new Date("2026-10-16T12:00:00Z");
  it("says the result, how, against whom, how long and when", () => {
    expect(shareLines({ result: "won", how: "by checkmate", opp: { en: "Chakor", pa: "ਚਕੋਰ" }, moves: 24 }, day, "en", tr("en"), String))
      .toEqual(["Won by checkmate", "against Chakor · 24 moves · 16 Oct 2026"]);
  });
  it("in Punjabi too", () => {
    const [head, sub] = shareLines({ result: "draw", how: "ਖੜੋਤ ਨਾਲ", opp: { en: "Chakor", pa: "ਚਕੋਰ" }, moves: 40 }, day, "pa", tr("pa"), String);
    expect(head).toBe("ਖੜੋਤ ਨਾਲ ਬਰਾਬਰੀ"); expect(sub.startsWith("ਚਕੋਰ ਦੇ ਵਿਰੁੱਧ · 40 ਚਾਲਾਂ · ")).toBe(true);
  });
});
