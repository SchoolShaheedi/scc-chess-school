// The board. It draws a position and marks, and turns taps and drags into "move from→to" or
// "tapped a square". It knows no rules: the exercise driving it says which pieces may be
// picked up and where they may go, and gets told what the learner tried.
import { sound } from "../sound";
import { t } from "../i18n";
import { store } from "../store";
import { pieceHTML } from "./pieces";
import { ALL_SQUARES, FILES, type Placement, type Square, fileOf, isLight, rankOf } from "./types";

export interface Marks {
  highlights?: Square[]; dots?: Square[]; crosses?: Square[]; stars?: Square[];
  arrows?: [Square, Square][]; lastMove?: [Square, Square]; goal?: Square; flash?: { sq: Square; ok: boolean };
  check?: Square;             // a king in check glows red
  premove?: [Square, Square]; // a move queued while the other side thinks (DECISIONS #84)
}

export interface Interaction {
  /** May this square's piece be picked up? Return a reason string to refuse it out loud. */
  canPick?(s: Square): true | string;
  /** Where the picked-up piece may go - shown as dots. */
  targets?(s: Square): Square[];
  /** The learner moved a piece (by drag or tap-tap). */
  onMove?(from: Square, to: Square): void;
  /** A tap that is not part of a move (coordinate and placement drills). */
  onTap?(s: Square): void;
}

export class Board {
  readonly el: HTMLElement;
  private grid: HTMLElement;
  private overlay: SVGSVGElement;
  private pos: Placement = {};
  private marks: Marks = {};
  private selected: Square | null = null;
  /** The keyboard focus square (DECISIONS #76): arrow keys move it, Enter/Space act on it like a tap. */
  private cursor: Square = "e2";
  private io: Interaction = {};
  private flip = false;
  private coords = true;
  private drag: { from: Square; ghost: HTMLElement; startX: number; startY: number; moved: boolean; wasSelected: boolean } | null = null;
  private lastDown = { sq: "", at: 0 };
  /** The learner's own drawings (right-click, as on chess.com): arrows and circles, cleared by the next left click. */
  private drawn: { arrows: [Square, Square][]; circles: Square[] } = { arrows: [], circles: [] };
  private rightFrom: Square | null = null;

  constructor(host: HTMLElement, opts: { flip?: boolean; coords?: boolean } = {}) {
    this.flip = !!opts.flip;
    this.coords = opts.coords ?? true;
    this.el = document.createElement("div");
    this.el.className = "board";
    this.el.innerHTML = `<div class="grid" role="group" aria-label="${t("boardLabel")}"></div><svg class="overlay" viewBox="0 0 8 8" aria-hidden="true"></svg><div class="sronly" aria-live="polite"></div>`;
    this.grid = this.el.querySelector(".grid")!;
    this.overlay = this.el.querySelector(".overlay")!;
    host.appendChild(this.el);
    this.grid.addEventListener("pointerdown", e => this.down(e));
    this.grid.addEventListener("keydown", e => this.key(e));
    this.grid.addEventListener("contextmenu", e => e.preventDefault());
    window.addEventListener("pointermove", this.moveHandler);
    window.addEventListener("pointerup", this.upHandler);
    // phones cancel a touch when it turns into a scroll, a long-press menu or a system gesture; without this the
    // half-finished drag stayed open and the board refused every move after it (reported 2026-10-05)
    window.addEventListener("pointercancel", this.cancelHandler);
  }

  destroy() {
    window.removeEventListener("pointermove", this.moveHandler);
    window.removeEventListener("pointerup", this.upHandler);
    window.removeEventListener("pointercancel", this.cancelHandler);
    this.drag?.ghost.remove(); this.drag = null;
    this.el.remove();
  }

  setFlip(flip: boolean) { this.flip = flip; this.render(); }
  interact(io: Interaction) { this.io = io; this.selected = null; this.render(); }
  position() { return this.pos; }

