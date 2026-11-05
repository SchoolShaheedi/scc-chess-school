// A pure pattern classifier over FINAL mate positions (DECISIONS #137). The bank's own themes name 19 patterns; the
// patterns below are the ones it does not tag (and a few it does, so the classifier can be tested against the tags).
// Every rule is the pattern's textbook definition (Wikipedia "Checkmate pattern", Lichess theme descriptions), written
// as a test on the facts of the position (facts.ts) - nothing is guessed from a picture. A rule that is not exact is not
// here: it is better to find fewer positions than to teach a wrong one.
import { fileOf, mateFacts, rankOf, sqOf, type MateFacts, type Piece } from "./facts";

export type PatternId =
  | "backrank" | "smothered" | "arabian" | "anastasia" | "boden" | "doublebishop" | "opera"
  | "anderssen" | "pawn" | "legal" | "lolli" | "damiano" | "maxlange" | "damianobishop" | "greco" | "reti" | "blackburne" | "ladder";

const flightAt = (f: MateFacts, sq: string) => f.flights.find(x => x.sq === sq);
/** The mated side's back rank (rank index 0 for White, 7 for Black); "forward" is towards the middle of the board. */
const home = (f: MateFacts) => (f.mated === "w" ? 0 : 7);
const fwd = (f: MateFacts) => (f.mated === "w" ? 1 : -1);
const onlyChecker = (f: MateFacts) => (f.checkers.length === 1 ? f.checkers[0] : null);
/** The mating side's pieces (not king or pawns) that attack the king or an empty square next to it. */
function partners(f: MateFacts): Piece[] {
  const sqs = new Set<string>([...f.flights.filter(x => !x.own).flatMap(x => x.guards.map(g => g.sq)), ...f.checkers.map(c => c.sq)]);
  return f.pieces.filter(p => p.color === f.by && p.type !== "k" && p.type !== "p" && sqs.has(p.sq));
}
const dist = (a: string, b: string) => Math.max(Math.abs(fileOf(a) - fileOf(b)), Math.abs(rankOf(a) - rankOf(b)));
const sameLine = (a: string, b: string) => fileOf(a) === fileOf(b) || rankOf(a) === rankOf(b);

