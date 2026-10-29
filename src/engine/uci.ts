// A small UCI driver for Stockfish 19 lite (GPLv3, DECISIONS #24). One request at a time, queued.
// The same class runs in the browser (a Web Worker, browser.ts) and in Node for the tests (test/engine.ts),
// so what the app does with the engine and what the guard proves about positions can never differ.

export interface Transport { send(cmd: string): void; onLine(cb: (line: string) => void): void }

/** Score from the side to move's point of view: centipawns, or mate in N (negative = getting mated). */
export interface Score { cp?: number; mate?: number }
export interface Analysis { best: string; score: Score; pv: string[] }
/** One candidate move with its score (side to move's view). */
export interface Candidate { move: string; score: Score }

/** Optional limits (the browser sets them, the Node guard does not): an engine that never starts or never answers
 *  rejects instead of hanging every bot and hint, and `onDead` lets the owner throw it away and start a fresh one. */
export interface Limits { startMs: number; searchMs: number; onDead?: () => void }

export class Uci {
  private queue: Promise<unknown> = Promise.resolve();
  private listener: ((line: string) => void) | null = null;
  private failNow: ((e: Error) => void) | null = null;
  private dead = false;
  private ready: Promise<void>;

  constructor(private t: Transport, private limits?: Limits) {
    t.onLine(line => this.listener?.(line));
    this.ready = this.raw(["uci"], l => l === "uciok", undefined, limits?.startMs).then(() =>
      this.raw(["setoption name Hash value 16", "isready"], l => l === "readyok", undefined, limits?.startMs)).then(() => {});
    this.ready.catch(() => {});
  }

  /** The engine has failed (a worker error, or no answer in time): the request in flight and every later one reject. */
  fail(e: Error) {
    if (this.dead) return;
    this.dead = true; this.listener = null;
    this.failNow?.(e); this.failNow = null;
    this.limits?.onDead?.();
  }

  private raw(cmds: string[], done: (line: string) => boolean, collect?: (line: string) => void, ms?: number): Promise<string> {
    if (this.dead) return Promise.reject(new Error("engine stopped"));
    return new Promise((resolve, reject) => {
      const timer = ms ? setTimeout(() => this.fail(new Error("engine did not answer")), ms) : undefined;
      this.failNow = e => { clearTimeout(timer); reject(e); };
      this.listener = line => {
        collect?.(line);
        if (done(line)) { clearTimeout(timer); this.listener = null; this.failNow = null; resolve(line); }
      };
      cmds.forEach(c => this.t.send(c));
    });
  }

  private run<T>(job: () => Promise<T>): Promise<T> {
    const next = this.queue.then(() => this.ready).then(job);
    this.queue = next.catch(() => {});
    return next;
  }

  /** Best move and evaluation. `skill` 0-20 weakens the engine (bots); `depth` or `movetime` bounds the search. */
  analyse(fen: string, opts: { depth?: number; movetime?: number; skill?: number; multipv?: number } = {}): Promise<Analysis> {
    return this.run(async () => {
      let score: Score = {}, pv: string[] = [];
      const go = opts.movetime ? `go movetime ${opts.movetime}` : `go depth ${opts.depth ?? 12}`;
      const line = await this.raw([
        `setoption name Skill Level value ${opts.skill ?? 20}`, "setoption name MultiPV value 1",
        "ucinewgame", `position fen ${fen}`, go,
      ], l => l.startsWith("bestmove"), l => {
        if (!l.startsWith("info") || !l.includes(" pv ") || / multipv [2-9]/.test(l)) return;
        const cp = / score cp (-?\d+)/.exec(l), mate = / score mate (-?\d+)/.exec(l);
        score = mate ? { mate: +mate[1] } : cp ? { cp: +cp[1] } : score;
        pv = l.split(" pv ")[1].trim().split(" ");
      }, this.limits?.searchMs);
      return { best: line.split(" ")[1], score, pv };
    });
  }

  /** The engine's top `n` moves at `depth`, best first (MultiPV). The bots choose among these (src/bots/bots.ts). */
  candidates(fen: string, opts: { n: number; depth: number; skill?: number }): Promise<Candidate[]> {
    return this.run(async () => {
      const lines = new Map<number, Candidate>();
      await this.raw([
        `setoption name Skill Level value ${opts.skill ?? 20}`, `setoption name MultiPV value ${opts.n}`,
        "ucinewgame", `position fen ${fen}`, `go depth ${opts.depth}`,
      ], l => l.startsWith("bestmove"), l => {
        if (!l.startsWith("info") || !l.includes(" pv ")) return;
        const k = +(/ multipv (\d+)/.exec(l)?.[1] ?? 1);
        const cp = / score cp (-?\d+)/.exec(l), mate = / score mate (-?\d+)/.exec(l);
        lines.set(k, { move: l.split(" pv ")[1].trim().split(" ")[0], score: mate ? { mate: +mate[1] } : { cp: +(cp?.[1] ?? 0) } });
      }, this.limits?.searchMs);
      return [...lines.keys()].sort((a, b) => a - b).map(k => lines.get(k)!);
    });
  }
}

/** A score as a single number for comparisons: mates are pushed far beyond any material count. */
export const asNumber = (s: Score) => s.mate !== undefined ? (s.mate > 0 ? 100000 - s.mate : -100000 - s.mate) : (s.cp ?? 0);
