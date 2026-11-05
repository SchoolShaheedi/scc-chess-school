// @vitest-environment jsdom
// "Learn all the checkmates" (DECISIONS #137): the screens work end to end in a fake browser - the list, a mate's page,
// See it, Watch the build-up, Do it with help (a slip and the whole line), Practise (real bank positions), the review.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Chess } from "chess.js";
import { MATES, mateById } from "../src/content/mates";
import { matesHub, matesPage, runMate, trainMates } from "../src/mates/screens";
import { plies } from "../src/mates/line";
import { pool } from "../src/mates/practice";
import * as P from "../src/mates/progress";
import { store, today } from "../src/store";

const wait = (ms: number) => new Promise(r => setTimeout(r, ms));
function tap(root: HTMLElement, sq: string) {
  const cell = root.querySelector(`[data-sq="${sq}"]`)!;
  const e = new MouseEvent("pointerdown", { bubbles: true, cancelable: true, clientX: 1, clientY: 1 });
  Object.defineProperty(e, "isPrimary", { value: true });
  cell.dispatchEvent(e);
  const up = new MouseEvent("pointerup", { bubbles: true, cancelable: true, clientX: 1, clientY: 1 });
  Object.defineProperty(up, "isPrimary", { value: true });
  window.dispatchEvent(up);
}
const move = (root: HTMLElement, uci: string) => { tap(root, uci.slice(0, 2)); tap(root, uci.slice(2, 4)); };
/** Wait for something to happen (the other side's reply, a screen drawn): polls instead of guessing a time, so a busy machine cannot make the test flaky. */
async function until(fn: () => unknown, ms = 8000) { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (fn()) return true; await wait(20); } return false; }
const say = () => document.querySelector("[data-say]")?.textContent ?? "";
/** Play the learner's move once it is their turn (the other side's reply has been played). */
async function mine(root: HTMLElement, uci: string) { expect(await until(() => /Your move/.test(say())), "it becomes the learner's turn").toBe(true); move(root, uci); }
/** Play a move in a puzzle until it is accepted (the puzzle plays the opponent's first move by itself, a little after it opens). */
async function solve(root: HTMLElement, uci: string) { for (let k = 0; k < 60 && !root.querySelector("[data-next]"); k++) { move(root, uci); await wait(120); } expect(root.querySelector("[data-next]"), `${uci} was accepted`).toBeTruthy(); }

let root: HTMLElement;
beforeEach(() => {
  document.body.innerHTML = `<div id="app"></div>`;
  root = document.getElementById("app")!;
  (globalThis as unknown as { matchMedia: unknown }).matchMedia = () => ({ matches: true });
  store.set({ lang: "en", look: "junior", mates: undefined, xp: 0 });
});

describe("the list", () => {
  it("shows every mate in its group with a mini-board and three bars, and 0 of N learnt", () => {
    matesHub(root, () => {});
    expect(root.querySelectorAll(".mrow").length).toBe(MATES.length);
    expect(root.querySelectorAll("h2.sec").length).toBe(7);
    expect(root.textContent).toContain(`0 of ${MATES.length} learnt`);
    expect(root.querySelector(".mrow .thumb.mini .k")).toBeTruthy();
    expect(root.querySelectorAll(".mrow")[0].querySelectorAll(".mbars i").length).toBe(3);
    expect(root.querySelector("[data-review]")).toBeNull();   // nothing to review yet
  });
  it("counts a mate as learnt once see, watch, help and every practice stage are done, and ticks it", () => {
    const id = "backrank";
    for (const s of ["see", "watch", "help"]) P.markDone(id, s);
    expect(P.learnt(id)).toBe(false);
    for (const n of P.stagesOf(id)) P.markDone(id, `p${n}`);
    expect(P.learnt(id)).toBe(true);
    matesHub(root, () => {});
    expect(root.textContent).toContain(`1 of ${MATES.length} learnt`);
    expect(root.querySelector(".mrow.learnt .mtick")).toBeTruthy();
    expect(root.querySelectorAll(".mbars i.on").length).toBe(P.stagesOf(id).length);
  });
  it("opens a mate on a tap", () => {
    const goes: string[] = [];
    matesHub(root, h => goes.push(h));
    root.querySelector<HTMLButtonElement>('[data-m="arabian"]')!.click();
    expect(goes).toEqual(["#/mates/arabian"]);
  });
  it("is in Punjabi too", () => {
    store.set({ lang: "pa" });
    matesHub(root, () => {});
    expect(root.textContent).toContain("ਸਾਰੀਆਂ ਸ਼ਹਿ-ਮਾਤਾਂ ਸਿੱਖੋ");
  });
});

