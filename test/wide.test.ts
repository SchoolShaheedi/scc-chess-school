// @vitest-environment jsdom
// DECISIONS #126/#128: the wide split puts back the exact one-column screen, tabs included; the opening name comes from the moves.
import { beforeEach, describe, expect, it } from "vitest";
import { splitScreen, unsplitScreen } from "../src/wide";
import { openingOf } from "../src/widetabs";

const GAME = `<div class="screen gamescreen" data-botgame="1">
  <div class="lessonbar"><h1>Titli</h1></div>
  <div class="pbar" data-top></div><div class="frame"><div data-board></div></div><div class="pbar" data-bottom></div>
  <div class="coach gcoach"><div class="bubble" data-csay></div></div>
  <p class="gstate" data-state></p>
  <div class="moverow"><button data-prev></button><div class="movelist" data-moves></div><button data-next></button></div>
  <div class="extra" data-extra></div>
  <div class="actions" data-acts><button class="btn" data-undo>Undo</button><button class="btn" data-resign>Resign</button></div></div>`;
let s: HTMLElement;
beforeEach(() => { document.body.innerHTML = GAME; s = document.querySelector(".screen")!; });
const tick = () => new Promise(r => setTimeout(r, 20));

describe("the bot game's tabs", () => {
  it("makes a tablist with Moves, Coach and Opening, and shows the Moves panel", () => {
    expect(splitScreen(s)).toBe("board");
    const tabs = [...s.querySelectorAll<HTMLElement>('[role="tab"]')];
    expect(tabs.map(x => x.dataset.tab)).toEqual(["moves", "coach", "opening"]);
    expect(tabs.map(x => x.getAttribute("aria-selected"))).toEqual(["true", "false", "false"]);
    expect(s.querySelector('[role="tablist"]')).toBeTruthy();
    const panel = s.querySelector<HTMLElement>('#wt-panel-moves')!;
    expect(panel.getAttribute("role")).toBe("tabpanel");
    expect(panel.hidden).toBe(false);
    expect(panel.querySelector("[data-acts]")).toBeTruthy();
    expect(s.querySelector<HTMLElement>("#wt-panel-coach")!.hidden).toBe(true);
  });
  it("moves between tabs with the arrow keys", () => {
    splitScreen(s);
    const tabs = [...s.querySelectorAll<HTMLElement>('[role="tab"]')];
    tabs[0].focus();
    tabs[0].dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    expect(tabs[1].getAttribute("aria-selected")).toBe("true");
    tabs[1].dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
    tabs[0].dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
    expect(tabs[2].getAttribute("aria-selected")).toBe("true");   // wraps round
  });
  it("names the opening after each move, and nothing before the first", async () => {
    splitScreen(s);
    await tick();
    const open = s.querySelector<HTMLElement>("#wt-panel-opening")!;
    expect(open.textContent).toBe("");
    const moves = s.querySelector("[data-moves]")!;
    moves.innerHTML = `<i>1.</i><button class="mv">e4</button> <button class="mv">c5</button>`;
    // the names file loads asynchronously: under a busy test run one tick is not always enough, so wait up to 2 s
    for (let i = 0; i < 100 && !open.textContent?.includes("Sicilian"); i++) await new Promise(r => setTimeout(r, 20));
    expect(open.textContent).toContain("Sicilian Defence");
  });
  it("puts the exact original screen back when the window narrows, tabs and all", async () => {
    const flat = (h: string) => h.replace(/>\s+</g, "><");   // the split drops the blank text between elements, as it always has
    const before = flat(s.outerHTML);
    splitScreen(s);
    s.querySelector<HTMLElement>("[data-moves]")!.innerHTML = `<i>1.</i><button class="mv">e4</button>`;
    s.querySelector<HTMLElement>('[data-tab="coach"]')!.click();
    await tick();
    unsplitScreen(s);
    s.querySelector<HTMLElement>("[data-moves]")!.innerHTML = "";
    expect(flat(s.outerHTML)).toBe(before);
    expect(s.querySelector('[role="tablist"], .wcol, .wpanel')).toBeNull();
    // and it can split again
    expect(splitScreen(s)).toBe("board");
  });
  it("leaves a game without a coach with Moves and Opening only", () => {
    s.querySelector(".gcoach")!.remove();
    splitScreen(s);
    expect([...s.querySelectorAll<HTMLElement>('[role="tab"]')].map(x => x.dataset.tab)).toEqual(["moves", "opening"]);
  });
  it("gives other screens no tabs", () => {
    s.removeAttribute("data-botgame");
    splitScreen(s);
    expect(s.querySelector('[role="tablist"]')).toBeNull();
    unsplitScreen(s);
    expect(s.querySelector(".wcol")).toBeNull();
  });
});

describe("openingOf", () => {
  const names = { "e4 c5": "Sicilian Defence", "e4 e5 Nf3 Nc6 Bc4": "Italian Game", "d4": "Queen's Pawn Game" };
  it("takes the longest line the game starts with", () => {
    expect(openingOf(["e4", "c5", "Nf3"], names)).toBe("Sicilian Defence");
    expect(openingOf(["e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5"], names)).toBe("Italian Game");
  });
  it("ignores check marks, and is null for an unnamed line", () => {
    expect(openingOf(["d4+"], names)).toBe("Queen's Pawn Game");
    expect(openingOf(["a3", "a6"], names)).toBeNull();
  });
});
