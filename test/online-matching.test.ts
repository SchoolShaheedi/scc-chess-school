// Online matching: the clocks, the widening rating window, who may be paired with whom (grown-ups only with strangers),
// the bot offer, rematch, the lag allowance, and that the SQL keeps its safeguarding promises (supabase/online_matching.sql).
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  BOT_OFFER_AFTER_S, categoryOf, isTimeControl, nearestBot, pairEligible, ratedPool, ratingWindow, savedTc, saveTc, tcCategory, tcNorm, tcParse, TIME_CONTROLS, windowLabel, withinWindow,
} from "../src/online/matching";
import { BOTS } from "../src/bots/bots";
import { flagGrace, LAG_CAP_MS, LAG_QUOTA_MS, lagCredit, nextQuota } from "../supabase/functions/play-move/lag";
import { UI } from "../src/i18n";

const read = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");
const adult = { adult: true, paused: false }, child = { adult: false, paused: false };
const none = { friend: false, classmate: false, blocked: false };

describe("the clocks", () => {
  it("are the eight the user asked for, grouped bullet / blitz / rapid", () => {
    expect(TIME_CONTROLS.map(x => `${x.category}:${x.key}`)).toEqual(["bullet:1+0", "bullet:2+1", "blitz:3+0", "blitz:3+2", "blitz:5+0", "rapid:10+0", "rapid:15+10", "rapid:30+0"]);
    expect(categoryOf(2)).toBe("bullet"); expect(categoryOf(3)).toBe("blitz"); expect(categoryOf(9)).toBe("blitz"); expect(categoryOf(10)).toBe("rapid");
  });
  it("the older '10' and '5' still mean 10+0 and 5+0, and 'none' has no category", () => {
    expect(tcNorm("10")).toBe("10+0"); expect(tcNorm("5")).toBe("5+0"); expect(tcParse("3+2")).toEqual({ mins: 3, inc: 2 });
    expect(tcCategory("10")).toBe("rapid"); expect(tcCategory("none")).toBeNull(); expect(isTimeControl("7+7")).toBe(false);
  });
  it("the last choice is remembered", () => {
    const mem: Record<string, string> = {};
    (globalThis as unknown as { localStorage: unknown }).localStorage = { getItem: (k: string) => mem[k] ?? null, setItem: (k: string, v: string) => { mem[k] = v; } };
    expect(savedTc()).toBe("5+0");
    saveTc("15+10"); expect(savedTc()).toBe("15+10");
    mem["scc-online-tc"] = "garbage"; expect(savedTc()).toBe("5+0");
  });
});

describe("the rating range widens with the wait", () => {
  it("is 100, then 200 after 10 s, 400 after 20 s, and anyone after 30 s", () => {
    expect([0, 9, 10, 19, 20, 29, 30, 300].map(ratingWindow)).toEqual([100, 100, 200, 200, 400, 400, Infinity, Infinity]);
    expect(windowLabel(5)).toBe("±100"); expect(windowLabel(15)).toBe("±200"); expect(windowLabel(25)).toBe("±400"); expect(windowLabel(40)).toBeNull();
  });
  it("two players pair when within the window of whichever has waited longer", () => {
    expect(withinWindow(1200, 1350, 0, 0)).toBe(false);
    expect(withinWindow(1200, 1350, 12, 0)).toBe(true);        // 150 apart, one has waited 12 s: window 200
    expect(withinWindow(1200, 1700, 25, 0)).toBe(false);       // 500 apart > 400
    expect(withinWindow(1200, 2400, 0, 31)).toBe(true);        // the other has waited past 30 s: anyone
  });
  it("the SQL window is the same table", () => {
    const sql = read("../supabase/online_matching.sql");
    const body = sql.match(/rating_window\(waited int\)[\s\S]*?select (case[^;]*end);/)![1];
    const rows = [...body.matchAll(/when waited < (\d+) then (\d+)/g)].map(m => [+m[1], +m[2]]);
    const sqlWindow = (w: number) => (rows.find(([lim]) => w < lim)?.[1] ?? +body.match(/else (\d+)/)![1]);
    for (const w of [0, 9, 10, 19, 20, 29, 30, 99]) {
      const s = sqlWindow(w), ts = ratingWindow(w);
      expect(ts === Infinity ? s >= 100000 : s).toBe(ts === Infinity ? true : ts);
    }
  });
  it("after about a minute a bot of the player's level is offered", () => {
    expect(BOT_OFFER_AFTER_S).toBe(60);
    const b = nearestBot(1000, BOTS)!; for (const o of BOTS) expect(Math.abs(b.rating - 1000)).toBeLessThanOrEqual(Math.abs(o.rating - 1000));
    expect(nearestBot(1000, [])).toBeUndefined();
  });
});