  set(pos: Placement, marks: Marks = {}, animate?: [Square, Square]) {
    // an animated set() is a move actually being played: that is when the board makes its sound
    if (animate) {
      const captured = !!this.pos[animate[1]] || Object.keys(this.pos).length > Object.keys(pos).length;
      if (marks.check) sound.check(); else if (captured) sound.capture(); else sound.move();
    }
    this.pos = pos; this.marks = marks; this.selected = null;
    if (animate) this.drawn = { arrows: [], circles: [] };   // a move played clears what was drawn
    this.render();
    if (animate) this.slide(animate[0], animate[1]);
  }
  mark(marks: Marks) { this.marks = { ...this.marks, ...marks }; this.render(); }

  /** Shake a square to say "no" without words; the exercise says why in the coach line. */
  shake(s: Square) {
    const cell = this.cell(s);
    cell?.classList.remove("shake"); void cell?.offsetWidth; cell?.classList.add("shake");
    // a short buzz on phones that have one (DECISIONS #67); quietly ignored elsewhere and when sound is off
    if (store.get().buzz) try { navigator.vibrate?.(40); } catch { /* not supported */ }
  }

  private order(): Square[] {
    const rows: Square[] = [];
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) {
      const r = this.flip ? i : 7 - i, f = this.flip ? 7 - j : j;
      rows.push(FILES[f] + (r + 1));
    }
    return rows;
  }

  private cell(s: Square) { return this.grid.querySelector<HTMLElement>(`[data-sq="${s}"]`); }

  private render() {
    const m = this.marks, dots = new Set(this.selected && this.io.targets ? this.io.targets(this.selected) : m.dots ?? []);
    const has = (list: Square[] | undefined, s: Square) => !!list?.includes(s);
    const lastRow = this.flip ? "8" : "1", firstFile = this.flip ? "h" : "a";
    this.grid.innerHTML = this.order().map(s => {
      const p = this.pos[s];
      const cls = ["sq", isLight(s) ? "l" : "d",
        has(m.highlights, s) && "hl", has(m.lastMove, s) && "last", s === this.selected && "sel",
        dots.has(s) && (p ? "cap" : "dot"), has(m.crosses, s) && "cross", m.goal === s && "goal",
        m.flash?.sq === s && (m.flash.ok ? "ok" : "no"), m.check === s && "incheck", p && this.io.canPick?.(s) === true && "pickable",
        has(m.premove, s) && "pre", this.drawn.circles.includes(s) && "circled"]
        .filter(Boolean).join(" ");
      const star = has(m.stars, s) ? `<span class="star" aria-hidden="true">★</span>` : "";
      // a marked EMPTY square also shows its name, so a learner sees both where it is and what it is called (#83)
      const name = !p && has(m.highlights, s) ? `<b class="sqname" aria-hidden="true">${s}</b>` : "";
      const co = this.coords
        ? (s[1] === lastRow ? `<span class="co f">${s[0]}</span>` : "") + (s[0] === firstFile ? `<span class="co r">${s[1]}</span>` : "")
        : "";
      const label = `${s}${p ? ", " + pieceName(p) : ""}${s === this.selected ? ", " + t("srPicked") : ""}${dots.has(s) ? ", " + t("srCanGo") : ""}`;
      return `<div class="${cls}" data-sq="${s}" role="button" tabindex="${s === this.cursor ? 0 : -1}" aria-label="${label}">${star}${name}${p ? pieceHTML(p) : ""}${co}</div>`;
    }).join("");
    this.drawArrows();
  }

  private xy(s: Square): [number, number] {
    const f = fileOf(s), r = rankOf(s);
    return this.flip ? [7 - f + 0.5, r + 0.5] : [f + 0.5, 7 - r + 0.5];
  }

  private drawArrows() {
    const line = (a: Square, b: Square, colour: string, head: string) => {
      const [x1, y1] = this.xy(a), [x2, y2] = this.xy(b);
      const len = Math.hypot(x2 - x1, y2 - y1), k = (len - 0.32) / len; // stop short so the head sits in the square
      return `<line x1="${x1}" y1="${y1}" x2="${x1 + (x2 - x1) * k}" y2="${y1 + (y2 - y1) * k}" stroke="${colour}" stroke-width="0.17" stroke-linecap="round" marker-end="url(#${head})" opacity=".85"/>`;
    };
    const marker = (id: string, colour: string) => `<marker id="${id}" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="3.2" markerHeight="3.2" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="${colour}"/></marker>`;
    this.overlay.innerHTML = `<defs>${marker("ah", "var(--arrow)")}${marker("uh", "var(--user-arrow)")}</defs>`
      + (this.marks.arrows ?? []).map(([a, b]) => line(a, b, "var(--arrow)", "ah")).join("")
      + this.drawn.arrows.map(([a, b]) => line(a, b, "var(--user-arrow)", "uh")).join("");
  }

  /** Right button: press and release on one square circles it; on two squares draws an arrow. Again removes it. */
  private rightUp(to: Square | null) {
    const from = this.rightFrom; this.rightFrom = null;
    if (!from || !to) return;
    const d = this.drawn;
    if (from === to) d.circles = d.circles.includes(to) ? d.circles.filter(s => s !== to) : [...d.circles, to];
    else d.arrows = d.arrows.some(([a, b]) => a === from && b === to) ? d.arrows.filter(([a, b]) => !(a === from && b === to)) : [...d.arrows, [from, to]];
    this.render();
  }

  /** FLIP animation: the piece is drawn at its new square, then slid in from the old one. */
  private slide(from: Square, to: Square) {
    const a = this.cell(from)?.getBoundingClientRect(), b = this.cell(to)?.getBoundingClientRect();
    const pc = this.cell(to)?.querySelector<HTMLElement>(".pc");
    if (!a || !b || !pc || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    pc.style.transition = "none";
    pc.style.transform = `translate(${a.left - b.left}px, ${a.top - b.top}px)`;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      pc.style.transition = "transform 220ms cubic-bezier(.2,.7,.2,1)";
      pc.style.transform = "";
    }));
  }

  private squareAt(x: number, y: number): Square | null {
    const el = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-sq]");
    return el && this.grid.contains(el) ? el.dataset.sq! : null;
  }

  private down(e: PointerEvent) {
    const s = (e.target as HTMLElement).closest<HTMLElement>("[data-sq]")?.dataset.sq;
    if (!s || !ALL_SQUARES.includes(s) || !e.isPrimary) return;
    if (e.button === 2) { this.rightFrom = s; return; }
    if (this.drawn.arrows.length || this.drawn.circles.length) { this.drawn = { arrows: [], circles: [] }; this.render(); }
    if (this.drag) this.dropDrag();   // a drag whose end never arrived: let go of it rather than lock the board
    // some touch stacks deliver one tap as two pointerdowns; a repeat within 60ms is the same tap
    if (this.lastDown.sq === s && e.timeStamp - this.lastDown.at < 60) return;
    this.lastDown = { sq: s, at: e.timeStamp };
    // a second tap on a target finishes a tap-tap move
    if (this.selected && s !== this.selected && !(this.pos[s] && this.io.canPick?.(s) === true)) {
      const from = this.selected; this.selected = null; this.render();
      this.io.onMove?.(from, s);
      return;
    }
    if (this.pos[s] && this.io.canPick) {
      const ok = this.io.canPick(s);
      if (ok !== true) { this.io.onTap?.(s); return; }
      e.preventDefault();
      // select on press; a tap on the piece that was ALREADY selected lets go of it (see upHandler)
      const wasSelected = this.selected === s;
      this.selected = s;
      this.render();
      const pc = this.cell(s)!.querySelector<HTMLElement>(".pc")!;
      const ghost = document.createElement("div");
      ghost.className = "drag-ghost";
      ghost.innerHTML = pc.outerHTML;
      const r = this.cell(s)!.getBoundingClientRect();
      ghost.style.width = ghost.style.height = `${r.width}px`;
      document.body.appendChild(ghost);
      this.drag = { from: s, ghost, startX: e.clientX, startY: e.clientY, moved: false, wasSelected };
      this.place(ghost, e.clientX, e.clientY, r.width);
      ghost.hidden = true; // only shows once the finger actually moves
      return;
    }
    this.io.onTap?.(s);
  }

  /** Keyboard play (DECISIONS #76): arrows move the focus (in screen directions, so a flipped board still feels
   *  natural), Enter/Space act exactly like a tap on that square, Escape lets go of a picked-up piece. */
  private key(e: KeyboardEvent) {
    const order = this.order(), i = order.indexOf(this.cursor);
    const step: Record<string, [number, number]> = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
    if (step[e.key]) {
      e.preventDefault();
      const r = Math.min(7, Math.max(0, Math.floor(i / 8) + step[e.key][0])), c = Math.min(7, Math.max(0, (i % 8) + step[e.key][1]));
      this.cursor = order[r * 8 + c]; this.render(); this.cell(this.cursor)?.focus();
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault(); this.activate(this.cursor);
    } else if (e.key === "Escape" && this.selected) {
      this.selected = null; this.render(); this.cell(this.cursor)?.focus();
    }
  }

  /** A tap that came from the keyboard: the same rules as down(), without the drag. */
  private activate(s: Square) {
    const say = (msg: string) => { this.el.querySelector(".sronly")!.textContent = msg; };
    if (this.selected && s !== this.selected && !(this.pos[s] && this.io.canPick?.(s) === true)) {
      const from = this.selected; this.selected = null; this.render();
      this.io.onMove?.(from, s);
      this.cell(this.cursor)?.focus();
      return;
    }
    if (this.pos[s] && this.io.canPick) {
      const ok = this.io.canPick(s);
      if (ok !== true) { say(ok); this.io.onTap?.(s); return; }
      this.selected = this.selected === s ? null : s;
      this.render(); this.cell(s)?.focus();
      if (this.selected) {
        const to = this.io.targets?.(s) ?? [];
        say(`${pieceName(this.pos[s]!)} ${t("srPicked")}. ${to.length ? `${t("srMoves")}: ${to.join(", ")}` : ""}`);
      }
      return;
    }
    this.io.onTap?.(s);
    this.cell(this.cursor)?.focus();
  }

  private place(g: HTMLElement, x: number, y: number, w: number) {
    g.style.transform = `translate(${x - w / 2}px, ${y - w / 2}px)`;
  }

  private moveHandler = (e: PointerEvent) => {
    const d = this.drag; if (!d) return;
    if (!d.moved && Math.hypot(e.clientX - d.startX, e.clientY - d.startY) < 6) return;
    if (!d.moved) { d.moved = true; d.ghost.hidden = false; this.cell(d.from)?.classList.add("lifted"); }
    this.place(d.ghost, e.clientX, e.clientY, d.ghost.offsetWidth);
  };

  /** Let go of a drag without moving: the piece goes back and stays selected for a tap-tap move. */
  private dropDrag() {
    const d = this.drag; if (!d) return;
    this.drag = null; d.ghost.remove();
    this.cell(d.from)?.classList.remove("lifted");
  }
  private cancelHandler = () => this.dropDrag();

  private upHandler = (e: PointerEvent) => {
    if (e.button === 2 && this.rightFrom) return this.rightUp(this.squareAt(e.clientX, e.clientY));
    const d = this.drag; if (!d) return;
    this.drag = null; d.ghost.remove();
    this.cell(d.from)?.classList.remove("lifted");
    if (!d.moved) { if (d.wasSelected) { this.selected = null; this.render(); } return; } // a tap: stays selected for tap-tap
    const to = this.squareAt(e.clientX, e.clientY);
    this.selected = null; this.render();
    if (to && to !== d.from) this.io.onMove?.(d.from, to);
  };
}

/** "white knight" / "ਚਿੱਟਾ ਘੋੜਾ" for a screen reader; the queen takes the feminine colour word in Punjabi. */
export function pieceName(p: string): string {
  const fem = p[1] === "Q";
  return `${t(p[0] === "w" ? (fem ? "clrWf" : "clrW") : (fem ? "clrBf" : "clrB"))} ${t(`pc${p[1]}` as "pcK")}`;
}
