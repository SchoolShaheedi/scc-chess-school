// A game with side-lines (variations) for the analysis board. Pure and DOM-free: tested in test/variations.test.ts.
// A Node is one move; its children are the moves that can follow it, children[0] being the game's own next move and
// the rest being side-lines. A path is the list of child indices from the root, so [] is the start position and
// [0,0] is the game's second move. Playing a move that differs from the game adds a side-line instead of replacing.
import { Chess } from "chess.js";

export interface Node { uci: string; children: Node[] }
export type Path = number[];

export const newRoot = (): Node => ({ uci: "", children: [] });
const mv = (g: Chess, u: string) => g.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });

/** A plain move list becomes a tree with no side-lines. */
export function fromLine(uci: string[]): Node {
  const root = newRoot(); let cur = root;
  for (const u of uci) { const n: Node = { uci: u, children: [] }; cur.children.push(n); cur = n; }
  return root;
}

export function nodeAt(root: Node, path: Path): Node | null {
  let cur = root;
  for (const i of path) { const n = cur.children[i]; if (!n) return null; cur = n; }
  return cur;
}

/** The moves from the start to this path, in order. */
export function ucisOf(root: Node, path: Path): string[] {
  const out: string[] = []; let cur = root;
  for (const i of path) { cur = cur.children[i]; out.push(cur.uci); }
  return out;
}

/** The game's own moves, ignoring every side-line. */
export function mainLine(root: Node): string[] {
  const out: string[] = []; let c = root;
  while (c.children.length) { c = c.children[0]; out.push(c.uci); }
  return out;
}

/** Play `uci` after the node at `path`. The same move as an existing reply just steps onto it; a different move becomes
 *  a new side-line (or the game's next move, if there was none). Returns the new path. */
export function addMove(root: Node, path: Path, uci: string): Path {
  const at = nodeAt(root, path); if (!at) throw new Error("no such position");
  const i = at.children.findIndex(c => c.uci === uci);
  if (i >= 0) return [...path, i];
  at.children.push({ uci, children: [] });
  return [...path, at.children.length - 1];
}

/** Does the game have any side-line at all? */
export const hasVariations = (n: Node): boolean => n.children.length > 1 || n.children.some(hasVariations);

/** Does the path sit inside a side-line (any step other than the game's own next move)? */
export const inSideline = (path: Path): boolean => path.some(i => i > 0);

/** Delete the side-line that contains `path`: the whole branch from where it leaves the game. Returns the path to land on
 *  (the position the branch left from), or null when the path is on the game itself and there is nothing to delete. */
export function deleteSideline(root: Node, path: Path): Path | null {
  const k = path.findIndex(i => i > 0);
  if (k < 0) return null;
  nodeAt(root, path.slice(0, k))!.children.splice(path[k], 1);
  return path.slice(0, k);
}

/** Arrow buttons: forward follows the line's own next move (the first reply), back leaves one move. */
export const stepForward = (root: Node, path: Path): Path => nodeAt(root, path)?.children.length ? [...path, 0] : path;
export const stepBack = (path: Path): Path => path.slice(0, -1);
/** The path to the end of whatever line the path is on. */
export function toEnd(root: Node, path: Path): Path {
  let p = path;
  while (nodeAt(root, p)!.children.length) p = [...p, 0];
  return p;
}

export interface Token { kind: "mv" | "open" | "close"; path?: Path; san?: string; label?: string }

/** The move list as tokens: moves with number labels ("12." where White moves, "12..." for Black at the start of a line
 *  or after a bracket), and side-lines between "open" and "close" (shown as brackets). */
export function tokens(root: Node, startFen: string): Token[] {
  const out: Token[] = [];
  const run = (parent: Node, fen: string, path: Path, forceNum: boolean) => {
    let cur = parent, f = fen, p = path, force = forceNum;
    while (cur.children.length) {
      const g = new Chess(f), n = g.moveNumber(), white = g.turn() === "w";
      const label = (shown: boolean) => white ? `${n}.` : shown ? `${n}...` : "";
      const first = cur.children[0];
      out.push({ kind: "mv", path: [...p, 0], san: mv(new Chess(f), first.uci).san, label: label(force) });
      for (let j = 1; j < cur.children.length; j++) {
        const v = cur.children[j], after = new Chess(f);
        out.push({ kind: "open" });
        out.push({ kind: "mv", path: [...p, j], san: mv(after, v.uci).san, label: label(true) });
        run(v, after.fen(), [...p, j], false);
        out.push({ kind: "close" });
      }
      mv(g, first.uci);
      force = cur.children.length > 1;   // a bracket just closed: the next Black move needs its "N..."
      f = g.fen(); p = [...p, 0]; cur = first;
    }
  };
  run(root, startFen, [], true);   // a game that starts with Black to move reads "1... e5"
  return out;
}

/** PGN with variations in parentheses. Headers as pgnOf writes them. */
export function pgnWithVariations(root: Node, white: string, black: string, result: string, startFen?: string): string {
  const head = [["Event", "SCC Chess School"], ["Date", new Date().toISOString().slice(0, 10).replace(/-/g, ".")],
    ["White", white], ["Black", black], ["Result", result]];
  if (startFen) head.push(["SetUp", "1"], ["FEN", startFen]);
  const text = tokens(root, startFen ?? new Chess().fen()).map(tk =>
    tk.kind === "open" ? "(" : tk.kind === "close" ? ")" : `${tk.label ? tk.label + " " : ""}${tk.san}`);
  const body = text.join(" ").replace(/\( /g, "(").replace(/ \)/g, ")");
  return `${head.map(([k, v]) => `[${k} "${v}"]`).join("\n")}\n\n${body ? body + " " : ""}${result}`;
}
