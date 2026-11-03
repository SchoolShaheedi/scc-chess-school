// Online ratings v2: Glicko-2 against the published worked example (Glickman, "Example of the Glicko-2 system", 2013),
// the rating change after a game, the provisional "?", the graph, and that the SQL (supabase/online_ratings.sql) keeps
// its promises. The SQL maths itself is run against the same example in tools/sql-check (a real Postgres).
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { bounded, decayRd, deltaText, glicko2, isProvisional, rateGame, ratingText } from "../src/online/glicko";
import { ratingGraph } from "../src/online/graph";

const read = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");

describe("Glicko-2 against the published worked example", () => {
  // a 1500 player (RD 200, volatility 0.06) beats a 1400 (RD 30), loses to a 1550 (RD 100) and to a 1700 (RD 300); tau = 0.5
  const out = glicko2({ r: 1500, rd: 200, vol: 0.06 }, [{ r: 1400, rd: 30, score: 1 }, { r: 1550, rd: 100, score: 0 }, { r: 1700, rd: 300, score: 0 }], 0.5);
  it("gives the published new rating, deviation and volatility", () => {
    expect(out.r).toBeCloseTo(1464.06, 1);        // 1464.06
    expect(out.rd).toBeCloseTo(151.52, 1);        // 151.52
    expect(out.vol).toBeCloseTo(0.05999, 4);      // 0.05999
  });
  it("a period with no games only grows the deviation", () => {
    const idle = glicko2({ r: 1500, rd: 200, vol: 0.06 }, [], 0.5);
    expect(idle.r).toBe(1500); expect(idle.vol).toBe(0.06);
    expect(idle.rd).toBeCloseTo(200.27, 1);
  });
});

describe("a game between two players", () => {
  const fresh = { r: 1200, rd: 350, vol: 0.06 };
  it("moves the winner up and the loser down by about the same amount, a lot for new players", () => {
    const g = rateGame(fresh, fresh, 1);
    expect(g.whiteDelta).toBeGreaterThan(100); expect(g.blackDelta).toBeLessThan(-100);
    expect(Math.abs(g.whiteDelta + g.blackDelta)).toBeLessThanOrEqual(1);
    expect(g.white.rd).toBeLessThan(350);
  });
  it("a draw between equals changes nothing", () => { expect(rateGame(fresh, fresh, 0.5).whiteDelta).toBe(0); });
  it("an established player moves little: +8 / -7 style changes", () => {
    const a = { r: 1500, rd: 60, vol: 0.06 }, b = { r: 1500, rd: 60, vol: 0.06 };
    const g = rateGame(a, b, 1);
    expect(g.whiteDelta).toBeGreaterThan(3); expect(g.whiteDelta).toBeLessThan(20);
    expect(g.blackDelta).toBe(-g.whiteDelta);
  });
  it("beating a much stronger player pays more than beating an equal", () => {
    const me = { r: 1400, rd: 80, vol: 0.06 };
    expect(rateGame(me, { r: 1800, rd: 80, vol: 0.06 }, 1).whiteDelta).toBeGreaterThan(rateGame(me, { r: 1400, rd: 80, vol: 0.06 }, 1).whiteDelta);
  });
  it("a rating never goes under 100 and the deviation never under 45", () => {
    expect(bounded({ r: 20, rd: 10, vol: 0.06 })).toEqual({ r: 100, rd: 45, vol: 0.06 });
    expect(bounded({ r: 9000, rd: 999, vol: 5 })).toEqual({ r: 4000, rd: 350, vol: 0.1 });
  });
  it("time away grows the deviation, capped at 350", () => {
    expect(decayRd(60, 0.06, 0)).toBeCloseTo(60, 6);
    expect(decayRd(60, 0.06, 100)).toBeGreaterThan(60);
    expect(decayRd(340, 0.06, 5000)).toBe(350);
  });
});

describe("how a rating is shown", () => {
  it("a provisional rating carries a ?, once the deviation is 110 or under it does not", () => {
    expect(isProvisional(350)).toBe(true); expect(isProvisional(110.1)).toBe(true); expect(isProvisional(110)).toBe(false);
    expect(ratingText(1432.4, true)).toBe("1432?"); expect(ratingText(1432.6, false)).toBe("1433");
  });
  it("the change reads +8 / −7", () => { expect(deltaText(8)).toBe("+8"); expect(deltaText(-7)).toBe("−7"); expect(deltaText(0)).toBe("±0"); });
});

