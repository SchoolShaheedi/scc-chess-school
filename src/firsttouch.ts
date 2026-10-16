// The first touch (DECISIONS #94, trial option A): right after the age choice, before any reading, the learner moves a
// real piece. A 5×5 board, a rook on a1 and a star on a5; tap the rook then a square (or drag it). The coach speaks
// (Young and Junior; the 16+ look has no coach), cheers when the star is reached, and setup carries on.
import { coachHTML, type Mood } from "./coach";
import { confetti } from "./celebrate";
import { pieceHTML } from "./chess/pieces";
import { t } from "./i18n";
import { sound } from "./sound";
import { store } from "./store";

const N = 5, FILES = "abcde", STAR = "a5";

/** Squares a rook on `from` can reach on the empty 5×5 board. */
export const rookSquares = (from: string) => {
  const f = FILES.indexOf(from[0]), r = +from[1];
  const out: string[] = [];
  for (let i = 0; i < N; i++) { if (i !== f) out.push(FILES[i] + r); if (i + 1 !== r) out.push(from[0] + (i + 1)); }
  return out;
};

export function firstTouch(root: HTMLElement, done: () => void) {
  const look = store.get().look;
  let rook = "a1", picked = false, finished = false;
  root.innerHTML = `<div class="screen ftscreen">
    ${look !== "adult" ? `<div class="coach ftcoach"><div class="av" data-av>${coachHTML(look, "happy")}</div><div class="bubble" data-say aria-live="polite">${t("ftHello")}</div></div>`
      : `<div class="hero"><h1>${t("ftTitle")}</h1><p data-say aria-live="polite">${t("ftHelloAdult")}</p></div>`}
    <div class="ftboard" data-board role="grid" aria-label="${t("ftTitle")}"></div>
    <p class="note ftrule">${t("ftRule")}</p>
    <div class="actions" style="flex-direction:column"><button class="btn wide" data-next hidden>${t("next")}</button>
      <button class="linkbtn" data-skip>${t("ftSkip")}</button></div>
  </div>`;
  const board = root.querySelector<HTMLElement>("[data-board]")!, say = root.querySelector<HTMLElement>("[data-say]")!;
  const av = root.querySelector<HTMLElement>("[data-av]");
  const mood = (m: Mood) => { if (av) av.innerHTML = coachHTML(look, m); };

  function draw() {
    const targets = picked ? rookSquares(rook) : [];
    let html = "";
    for (let r = N; r >= 1; r--) for (let f = 0; f < N; f++) {
      const sq = FILES[f] + r, light = (f + r) % 2 === 0;   // a1 dark, as on every board (lesson 1.1: light on the right)
      html += `<button class="ftsq ${light ? "l" : "d"}${targets.includes(sq) ? " dot" : ""}${sq === rook && picked ? " sel" : ""}" data-sq="${sq}" aria-label="${sq}">
        ${sq === rook ? pieceHTML("wR") : sq === STAR && !finished ? `<span class="ftstar">★</span>` : ""}</button>`;
    }
    board.innerHTML = html;
  }
  function moveTo(sq: string) {
    if (!rookSquares(rook).includes(sq)) { picked = false; draw(); return; }
    rook = sq; picked = false; sound.move();
    if (sq === STAR) {
      finished = true; draw(); sound.correct(); mood("cheer");
      say.textContent = t(look === "adult" ? "ftDoneAdult" : "ftDone");
      confetti(root);
      root.querySelector<HTMLButtonElement>("[data-next]")!.hidden = false;
      root.querySelector<HTMLButtonElement>("[data-skip]")!.hidden = true;
    } else { draw(); mood("think"); say.textContent = t("ftAgain"); }
  }
  // one pointer path for tap and drag (a click after a redraw lands on a new element and undid the pick):
  // press the rook to pick it up; let go on another square, or press a square once it is picked up
  board.addEventListener("pointerdown", e => {
    if (finished) return;
    const sq = (e.target as HTMLElement).closest<HTMLElement>("[data-sq]")?.dataset.sq;
    if (!sq) return;
    if (sq !== rook) { if (picked) moveTo(sq); return; }
    picked = true; draw();
    const up = (ev: PointerEvent) => {
      document.removeEventListener("pointerup", up);
      const to = document.elementFromPoint(ev.clientX, ev.clientY)?.closest<HTMLElement>("[data-sq]")?.dataset.sq;
      if (to && to !== rook) moveTo(to);
    };
    document.addEventListener("pointerup", up);
  });
  root.querySelector<HTMLButtonElement>("[data-next]")!.onclick = done;
  root.querySelector<HTMLButtonElement>("[data-skip]")!.onclick = done;
  draw();
}