type Rule = (f: MateFacts) => boolean;
const RULES: Record<PatternId, Rule> = {
  // a rook or queen mates along the back rank, and the king's own pieces shut the rank in front of it
  backrank: f => {
    const c = onlyChecker(f);
    if (!c || (c.type !== "r" && c.type !== "q") || rankOf(f.king) !== home(f) || rankOf(c.sq) !== home(f)) return false;
    const ahead = f.flights.filter(x => rankOf(x.sq) === home(f) + fwd(f));
    return ahead.length > 0 && ahead.every(x => x.own);
  },
  // a knight mates a king whose every neighbour is its own piece
  smothered: f => {
    const c = onlyChecker(f);
    return !!c && c.type === "n" && f.flights.every(x => x.own);
  },
  // rook beside the corner king, knight two squares away diagonally guarding the rook
  arabian: f => {
    const c = onlyChecker(f);
    if (!c || c.type !== "r" || f.edges !== 5 || dist(c.sq, f.king) !== 1 || !sameLine(c.sq, f.king)) return false;
    const kf = fileOf(f.king), kr = rankOf(f.king), df = kf === 0 ? 2 : -2, dr = kr === 0 ? 2 : -2;
    return f.pieces.some(p => p.color === f.by && p.type === "n" && p.sq === sqOf(kf + df, kr + dr));
  },
  // king on the a- or h-file, a rook or queen checks along the file, a knight three files away covers the file next to the king, and the king's own piece stands beside it
  anastasia: f => {
    const c = onlyChecker(f);
    if (!c || (c.type !== "r" && c.type !== "q") || (fileOf(f.king) !== 0 && fileOf(f.king) !== 7) || fileOf(c.sq) !== fileOf(f.king)) return false;
    const inward = fileOf(f.king) === 0 ? 1 : -1, kr = rankOf(f.king);
    const beside = flightAt(f, sqOf(fileOf(f.king) + inward, kr));
    if (!beside?.own) return false;
    return f.pieces.some(p => p.color === f.by && p.type === "n" && p.sq === sqOf(fileOf(f.king) + 3 * inward, kr));
  },
  // two bishops on criss-crossing diagonals; the rest of the king's squares are shut by its own pieces
  boden: f => twoBishops(f) === "cross",
  // two bishops on parallel (neighbouring) diagonals
  doublebishop: f => twoBishops(f) === "parallel",
  // uncastled king on its back rank, a rook beside it checks, a bishop guards the rook
  opera: f => {
    const c = onlyChecker(f);
    if (!c || c.type !== "r" || rankOf(f.king) !== home(f) || fileOf(f.king) !== 4 || rankOf(c.sq) !== home(f) || dist(c.sq, f.king) !== 1) return false;
    const fl = flightAt(f, c.sq);
    return !!fl && fl.guards.some(g => g.type === "b");
  },
  // a rook or queen mates along the back rank beside the king, guarded by a pawn (a bishop instead makes it Mayet's or the Opera mate)
  anderssen: f => {
    const c = onlyChecker(f);
    if (!c || (c.type !== "r" && c.type !== "q") || rankOf(f.king) !== home(f) || rankOf(c.sq) !== home(f) || dist(c.sq, f.king) !== 1) return false;
    const fl = flightAt(f, c.sq);
    return !!fl && fl.guards.some(g => g.type === "p");
  },
  // a pawn gives the mate, with the mated side's pawns beside the king (David and Goliath)
  pawn: f => {
    const c = onlyChecker(f);
    return !!c && c.type === "p" && f.flights.some(x => x.own?.type === "p");
  },
  // king on e7 (e2), mated by two knights and a bishop (or a knight and two bishops) working together
  legal: f => {
    if (fileOf(f.king) !== 4 || rankOf(f.king) !== (f.mated === "b" ? 6 : 1)) return false;
    const ps = partners(f);
    const n = ps.filter(p => p.type === "n").length, b = ps.filter(p => p.type === "b").length;
    return ps.length === 3 && ((n === 2 && b === 1) || (n === 1 && b === 2)) && ps.some(p => p.sq === f.checkers[0]?.sq);
  },
  // queen on g7 (b7) shut in front of the king by a pawn on f6 (c6): the fianchetto is broken
  lolli: f => {
    const c = onlyChecker(f);
    if (!c || c.type !== "q" || rankOf(f.king) !== home(f) || ![1, 6].includes(fileOf(f.king)) || c.sq !== sqOf(fileOf(f.king), home(f) + fwd(f))) return false;
    const side = fileOf(f.king) === 6 ? -1 : 1;
    return f.pieces.some(p => p.color === f.by && p.type === "p" && p.sq === sqOf(fileOf(f.king) + side, home(f) + 2 * fwd(f)));
  },
  // queen on h7 (a7) beside the king on g8 (b8), guarded by a pawn on g6 (b6)
  damiano: f => {
    const c = onlyChecker(f);
    if (!c || c.type !== "q" || rankOf(f.king) !== home(f) || ![1, 6].includes(fileOf(f.king))) return false;
    const edgeFile = fileOf(f.king) === 6 ? 7 : 0;
    if (c.sq !== sqOf(edgeFile, home(f) + fwd(f))) return false;
    return f.pieces.some(p => p.color === f.by && p.type === "p" && p.sq === sqOf(fileOf(f.king), home(f) + 2 * fwd(f)));
  },
  // the queen mates beside the king, guarded by a bishop that also covers one of the king's other squares
  maxlange: f => queenWithBishop(f) === "covers",
  // the queen mates beside the king, guarded by a bishop that does nothing else
  damianobishop: f => queenWithBishop(f) === "only",
  // king in the corner, a rook or queen checks along the edge, a bishop shuts the next edge square, the king's own piece the diagonal
  greco: f => {
    const c = onlyChecker(f);
    if (!c || (c.type !== "r" && c.type !== "q") || f.edges !== 5 || !sameLine(c.sq, f.king)) return false;
    const kf = fileOf(f.king), kr = rankOf(f.king), inF = kf === 0 ? 1 : -1, inR = kr === 0 ? 1 : -1;
    const diag = flightAt(f, sqOf(kf + inF, kr + inR));
    if (!diag?.own) return false;
    const along = fileOf(c.sq) === kf ? sqOf(kf + inF, kr) : sqOf(kf, kr + inR);   // the edge square the checker does not run along
    const fl = flightAt(f, along);
    return !!fl && !fl.own && fl.guards.length > 0 && fl.guards.every(g => g.type === "b");
  },
  // a bishop mates next to the king, guarded by a rook or queen, with four of the king's own pieces on its squares
  reti: f => {
    const c = onlyChecker(f);
    if (!c || c.type !== "b" || dist(c.sq, f.king) !== 1) return false;
    const fl = flightAt(f, c.sq);
    return !!fl && fl.guards.some(g => g.type === "r" || g.type === "q") && f.flights.filter(x => x.own).length >= 4;
  },
  // bishop pair and a knight against a king on the edge, one of its own pieces beside it (Blackburne's)
  blackburne: f => {
    const c = onlyChecker(f);
    if (!c || c.type !== "b" || f.edges < 3 || !f.flights.some(x => x.own)) return false;
    const ps = partners(f);
    return ps.length === 3 && ps.filter(p => p.type === "b").length === 2 && ps.filter(p => p.type === "n").length === 1;
  },
  // two rooks (or rook and queen) on neighbouring edge lines push the king to the edge; nothing of the mated side is near
  ladder: f => {
    const c = onlyChecker(f);
    if (!c || (c.type !== "r" && c.type !== "q") || f.edges < 3 || f.flights.some(x => x.own)) return false;
    const ps = partners(f);
    if (ps.length !== 2 || !ps.every(p => p.type === "r" || p.type === "q")) return false;
    const mates = f.pieces.filter(p => p.color === f.mated && p.type !== "k");
    const kf = fileOf(f.king), kr = rankOf(f.king);
    const edgeLine = (p: Piece) => (kf === 0 || kf === 7) && fileOf(p.sq) === kf ? "file" : (kr === 0 || kr === 7) && rankOf(p.sq) === kr ? "rank" : "";
    const other2 = ps.find(p => p.sq !== c.sq)!;
    const inward = (line: "file" | "rank") => line === "file" ? Math.abs(fileOf(other2.sq) - kf) === 1 : Math.abs(rankOf(other2.sq) - kr) === 1;
    const line = edgeLine(c) as "file" | "rank" | "";
    return mates.length === 0 && !!line && inward(line);
  },
};

