// "The game is over" (DECISIONS #117): which badge each king gets, and the banner's words.
import { describe, expect, it } from "vitest";
import { bannerText, endBadges, kindOf } from "../src/play/gameover";
import { t } from "../src/i18n";
import { store } from "../src/store";

describe("game over", () => {
  it("a mated king gets #, the winner a crown; a draw gives both kings ½", () => {
    expect(endBadges("mate", "w")).toEqual({ b: "win", w: "mate" });
    expect(endBadges("resign", "b")).toEqual({ w: "win", b: "resign" });
    expect(endBadges("time", "w")).toEqual({ b: "win", w: "time" });
    expect(endBadges("stalemate", null)).toEqual({ w: "draw", b: "draw" });
    expect(endBadges("other", "b")).toEqual({ w: "win" });   // a capture race: just the winner's crown
  });
  it("reads the kind of ending from the games' own words", () => {
    expect(kindOf(t("byMate"), false)).toBe("mate");
    expect(kindOf(t("byResign"), false)).toBe("resign");
    expect(kindOf(t("byTime"), true)).toBe("draw");
    expect(kindOf(t("byStalemate"), true)).toBe("stalemate");
    expect(kindOf(t("byAgreement"), true)).toBe("draw");
  });
  it("the banner says what happened and the score", () => {
    store.set({ lang: "en" });
    expect(bannerText("mate", "w")).toBe("Checkmate · 0–1");
    expect(bannerText("resign", "b")).toBe("Black resigned · 1–0");
    expect(bannerText("draw", null)).toBe("Draw · ½–½");
    // Punjabi: the colour goes oblique before ਨੇ and ਦਾ
    store.set({ lang: "pa" });
    expect(bannerText("resign", "w")).toBe("ਚਿੱਟੇ ਨੇ ਹਾਰ ਮੰਨ ਲਈ · 0–1");
    expect(bannerText("time", "b")).toBe("ਕਾਲੇ ਦਾ ਸਮਾਂ ਮੁੱਕ ਗਿਆ · 1–0");
    expect(bannerText("other", "b")).toBe("ਚਿੱਟਾ ਜਿੱਤ ਗਿਆ · 1–0");
    store.set({ lang: "en" });
  });
});
