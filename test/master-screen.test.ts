// @vitest-environment jsdom
// Master games: the screens work end to end in a fake browser (list, side choice, a guess, the score, the best kept).
import { beforeEach, describe, expect, it, vi } from "vitest";

let calls = 0;
vi.mock("../src/engine/browser", () => ({
  // the first search is the position before the guess (+50), the second the position after it (-45 for the opponent = +45 for the guesser)
  getEngine: () => ({ analyse: async () => ({ best: "e2e4", pv: [], score: { cp: calls++ % 2 === 0 ? 50 : -45 } }) }),
}));

import { masterScreen } from "../src/master/screen";
import { GAMES } from "../src/master/games";
import { store } from "../src/store";
import { num } from "../src/i18n";

const wait = (ms: number) => new Promise(r => setTimeout(r, ms));
/** One tap on a board square (the board listens for primary pointerdowns). */
function tap(root: HTMLElement, sq: string) {
  const cell = root.querySelector(`[data-sq="${sq}"]`)!;
  const e = new MouseEvent("pointerdown", { bubbles: true, cancelable: true, clientX: 1, clientY: 1 });
  Object.defineProperty(e, "isPrimary", { value: true });
  cell.dispatchEvent(e);
  const up = new MouseEvent("pointerup", { bubbles: true, cancelable: true, clientX: 1, clientY: 1 });
  Object.defineProperty(up, "isPrimary", { value: true });
  window.dispatchEvent(up);
}

let root: HTMLElement;
beforeEach(() => {
  document.body.innerHTML = `<div id="app"></div>`;
  root = document.getElementById("app")!;
  calls = 0;
  // jsdom has no matchMedia (the board asks it about reduced motion before sliding a piece)
  (globalThis as unknown as { matchMedia: unknown }).matchMedia = () => ({ matches: true });
  store.set({ lang: "en", masterBest: {}, xp: 0 });
});

describe("Master games screens", () => {
  it("lists all eight games with their best scores", () => {
    const stop = masterScreen(root, () => {});
    expect(root.querySelectorAll(".mgcard").length).toBe(8);
    expect(root.textContent).toContain("The Immortal Game");
    stop();
  });

  it("a guess that matches the master earns 3, an engine-equal guess 2, and the best is kept", async () => {
    const goes: string[] = [];
    const stop = masterScreen(root, h => goes.push(h), "immortal");
    expect(root.textContent).toContain("Which side do you play?");
    root.querySelector<HTMLButtonElement>('[data-side="b"]')!.click();
    expect(root.querySelector(".board")).toBeTruthy();
    expect(root.querySelector("[data-say]")!.textContent).toContain("Your move");
    const max = GAMES[0].sans.length;       // keep the linter honest: the game has moves
    expect(max).toBe(45);
    // 6...Qh6 was played (h4-h6): the same move is 3 points
    tap(root, "h4"); tap(root, "h6");
    await wait(30);
    expect(root.querySelector("[data-score]")!.textContent).toBe("3");
    expect(root.querySelector("[data-say]")!.textContent).toContain("same move");
    // go on: White's 7.d3 plays by itself, then the next guess (6...Nh5 is wrong here: guess another legal move)
    root.querySelector<HTMLButtonElement>("[data-next]")!.click();
    await wait(1100);
    expect(root.querySelector("[data-say]")!.textContent).toContain("Your move");
    tap(root, "f6"); tap(root, "a1");            // not a legal move: the board refuses it and the score does not change
    await wait(30);
    expect(root.querySelector("[data-score]")!.textContent).toBe("3");
    tap(root, "f6"); tap(root, "g4");            // a legal knight move that is not the played one: the stub engine says +45 vs +50
    await wait(60);
    expect(root.querySelector("[data-score]")!.textContent).toBe("5");
    expect(root.querySelector("[data-say]")!.textContent).toContain("Also good");
    stop();
    expect(goes).toEqual([]);
  });

  it("finishing records the score as the best and gives XP", () => {
    store.recordMaster("opera:w", 9);
    store.recordMaster("opera:w", 6);
    expect(store.get().masterBest).toEqual({ "opera:w": 9 });
    expect(store.get().xp).toBe(15);
    const stop = masterScreen(root, () => {});
    expect(root.textContent).toContain(`Best: ${num(9)} of`);
    stop();
  });
});
