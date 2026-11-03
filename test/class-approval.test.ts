// Class codes are limited and joining needs the teacher's yes (supabase/class_approval.sql): a guessed code must never
// make a stranger a classmate of the children.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { splitPupils, isLimited, type Pupil } from "../src/teach/api";
import { UI as STRINGS } from "../src/i18n";

const sql = readFileSync(new URL("../supabase/class_approval.sql", import.meta.url), "utf8");
const fn = (name: string) => sql.match(new RegExp(`create (?:or replace )?function public\\.${name}\\b[\\s\\S]*?(?:end \\$\\$;|\\$\\$;)`))![0];

describe("the wrong-code limit", () => {
  it("is 10 wrong codes an hour per account, in one shared helper", () => {
    const h = fn("class_by_code");
    expect(h).toMatch(/interval '1 hour'/);
    expect(h).toMatch(/count\(\*\) from public\.class_code_misses where parent = auth\.uid\(\)\) >= 10/);
    expect(h).toMatch(/insert into public\.class_code_misses/);
    expect(sql).toMatch(/alter table public\.class_code_misses enable row level security/);
  });
  it("both class_preview and join_class go through it, and neither looks a code up any other way", () => {
    for (const f of ["class_preview", "join_class"]) {
      expect(fn(f)).toMatch(/public\.class_by_code\(p_code\)/);
      expect(fn(f)).not.toMatch(/from public\.classes where code/);
    }
  });
  it("the helper is not callable by anyone directly", () => {
    expect(sql).toMatch(/revoke all on function public\.class_by_code\(text\)[^;]*from public, anon, authenticated;/);
    expect(sql.match(/grant execute on function[^;]*;/g)!.join("\n")).not.toMatch(/class_by_code|are_classmates/);
  });
  it("a wrong code returns (not raises), so the counted miss survives", () => {
    expect(fn("class_by_code")).not.toMatch(/no class with that code/);
    expect(fn("join_class")).toMatch(/if v_class is null then return null/);
  });
  it("the app recognises the refusal", () => {
    expect(isLimited("too many wrong class codes: try again in an hour")).toBe(true);
    expect(isLimited("no class with that code")).toBe(false);
  });
});

describe("approval", () => {
  it("new members are pending; every existing row is set approved", () => {
    expect(sql).toMatch(/add column if not exists approved boolean not null default true;/);   // existing rows get true...
    expect(sql).toMatch(/alter column approved set default false;/);                          // ...new rows get false
    expect(fn("join_class")).toMatch(/values \(v_class, auth\.uid\(\), p_profile, p_avatar, p_colour, false\)/);
    expect(fn("join_class")).not.toMatch(/approved = /);   // re-joining never changes approval
  });
  it("a parent cannot approve their own child: update stays limited to the summary", () => {
    expect(sql).not.toMatch(/grant update[^;]*approved/);
  });
  it("only the class's teacher can approve or reject", () => {
    for (const f of ["approve_member", "reject_member"]) {
      expect(fn(f)).toMatch(/classes where id = p_class and teacher = auth\.uid\(\)\) then raise exception 'not your class'/);
      expect(fn(f)).toMatch(/security definer/);
    }
    expect(fn("approve_member")).toMatch(/set approved = true/);
    expect(fn("reject_member")).toMatch(/delete from public\.memberships[\s\S]*?and not approved/);
  });
  it("are_classmates is the one rule: both memberships approved, same class", () => {
    const a = fn("are_classmates");
    expect(a).toMatch(/mx on mx\.parent = px\.parent and mx\.profile_id = px\.profile_id and mx\.approved/);
    expect(a).toMatch(/my on my\.parent = py\.parent and my\.profile_id = py\.profile_id and my\.approved/);
    expect(a).toMatch(/mx\.class_id = my\.class_id/);
  });
  it("can_play and battle_can_pair take their classmate branch from are_classmates, still children only", () => {
    for (const f of ["can_play", "battle_can_pair"]) {
      expect(fn(f)).toMatch(/public\.are_classmates\(x, y\) and not \(select adult/);
      expect(fn(f)).not.toMatch(/public\.memberships/);
      expect(fn(f)).toMatch(/not \(select paused/);           // the rest of the rule is intact
      expect(fn(f)).toMatch(/public\.blocks/);
    }
    expect(fn("can_play")).toMatch(/owns_player\(x\) or public\.owns_player\(y\)/);
    expect(fn("my_opponents")).toMatch(/public\.are_classmates\(p_player, o\.id\)/);
  });
  it("simul_seat seats only approved members", () => {
    expect(fn("simul_seat")).toMatch(/m\.class_id = s\.class_id and m\.approved and o\.adult and not o\.paused/);
    expect(sql).toMatch(/grant execute on function public\.simul_seat\(uuid\) to authenticated/);
  });
  it("the class leaderboard needs the asker and every row approved", () => {
    const l = fn("class_leaderboard");
    expect(l).toMatch(/profile_id = p_profile and approved\)/);
    expect(l).toMatch(/m\.class_id = p_class and m\.approved/);
  });
  it("my_classes reports approval and withholds homework while pending", () => {
    expect(fn("my_classes")).toMatch(/approved boolean/);
    expect(fn("my_classes")).toMatch(/case when m\.approved then c\.homework end/);
  });
});

describe("the app side", () => {
  const p = (approved: boolean): Pupil => ({ parent: "u", profile_id: "p", avatar: "cat", colour: "#000000", summary: {}, updated_at: "", approved });
  it("splits waiting pupils from approved ones", () => {
    const s = splitPupils([p(true), p(false), p(false)]);
    expect([s.approved.length, s.waiting.length]).toEqual([1, 2]);
  });
  it("every new string has English and Punjabi, no composed nukta letters, no space before a danda", () => {
    for (const k of ["joinLimited", "joinPending", "joinPendingNote", "joinPendingShort", "teachWaiting", "teachApprove", "teachReject", "teachRejectConfirm", "teachApproveNote", "teachWaitingBadge"]) {
      const v = (STRINGS as Record<string, { en: string; pa: string }>)[k];
      expect(v?.en, k).toBeTruthy(); expect(v?.pa, k).toBeTruthy();
      expect(v.pa).toBe(v.pa.normalize("NFD"));
      expect(v.pa).not.toMatch(/ ।/);
    }
  });
});