describe("the rating graph", () => {
  it("is empty for no games, a centred point for one, and runs left to right with the highest rating highest", () => {
    expect(ratingGraph([]).points).toEqual([]);
    expect(ratingGraph([1200]).points[0].x).toBe(150);
    const g = ratingGraph([1200, 1250, 1230, 1300]);
    expect(g.points.map(p => p.x)).toEqual([...g.points.map(p => p.x)].sort((a, b) => a - b));
    const top = g.points.reduce((a, b) => (b.y < a.y ? b : a));
    expect(top.rating).toBe(1300);
    expect(g.path.startsWith("M")).toBe(true); expect(g.min).toBeLessThan(1200); expect(g.max).toBeGreaterThan(1300);
  });
  it("a flat line sits inside the chart", () => {
    const g = ratingGraph([1200, 1200, 1200]);
    for (const p of g.points) { expect(p.y).toBeGreaterThan(0); expect(p.y).toBeLessThan(120); }
  });
});

describe("the SQL keeps its promises (supabase/online_ratings.sql)", () => {
  const sql = read("../supabase/online_ratings.sql");
  it("allows bullet in games_category_check", () => {
    expect(sql).toMatch(/drop constraint if exists games_category_check/);
    expect(sql).toMatch(/add constraint games_category_check check \(category in \('bullet', 'blitz', 'rapid'\)\)/);
  });
  it("the three speeds follow the clock: under 3 minutes bullet, under 10 blitz, else rapid", () => {
    expect(sql).toMatch(/when mins < 3 then 'bullet' when mins < 10 then 'blitz' else 'rapid'/);
    for (const tc of ["1+0", "2+1", "3+0", "3+2", "5+0", "10+0", "15+10", "30+0"]) expect(sql).toContain(`'${tc}'`);
  });
  it("one trigger rates a finished game, once, and only a game of two moves or more", () => {
    expect(sql).toMatch(/create trigger rate_game after update of status on public\.games/);
    expect(sql).toMatch(/old\.status = 'finished'/); expect(sql).toMatch(/array_length\(new\.moves, 1\), 0\) < 2/);
  });
  it("the guard refuses a game that would mix the pools", () => {
    const guard = sql.match(/create or replace function public\.games_guard[\s\S]*?end \$\$;/)![0];
    expect(guard).toMatch(/w\.adult <> b\.adult/);
    expect(guard).toMatch(/new\.kind = 'stranger' and \(not w\.adult/);
    expect(guard).toMatch(/w\.adult and new\.kind <> 'stranger'/);
    expect(guard).toMatch(/not w\.adult and new\.kind <> 'friend'/);
    expect(sql).toMatch(/create trigger games_guard before insert on public\.games/);
  });
  it("the rating tables are readable only through checked functions; nobody writes them from the app", () => {
    expect(sql).toMatch(/alter table public\.rating_history enable row level security/);
    expect(sql).toMatch(/revoke all on table public\.rating_history from anon, authenticated/);
    expect(sql).toMatch(/revoke insert, update, delete on table public\.player_ratings from authenticated/);
    expect(sql).not.toMatch(/create policy[^;]*on public\.rating_history/);
    expect(sql).not.toMatch(/create policy[^;]*on public\.player_ratings for (insert|update|delete|all)/);
  });
  it("internal helpers are not granted to anyone", () => {
    const grants = sql.match(/grant execute on function[\s\S]*?to authenticated;/g)!.join("\n");
    for (const f of ["rate_game", "games_guard", "glicko2_update", "rating_of", "tc_valid"]) expect(grants).not.toContain(f);
    for (const f of ["rating_summary", "rating_history_for", "game_players", "adult_ladder"]) expect(grants).toContain(f);
  });
  it("the ladder is grown-ups only and has all three speeds", () => {
    const lad = sql.match(/create or replace function public\.adult_ladder[\s\S]*?end \$\$;/)![0];
    expect(lad).toMatch(/adult and not paused/); expect(lad).toMatch(/p_category not in \('bullet', 'blitz', 'rapid'\)/);
  });
  it("deleting an account finishes its unfinished games first", () => {
    const del = sql.match(/create or replace function public\.delete_my_account[\s\S]*?end \$\$;/)![0];
    expect(del.indexOf("update public.games")).toBeGreaterThan(-1);
    expect(del.indexOf("update public.games")).toBeLessThan(del.indexOf("delete from auth.users"));
  });
  it("there is no chat: no free-text column is added", () => { expect(sql).not.toMatch(/\btext\b[^\n]*(message|note|chat|comment)/i); });
});
