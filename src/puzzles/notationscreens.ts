// Write the move (Practice tools, 2026-11-03): the notation drill's screens. Two drills on positions from the puzzle bank:
// "type the move" (a position, find the best move and type it) and "name the move" (an arrow shows a move, pick or type its
// name). The reading of what was typed lives in notation.ts (tested); this file is only the screens. It opens at Level 3,
// where notation is taught.
import { placementFromFen, type Square } from "../chess/types";
import { confetti } from "../celebrate";
import { num, t } from "../i18n";
import { icon } from "../icons";
import { sound } from "../sound";
import { store, unlockAll } from "../store";
import { tabbar } from "../tabbar";
import { PACKS } from "../content/levels";
import { nearRating } from "./bank";
import { checkTyped, drillFrom, nameChoices, type NotationRead } from "./notation";
import { bar, puzzleScreen } from "./screens";

type Go = (h: string) => void;
export type NotationMode = "type" | "name";
/** Notation is taught in Level 3, so the drills open there (the dev "unlock everything" switch opens them too). */
export const NOTATION_LEVEL = 3;
export const notationOpen = (level: number) => level >= NOTATION_LEVEL || unlockAll();
const fill = (s: string, v: Record<string, string>) => Object.entries(v).reduce((a, [k, x]) => a.replace(`{${k}}`, x), s);
const esc = (x: string) => x.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

/** What to tell the learner when what they typed is not a move. */
export function refusalText(reason: Exclude<NotationRead, { ok: true }>["reason"]): string {
  return t(({ empty: "ntEmpty", unreadable: "ntUnreadable", illegal: "ntIllegal", ambiguous: "ntAmbiguous", promotion: "ntPromo" } as const)[reason]);
}

/** The text box and its button, for the drills and for typed moves in a bot game: 16px or more, so iOS does not zoom. */
export const moveFormHTML = (button = t("ntCheck")) => `<form class="ntform" data-ntform autocomplete="off">
  <input class="ntinput" data-ntinput type="text" inputmode="text" enterkeyhint="go" autocapitalize="off" autocorrect="off" spellcheck="false"
    maxlength="12" aria-label="${t("ntInput")}" placeholder="Nf3">
  <button class="btn" type="submit">${button}</button></form>`;

// ---------- the hub ----------
export function notationHub(root: HTMLElement, go: Go, level: number) {
  const open = notationOpen(level);
  const card = (mode: NotationMode, ic: Parameters<typeof icon>[0], title: string, about: string) =>
    `<button class="rushcard" data-nt="${mode}" ${open ? "" : "disabled"}><span class="rushicon">${icon(open ? ic : "lock")}</span>
      <span class="grow"><b>${title}</b><small>${open ? about : t("ntLocked")}</small></span>${open ? icon("arrowRight") : ""}</button>`;
  root.innerHTML = `<div class="screen tabbed">${bar(t("ntTitle"))}
    <p class="note">${t("ntAbout")}</p>
    ${card("type", "hint", t("ntTypeMode"), t("ntTypeAbout"))}${card("name", "target", t("ntNameMode"), t("ntNameAbout"))}
    <p class="note">${t("ntTip")}</p></div>${tabbar("puzzles")}`;
  root.querySelector<HTMLButtonElement>("[data-back]")!.onclick = () => go("#/puzzles");
  root.querySelectorAll<HTMLButtonElement>("[data-nt]").forEach(b => b.onclick = () => go(`#/puzzles/notation/${b.dataset.nt}`));
}

interface Drill { id: string; fen: string; san: string; from: Square; to: Square }

/** A drill position: a bank puzzle near the learner's rating (kept easy), else one of the puzzles already in the lessons when offline. */
async function pickDrill(used: Set<string>): Promise<Drill | null> {
  const s = store.get(), r = Math.min(1300, Math.max(400, (s.prating ?? s.rating).r - 100));
  for (let k = 0; k < 6; k++) {
    try {
      const p = await nearRating(r, used, undefined, Math.random, q => q.moves.length >= 2);
      if (!p) break;
      used.add(p.id);
      const d = drillFrom(p);
      if (d) return { id: p.id, fen: d.fen, san: d.san, from: d.from as Square, to: d.to as Square };
    } catch { break; }   // offline and the band was never opened
  }
  const pool = Object.values(PACKS).flatMap(pk => pk.puzzles).filter(p => !used.has(p.id) && p.moves.length >= 2).sort(() => Math.random() - 0.5);
  for (const p of pool.slice(0, 20)) {
    const d = drillFrom(p);
    if (d) { used.add(p.id); return { id: p.id, fen: d.fen, san: d.san, from: d.from as Square, to: d.to as Square }; }
  }
  return null;
}