/** Is the mating side's attack two bishops (the checker one of them)? Boden: criss-crossing diagonals; double bishop: parallel ones. */
function twoBishops(f: MateFacts): "cross" | "parallel" | null {
  const c = onlyChecker(f);
  if (!c || c.type !== "b") return null;
  const ps = partners(f);
  if (ps.length !== 2 || ps.some(p => p.type !== "b")) return null;
  const other2 = ps.find(p => p.sq !== c.sq);
  if (!other2) return null;
  // every square of the king that is not shut by its own piece must be shut by a bishop (always so in a mate with only bishops)
  if (!f.flights.some(x => x.own)) return null;
  const slope = (a: string, b: string) => Math.sign((fileOf(a) - fileOf(b)) * (rankOf(a) - rankOf(b)));
  const cs = slope(c.sq, f.king);
  // the other bishop's line to each square it shuts (that the checker's line does not)
  const shut = f.flights.filter(x => !x.own && x.guards.some(g => g.sq === other2.sq) && !x.guards.some(g => g.sq === c.sq));
  const sl = new Set(shut.map(x => slope(other2.sq, x.sq)).filter(s => s !== 0));
  if (!sl.size) return null;
  if (sl.size > 1) return null;
  return [...sl][0] === cs ? "parallel" : "cross";
}

/** Queen mates beside the king and is guarded by bishops only: "covers" if a guarding bishop also shuts another square, else "only". */
function queenWithBishop(f: MateFacts): "covers" | "only" | null {
  const c = onlyChecker(f);
  if (!c || c.type !== "q" || dist(c.sq, f.king) !== 1) return null;
  const fl = flightAt(f, c.sq);
  if (!fl || !fl.guards.length || fl.guards.some(g => g.type !== "b")) return null;
  const bishops = fl.guards.map(g => g.sq);
  const others = f.flights.filter(x => x.sq !== c.sq && !x.own && x.guards.some(g => bishops.includes(g.sq)));
  // the squares the bishop shuts must not also be shut by the queen alone being enough: count only squares the queen does not cover
  const bishopOnly = others.filter(x => !x.guards.some(g => g.sq === c.sq));
  return bishopOnly.length ? "covers" : "only";
}

/** Every pattern in this file that the checkmate position `fen` matches exactly; [] for a position that is not checkmate. */
export function classify(fen: string): PatternId[] {
  const f = mateFacts(fen);
  if (!f) return [];
  return (Object.keys(RULES) as PatternId[]).filter(id => RULES[id](f));
}