describe("a mate's page", () => {
  it("has the picture, the computed why, and five steps", () => {
    const stop = matesPage(root, "arabian", () => {});
    expect(root.querySelector(".board")).toBeTruthy();
    expect(root.querySelector(".whybox")!.textContent).toContain("gives check");
    expect(root.querySelectorAll(".lslist .li").length).toBe(5);
    expect(root.querySelector(".li.current")!.textContent).toContain("See it");
    expect(root.querySelector('[data-step="practise"]')!.textContent).toMatch(/\d \+ \d/);
    stop();
  });
  it("a basic mate the lessons teach links there; one with no positions says so", () => {
    const goes: string[] = [];
    let stop = matesPage(root, "queenmate", h => goes.push(h));
    root.querySelector<HTMLButtonElement>('[data-step="practise"]')!.click();
    expect(goes).toEqual(["#/lesson/3.3"]);
    stop();
    stop = matesPage(root, "bishopknight", h => goes.push(h));
    root.querySelector<HTMLButtonElement>('[data-step="practise"]')!.click();
    expect(goes[1]).toBe("#/ladder/bishop-knight");
    stop();
    stop = matesPage(root, "twobishops", h => goes.push(h));
    expect(root.querySelector('[aria-disabled="true"]')!.textContent).toContain("No practice positions");
    stop();
  });
  it("an unknown mate goes back to the list", () => {
    const goes: string[] = [];
    matesPage(root, "nonsense", h => goes.push(h));
    expect(goes).toEqual(["#/mates"]);
  });
});

describe("See it", () => {
  it("shows why, with the key, and continuing ticks the step", () => {
    const goes: string[] = [];
    const stop = runMate(root, "smothered", "see", h => goes.push(h));
    expect(root.querySelector("[data-say]")!.textContent).toContain("gives check");
    expect(root.querySelectorAll(".boxkey li").length).toBe(4);
    root.querySelector<HTMLButtonElement>("[data-next]")!.click();
    expect(P.doneKeys("smothered")).toContain("see");
    expect(goes).toEqual(["#/mates/smothered/watch"]);
    stop();
  });
});

describe("Watch the build-up", () => {
  it("steps forward and back through the line with a note on each move, and ticks at the end", () => {
    const m = mateById("scholars")!, ps = plies(m);
    const stop = runMate(root, "scholars", "watch", () => {});
    const fwd = root.querySelector<HTMLButtonElement>("[data-fwd]")!, back = root.querySelector<HTMLButtonElement>("[data-back1]")!;
    expect(root.querySelector("[data-say]")!.textContent).toContain("Press play");
    expect(back.disabled).toBe(true);
    expect(root.querySelector<HTMLButtonElement>("[data-next]")!.hidden).toBe(true);
    for (let i = 0; i < ps.length; i++) fwd.click();
    expect(root.querySelector("[data-say]")!.textContent).toContain("Checkmate!");
    expect(P.doneKeys("scholars")).toContain("watch");
    expect(root.querySelector<HTMLButtonElement>("[data-next]")!.hidden).toBe(false);
    expect(fwd.disabled).toBe(true);
    back.click();
    expect(root.querySelector("[data-say]")!.textContent).toMatch(/They play|Check|quiet|threatens/i);
    stop();
  });
  it("plays by itself", async () => {
    vi.useFakeTimers();
    const stop = runMate(root, "fools", "watch", () => {});
    await vi.advanceTimersByTimeAsync(900 + 1500 * 5);
    expect(P.doneKeys("fools")).toContain("watch");
    stop();
    vi.useRealTimers();
  });
});