describe("who may be paired (the server's pair_ok)", () => {
  it("grown-ups are paired with other grown-ups, strangers included", () => { expect(pairEligible(adult, adult, none)).toBe(true); });
  it("a grown-up and a child NEVER meet, whatever else is true", () => {
    for (const rel of [none, { friend: true, classmate: true, blocked: false }]) {
      expect(pairEligible(adult, child, rel)).toBe(false); expect(pairEligible(child, adult, rel)).toBe(false);
    }
  });
  it("a child is paired only with a friend or classmate who is also a child, never a stranger", () => {
    expect(pairEligible(child, child, none)).toBe(false);
    expect(pairEligible(child, child, { ...none, friend: true })).toBe(true);
    expect(pairEligible(child, child, { ...none, classmate: true })).toBe(true);
  });
  it("a block or a paused player ends it", () => {
    expect(pairEligible(adult, adult, { ...none, blocked: true })).toBe(false);
    expect(pairEligible(adult, { adult: true, paused: true }, none)).toBe(false);
    expect(pairEligible(child, { adult: false, paused: true }, { ...none, friend: true })).toBe(false);
  });
  it("rated games have two pools that never mix", () => { expect(ratedPool(adult)).toBe("adult"); expect(ratedPool(child)).toBe("child"); });
});

