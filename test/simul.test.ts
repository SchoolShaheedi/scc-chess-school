// The teacher-run class simul (class features 2026-11-03, not yet in DECISIONS.md): the board state, which board to go to next, the summary, merging live
// updates, and that the SQL keeps its safeguarding promises (supabase/simul.sql).
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { boardState, mergeGames, nextBoard, summarise, type SimulGame } from "../src/simul/rules";

const read = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");
const g = (id: string, moves: string[] = [], status: "active" | "finished" = "active", result: string | null = null): SimulGame => ({ id, moves, status, result });
const MV = (n: number) => Array.from({ length: n }, (_, i) => `m${i}`);

describe("a board's state (the teacher is White)", () => {
  it("White (the teacher) moves first, then they alternate", () => {
    expect(boardState(g("a", MV(0))).toMove).toBe("teacher");
    expect(boardState(g("a", MV(1))).toMove).toBe("pupil");
    expect(boardState(g("a", MV(2))).toMove).toBe("teacher");
    expect(boardState(g("a", MV(7))).toMove).toBe("pupil");
    expect(boardState(g("a", MV(7))).ply).toBe(7);
  });
  it("a finished board has nobody to move, and says who won from the teacher's side", () => {
    expect(boardState(g("a", MV(30), "finished", "1-0"))).toEqual({ id: "a", toMove: null, ply: 30, outcome: "teacher" });
    expect(boardState(g("a", MV(31), "finished", "0-1")).outcome).toBe("pupil");
    expect(boardState(g("a", MV(10), "finished", "1/2-1/2")).outcome).toBe("draw");
    expect(boardState(g("a", MV(2), "finished", null)).outcome).toBe("draw");   // ended by the teacher (abandoned = drawn)
  });
});

describe("the next board for the teacher", () => {
  const states = (spec: [string, number, ("active" | "finished")?][]) => spec.map(([id, n, st]) => boardState(g(id, MV(n), st ?? "active", st === "finished" ? "1-0" : null)));
  it("goes to the first board waiting for the teacher after the current one, wrapping round", () => {
    const s = states([["a", 0], ["b", 1], ["c", 2], ["d", 3], ["e", 4]]);   // waiting for the teacher: a, c, e
    expect(nextBoard(s, null)).toBe("a");
    expect(nextBoard(s, "a")).toBe("c");
    expect(nextBoard(s, "c")).toBe("e");
    expect(nextBoard(s, "e")).toBe("a");
    expect(nextBoard(s, "b")).toBe("c");
  });
  it("skips finished boards and boards where the pupil is thinking", () => {
    const s = states([["a", 0], ["b", 2, "finished"], ["c", 1], ["d", 2]]);
    expect(nextBoard(s, "a")).toBe("d");
  });
  it("is null when nothing is waiting, or when the only waiting board is the current one", () => {
    expect(nextBoard(states([["a", 1], ["b", 3]]), null)).toBeNull();
    expect(nextBoard(states([["a", 0], ["b", 1]]), "a")).toBeNull();
    expect(nextBoard([], null)).toBeNull();
  });
  it("a current board that has gone from the list starts from the top", () => {
    expect(nextBoard(states([["a", 1], ["b", 2]]), "gone")).toBe("b");
  });
});

describe("the summary", () => {
  it("counts boards waiting for the teacher and the results so far", () => {
    const s = [g("a", MV(0)), g("b", MV(1)), g("c", MV(4)), g("d", MV(20), "finished", "1-0"), g("e", MV(21), "finished", "0-1"), g("f", MV(9), "finished", "1/2-1/2"), g("h", MV(30), "finished", "1-0")].map(boardState);
    expect(summarise(s)).toEqual({ boards: 7, playing: 3, waitingForTeacher: 2, teacherWon: 2, pupilWon: 1, drawn: 1 });
    expect(summarise([])).toEqual({ boards: 0, playing: 0, waitingForTeacher: 0, teacherWon: 0, pupilWon: 0, drawn: 0 });
  });
});

describe("live updates", () => {
  it("replaces a changed board in place, keeps the order, and appends a new board", () => {
    const old = [g("a", MV(0)), g("b", MV(1)), g("c", MV(2))];
    const out = mergeGames(old, [g("b", MV(2)), g("z", MV(0))]);
    expect(out.map(x => x.id)).toEqual(["a", "b", "c", "z"]);
    expect(out[1].moves).toHaveLength(2);
    expect(old[1].moves).toHaveLength(1);     // the old list is untouched
  });
});

describe("the SQL keeps its promises (supabase/simul.sql)", () => {
  const sql = read("../supabase/simul.sql");
  it("only an approved teacher, for their own class, can start one", () => {
    expect(sql).toMatch(/simul_start[\s\S]*?not public\.is_teacher\(\)/);
    expect(sql).toMatch(/simul_start[\s\S]*?classes where id = p_class and teacher = auth\.uid\(\)/);
    expect(sql).toMatch(/simul_seat[\s\S]*?teacher = auth\.uid\(\) and status = 'active'/);
  });
  it("only grown-up players (declared 18 or older) get a board: children never do (2026-11-03, 16+ only)", () => {
    const seat = sql.match(/create or replace function public\.simul_seat[\s\S]*?end \$\$;/)![0];
    expect(seat).toMatch(/and o\.adult and/); expect(seat).not.toMatch(/not o\.adult/); expect(seat).toMatch(/not o\.paused/);
    expect(seat).toMatch(/m\.class_id = s\.class_id/);
  });
  it("there is no parent switch any more: no child can be put in a simul by anyone", () => {
    expect(sql).not.toMatch(/simul_ok/);
  });
  it("the teacher's own player is kept paused, so it can never be found, befriended or challenged", () => {
    expect(sql).toMatch(/insert into public\.online_players \(parent, profile_id, avatar, colour, friend_code, paused\)[\s\S]*?true\) returning id into tp/);
  });
  it("simuls can be read only by their teacher and are written by nobody directly", () => {
    expect(sql).toMatch(/create policy "teachers read own simuls" on public\.simuls for select to authenticated using \(teacher = \(select auth\.uid\(\)\)\)/);
    expect(sql).not.toMatch(/create policy[^;]*on public\.simuls for (insert|update|delete|all)/);
    expect(sql).toMatch(/alter table public\.simuls enable row level security/);
  });
  it("a member leaving the class has their board drawn at once", () => {
    expect(sql).toMatch(/create trigger simul_on_leave after delete on public\.memberships/);
  });
  it("the internal trigger function is not callable by anyone", () => {
    expect(sql).toMatch(/revoke all on function[^;]*public\.simul_on_leave\(\)[^;]*from public, anon, authenticated;/);
    const grants = sql.match(/grant execute on function[\s\S]*?to authenticated;/g)!.join("\n");
    expect(grants).not.toMatch(/simul_on_leave/);
  });
  it("there is no chat: no free-text column is added", () => {
    expect(sql).not.toMatch(/\btext\b[^\n]*(message|note|chat|comment)/i);
  });
});