// ---------- the drills ----------
export function playNotation(root: HTMLElement, go: Go, mode: NotationMode, level: number): () => void {
  if (!notationOpen(level)) { go("#/puzzles/notation"); return () => {}; }
  const used = new Set<string>();
  let alive = true, right = 0, ui: ReturnType<typeof puzzleScreen> | null = null;
  const teardown = () => { alive = false; ui?.board.destroy(); ui = null; };
  const head = () => `<span class="pill rushhead"><b data-score>${fill(t("ntScore"), { n: num(right) })}</b></span>`;

  async function next() {
    if (!alive) return;
    ui?.board.destroy();
    ui = puzzleScreen(root, `${t("ntTitle")}`, head());
    const here = ui;
    root.querySelector<HTMLButtonElement>("[data-back]")!.onclick = () => { teardown(); go("#/puzzles/notation"); };
    const d = await pickDrill(used);
    if (!alive || ui !== here) return;
    if (!d) { here.say(t("ntNone"), "no"); return; }
    const black = d.fen.split(" ")[1] === "b";
    here.board.setFlip(black);
    here.board.interact({});
    if (mode === "name") here.board.set(placementFromFen(d.fen), { arrows: [[d.from, d.to]] });
    else here.board.set(placementFromFen(d.fen));
    here.say(mode === "type" ? fill(t("ntAskType"), { side: fill(t("toMove"), { side: t(black ? "colourBlackObl" : "colourWhiteObl") }) }) : t("ntAskName"), "info");
    here.status(`<p class="note">${t("ntTip")}</p>`);
    let tries = 0, done = false;

    const finish = (ok: boolean, msg: string) => {
      done = true;
      if (ok) { right++; sound.correct(); if (right % 5 === 0) confetti(root.querySelector(".screen")!, 20); } else sound.wrong();
      here.say(msg, ok ? "ok" : "no");
      const sc = root.querySelector("[data-score]"); if (sc) sc.textContent = fill(t("ntScore"), { n: num(right) });
      // show the move on the board, whatever the answer was
      here.board.set(placementFromFen(d.fen), { arrows: [[d.from, d.to]] });
      root.querySelectorAll<HTMLInputElement | HTMLButtonElement>("[data-ntform] input, [data-ntform] button, [data-pick]").forEach(x => { x.disabled = true; });
      here.actions.innerHTML = `<button class="btn wide" data-next>${t("next")}</button>`;
      const nb = here.actions.querySelector<HTMLButtonElement>("[data-next]")!;
      nb.onclick = () => void next(); nb.focus();
    };

    /** A typed answer. */
    const answer = (text: string) => {
      if (done) return;
      const c = checkTyped(d.fen, text, d.san);
      if (c.result === "right") return finish(true, fill(t(c.exact ? "ntRightExact" : "ntRight"), { san: esc(c.san) }));
      if (c.result !== "wrong") { here.say(refusalText(c.result), "no"); here.board.shake(d.to); return; }
      tries++;
      if (mode === "name") return finish(false, fill(t("ntWrongName"), { san: esc(d.san) }));
      if (tries >= 2) return finish(false, fill(t("ntReveal"), { san: esc(d.san) }));
      here.say(fill(t("ntWrongLegal"), { san: esc(c.san) }), "no"); sound.wrong();
    };

    if (mode === "name") {
      const names = nameChoices(d.fen, d.san);
      here.extra.innerHTML = `<div class="ntchoices">${names.map(n => `<button class="btn ghost" data-pick="${esc(n)}">${esc(n)}</button>`).join("")}</div>${moveFormHTML()}`;
      here.extra.querySelectorAll<HTMLButtonElement>("[data-pick]").forEach(b => b.onclick = () => {
        if (done) return;
        const ok = b.dataset.pick === d.san;
        finish(ok, ok ? fill(t("ntRightExact"), { san: esc(d.san) }) : fill(t("ntWrongName"), { san: esc(d.san) }));
      });
    } else here.extra.innerHTML = moveFormHTML();
    const input = here.extra.querySelector<HTMLInputElement>("[data-ntinput]")!;
    here.extra.querySelector<HTMLFormElement>("[data-ntform]")!.onsubmit = e => { e.preventDefault(); answer(input.value); };
    if (mode === "type") input.focus();
  }

  void next();
  return teardown;
}