describe("the SQL keeps its safeguarding promises (supabase/online_matching.sql)", () => {
  const sql = read("../supabase/online_matching.sql");
  const fn = (name: string) => sql.match(new RegExp(`create or replace function public\\.${name}\\([\\s\\S]*?end \\$\\$;`))![0];
  it("pair_ok: never across the adult/child line; a child only through can_play (friend or approved classmate)", () => {
    const f = fn("pair_ok");
    expect(f).toMatch(/px\.adult <> py\.adult then return false/);
    expect(f).toMatch(/if px\.adult then return true; end if;/);
    expect(f).toMatch(/return public\.can_play\(x, y\)/);
    expect(f).toMatch(/not public\.owns_player\(x\)/);
    expect(f).toMatch(/px\.paused or py\.paused/); expect(f).toMatch(/from public\.blocks/);
  });
  it("it does not reimplement the classmate rule: no direct join on memberships (class approval lives in can_play / are_classmates)", () => {
    expect(sql.replace(/--[^\n]*/g, "")).not.toMatch(/memberships/);
  });
  it("every way into a game goes through pair_ok: find_game, accept_seek, open_seeks, rematch", () => {
    for (const name of ["find_game", "accept_seek", "open_seeks", "answer_rematch_inner", "request_rematch"]) expect(fn(name)).toMatch(/pair_ok\(/);
  });
  it("find_game and the seek helpers are not adult-only any more, but a child can only meet can_play players (pair_ok in the query)", () => {
    expect(fn("find_game")).toMatch(/and public\.pair_ok\(p_player, s\.player\)/);
    expect(fn("open_seeks")).toMatch(/public\.pair_ok\(p_player, s\.player\)/);
    expect(fn("seek_enter")).not.toMatch(/adult/);
  });
  it("no child row can enter the stranger pool: stranger games come only from pair_kind, which says 'stranger' only for two grown-ups", () => {
    const kind = fn("pair_kind");
    expect(kind).toMatch(/\(select adult from public\.online_players where id = x\) and \(select adult from public\.online_players where id = y\) then 'stranger' else 'friend'/);
    // 'stranger' is written nowhere else in this file
    const rest = sql.replace(kind, "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/--[^\n]*/g, "");
    expect([...rest.matchAll(/'stranger'/g)].length).toBe(0);
  });
  it("find_game no longer returns ANY active game: only a matched or rematch game, never a friend challenge or a class simul board", () => {
    const f = fn("active_game");
    expect(f).toMatch(/simul_id is null/); expect(f).toMatch(/via in \('seek', 'rematch'\)/);
  });
  it("the window is applied in the query, widening with the longer wait", () => {
    expect(fn("find_game")).toMatch(/rating_window\(greatest\(waited/);
  });
  it("games nobody started are closed, so they never block anyone", () => {
    expect(fn("abort_unstarted")).toMatch(/moves = '\{\}'/); expect(fn("abort_unstarted")).toMatch(/interval '90 seconds'/);
  });
  it("accept_seek gives the same answer for every refusal", () => {
    const f = fn("accept_seek");
    expect(f).toMatch(/s\.player is null or not public\.pair_ok\(p_player, p_target\) or public\.active_game\(p_target\) is not null then raise exception 'that challenge has gone'/);
  });
  it("friend challenges: only children's timed plain-chess games are rated; grown-up friends stay unrated", () => {
    expect(fn("answer_challenge")).toMatch(/mins > 0 and c\.variant = 'chess' and not \(select adult from public\.online_players where id = w\)/);
  });
  it("rematch: same clock, colours swapped, must be accepted by the other side within a minute, never across a block or the age line", () => {
    const ask = fn("request_rematch"), inner = fn("answer_rematch_inner");
    expect(ask).toMatch(/g\.status <> 'finished'/); expect(ask).toMatch(/g\.simul_id is not null/);
    expect(inner).toMatch(/interval '60 seconds'/); expect(inner).toMatch(/start_pair_game\(g\.white, g\.black, tcs, 'rematch', g\.kind, g\.rated, g\.black\)/);
    expect(fn("answer_rematch")).toMatch(/to_player = p_player/);
  });
  it("tables are closed: seeks have no policies and no grants; rematches are readable by their two players and written by nobody", () => {
    expect(sql).toMatch(/revoke all on table public\.seeks from anon, authenticated/);
    expect(sql).not.toMatch(/create policy[^;]*on public\.seeks/);
    expect(sql).toMatch(/create policy "players read own rematches" on public\.rematches for select to authenticated using \(public\.owns_player\(from_player\) or public\.owns_player\(to_player\)\)/);
    expect(sql).toMatch(/revoke insert, update, delete on table public\.rematches from authenticated/);
    expect(sql).not.toMatch(/create policy[^;]*on public\.rematches for (insert|update|delete|all)/);
  });
  it("internal functions are never granted to a client", () => {
    const grants = sql.match(/grant execute on function[\s\S]*?to authenticated;/g)!.join("\n");
    for (const f of ["pair_ok", "pair_kind", "active_game", "abort_unstarted", "start_pair_game", "seek_enter", "answer_rematch_inner", "rating_window"]) expect(grants).not.toContain(`${f}(`);
    for (const f of ["find_game", "post_seek", "open_seeks", "accept_seek", "request_rematch", "answer_rematch", "cancel_rematch"]) expect(grants).toContain(`${f}(`);
  });
  it("it does not redefine can_play or battle_can_pair (the class-approval rules live in class_approval.sql)", () => {
    expect(sql).not.toMatch(/create or replace function public\.(can_play|battle_can_pair|are_classmates|my_opponents|simul_seat)/);
  });
  it("there is no chat: no free-text column is added", () => { expect(sql).not.toMatch(/\btext\b[^\n]*(message|note|chat|comment)/i); });
});

describe("the lag allowance (bullet)", () => {
  it("forgives the reported lag, never more than the cap, the quota or the time actually charged", () => {
    expect(lagCredit(120, 1500, 5000)).toBe(120);
    expect(lagCredit(900, 1500, 5000)).toBe(LAG_CAP_MS);
    expect(lagCredit(200, 80, 5000)).toBe(80);
    expect(lagCredit(200, 1500, 40)).toBe(40);
  });
  it("ignores a report that is not a plain positive number", () => {
    for (const bad of [undefined, null, "300", -5, 0, NaN, Infinity]) expect(lagCredit(bad, 1500, 5000)).toBe(0);
  });
  it("the quota is spent, refills a little each move, and never exceeds its start", () => {
    expect(nextQuota(1500, 200)).toBe(1325); expect(nextQuota(1490, 0)).toBe(LAG_QUOTA_MS); expect(nextQuota(0, 0)).toBe(25);
  });
  it("a game can never be won on forgiven time by more than the quota plus the refill", () => {
    let q = LAG_QUOTA_MS, total = 0;
    for (let i = 0; i < 40; i++) { const c = lagCredit(10000, q, 100000); total += c; q = nextQuota(q, c); }
    expect(total).toBeLessThanOrEqual(LAG_QUOTA_MS + 40 * 25);
  });
  it("a flag can be claimed only past zero by what the flagged side could still be owed; no quota column (old database) = no grace", () => {
    expect(flagGrace(1500)).toBe(LAG_CAP_MS); expect(flagGrace(100)).toBe(100); expect(flagGrace(0)).toBe(0);
    const fn = read("../supabase/functions/play-move/index.ts");
    expect(fn).toMatch(/left\(turn\) \+ flagGrace\(quotaOf\(turn\)\) > 0/); expect(fn).toMatch(/typeof q === "number" \? q : 0/);
  });
  it("the clocks stay server-authoritative: the server's own time charges the mover, the client only reports lag", () => {
    const fn = read("../supabase/functions/play-move/index.ts");
    expect(fn).toMatch(/now - since/); expect(fn).toMatch(/lagCredit\(lag, quotaOf\(turn\), now - since\)/);
  });
});

describe("every new string has English and Punjabi, written the house way", () => {
  const fresh = Object.entries(UI).filter(([k]) => /^(po[A-Z]|lb[A-Z]|rt[A-Z]|rm[A-Z]|srv[A-Z]|cat[A-Z]|newOpponent|ratedGame|onlineAborted|onlineFriendsTitle|adultSafety)/.test(k));
  it("are all there", () => { expect(fresh.length).toBeGreaterThan(55); });
  it("English and Punjabi are both filled, with the same {placeholders}", () => {
    for (const [k, v] of fresh) {
      const x = v as { en: string; pa: string };
      expect(x.en.length, k).toBeGreaterThan(0); expect(x.pa.length, k).toBeGreaterThan(0);
      expect((x.en.match(/\{\w+\}/g) ?? []).sort(), k).toEqual((x.pa.match(/\{\w+\}/g) ?? []).sort());
    }
  });
  it("Punjabi has no precomposed nukta letters and no space before a ਡੰਡੀ", () => {
    for (const [k, v] of fresh) {
      const pa = (v as { pa: string }).pa;
      expect([0x0A33, 0x0A36, 0x0A59, 0x0A5A, 0x0A5B, 0x0A5E].some(c => pa.includes(String.fromCharCode(c))), `${k} precomposed nukta`).toBe(false);
      expect(pa, `${k} space before danda`).not.toMatch(/ ।/);
    }
  });
});