describe("Do it with help", () => {
  it("shows the green box and the glowing piece, scolds a slip, then plays the whole line and joins the review", async () => {
    const m = mateById("fools")!, ps = plies(m);   // Black mates: 1.f3 e5 2.g4 Qh4#
    const stop = runMate(root, "fools", "help", () => {});
    expect(await until(() => /Your move/.test(say()))).toBe(true);   // the opening move of the line plays itself
    expect(root.querySelector(".best")).toBeTruthy();
    expect(root.querySelector(".glow")).toBeTruthy();
    move(root, "a7a6");   // legal but not the move
    expect(say()).toContain("green box");
    move(root, ps[1].uci);
    await mine(root, ps[3].uci);
    expect(await until(() => /whole line/.test(say()))).toBe(true);
    expect(P.doneKeys("fools")).toContain("help");
    expect(store.get().mates!.cards["mate:fools"]).toBeTruthy();
    expect(P.dueCount()).toBe(1);
    stop();
  });
  it("plays a whole bank line, the other side's first move playing itself", async () => {
    const m = mateById("backrank")!, ps = plies(m);   // Black mates: 1...Ra1+ 2...Rxc1+ 3...Rxd1#, White's Rd2 first
    const stop = runMate(root, "backrank", "help", () => {});
    for (const p of ps.filter(x => x.mine)) await mine(root, p.uci);
    expect(await until(() => P.doneKeys("backrank").includes("help"))).toBe(true);
    stop();
  }, 30000);
  it("on the last move any move that gives checkmate counts, as it does in the puzzles", async () => {
    // find a mate whose last position has a second mating move, and mate with that one instead
    const found = MATES.map(m => ({ m, ps: plies(m) })).map(({ m, ps }) => {
      const last = ps[ps.length - 1], g = new Chess(last.before);
      const alt = g.moves({ verbose: true }).find(x => `${x.from}${x.to}` !== last.uci.slice(0, 4) && !x.promotion && (() => { const h = new Chess(last.before); h.move(x); return h.isCheckmate(); })());
      return alt ? { m, ps, alt: `${alt.from}${alt.to}` } : null;
    }).find(Boolean);
    expect(found, "some mate in the list has a second mating move on its last ply").toBeTruthy();
    const { m, ps, alt } = found!;
    const stop = runMate(root, m.id, "help", () => {});
    const mineMoves = ps.filter(x => x.mine);
    for (const [i, p] of mineMoves.entries()) await mine(root, i === mineMoves.length - 1 ? alt : p.uci);
    expect(await until(() => P.doneKeys(m.id).includes("help")), `${m.id} finished with the other mate ${alt}`).toBe(true);
    stop();
  }, 30000);
});

describe("Practise", () => {
  it("asks real positions stage by stage and ticks each stage cleared", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const id = "backrank";
    const stop = runMate(root, id, "practise", () => {});
    expect(await until(() => root.querySelector(".board"))).toBe(true);
    const first = (await pool(id, 1)).slice(0, P.stageSize(id, 1));
    expect(first.length).toBe(3);
    for (const p of first) {
      await solve(root, p.moves[1]);
      root.querySelector<HTMLButtonElement>("[data-next]")!.click();
      await until(() => root.querySelector(".board") || root.querySelector(".complete"));
    }
    expect(await until(() => P.stageDone(id, 1))).toBe(true);
    expect(root.textContent).toContain("Mate in 1");
    stop();
    vi.restoreAllMocks();
  }, 30000);
});

describe("the review", () => {
  it("a mate that has joined comes back with a fresh position; a clean answer moves it up a box", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    P.markDone("backrank", "help"); P.joinReview("backrank");
    expect(P.dueCount()).toBe(1);
    const stop = trainMates(root, () => {});
    expect(await until(() => root.querySelector(".board"))).toBe(true);
    const stage = P.stagesOf("backrank")[0];
    const p = (await pool("backrank", stage))[0];
    expect(p.moves.length).toBe(2 * stage);
    expect(stage).toBe(1);   // the random pick is mocked to the first stage: mate in 1
    await solve(root, p.moves[1]);
    expect(await until(() => store.get().mates!.cards["mate:backrank"].box === 1)).toBe(true);
    expect(store.get().mates!.cards["mate:backrank"].due > today()).toBe(true);
    stop();
    vi.restoreAllMocks();
  }, 30000);
  it("shows a Review row on the list once there is a card", () => {
    P.markDone("arabian", "help"); P.joinReview("arabian");
    matesHub(root, () => {});
    expect(root.querySelector("[data-review]")!.textContent).toContain("1 to review");
  });
});
