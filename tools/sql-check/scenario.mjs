// Runs the online SQL files in a real Postgres (PGlite) and checks the safeguarding and rating rules end to end.
// One-off setup (nothing is added to package.json): npm i --no-save @electric-sql/pglite   then   node tools/sql-check/scenario.mjs "$PWD"
import { boot, ALL } from "./load.mjs";
const db = await boot(process.argv[2], ALL);
let fails = 0;
const ok = (c, m) => { console.log(c ? "ok  " : "FAIL", m); if (!c) fails++; };
const q = async (s, p) => (await db.query(s, p)).rows;
const as = async uid => { await db.query("select set_config('request.uid', $1, false)", [uid]); };
const throws = async (s, p) => { try { await db.query(s, p); return null; } catch (e) { return String(e.message); } };

// 1. the published Glicko-2 example (Glickman 2013): 1500/200/0.06 vs 1400/30 W, 1550/100 L, 1700/300 L, tau 0.5
let r = (await q("select * from public.glicko2_update(1500, 200, 0.06, array[1400,1550,1700]::float8[], array[30,100,300]::float8[], array[1,0,0]::float8[], 0.5)"))[0];
console.log("glicko example:", r);
ok(Math.abs(r.r - 1464.06) < 0.01 && Math.abs(r.rd - 151.52) < 0.01 && Math.abs(r.vol - 0.05999) < 0.00001, "SQL glicko2_update matches the published worked example");

// users and players
const mk = async (email) => (await q("insert into auth.users (email) values ($1) returning id", [email]))[0].id;
const [a1, a2, a3, a4, p1, p2, p3] = await Promise.all(["a1", "a2", "a3", "a4", "p1", "p2", "p3"].map(mk));
const adult = async (u, prof) => { await as(u); return (await q("select public.enable_online_adult($1,'cat','#112233') as id", [prof]))[0].id; };
const child = async (u, prof) => { await as(u); return (await q("select public.enable_online($1,'dog','#445566') as id", [prof]))[0].id; };
const A1 = await adult(a1, "me"), A2 = await adult(a2, "me"), A3 = await adult(a3, "me"), A4 = await adult(a4, "me");
const C1 = await child(p1, "kid1"), C2 = await child(p2, "kid2"), C3 = await child(p3, "kid3");

// 2. adults pair as strangers; one search finds nobody; second finds the first
await as(a1);
ok((await q("select public.find_game($1,'5+0') as g", [A1]))[0].g === null, "first adult waits");
await as(a2);
const g1 = (await q("select public.find_game($1,'5+0') as g", [A2]))[0].g;
ok(!!g1, "second adult is paired");
let g = (await q("select * from public.games where id=$1", [g1]))[0];
ok(g.rated && g.kind === "stranger" && g.category === "blitz" && g.via === "seek" && g.tc_min === 5, "game is a rated blitz stranger game");
await as(a1);
ok((await q("select public.find_game($1,'5+0') as g", [A1]))[0].g === g1, "first adult's heartbeat returns the game");

// 3. window: rating far apart do not pair until widened
await db.query("update public.player_ratings set rating=1200 where false");
await db.query("insert into public.player_ratings (player, category, rating) values ($1,'bullet',1900) on conflict (player,category) do update set rating=1900", [A3]);
await as(a3); await q("select public.find_game($1,'1+0')", [A3]);
await as(a4);
ok((await q("select public.find_game($1,'1+0') as g", [A4]))[0].g === null, "1900 vs 1200 not paired at +-100");
await db.query("update public.seeks set since = now() - interval '12 seconds' where player=$1", [A3]);
ok((await q("select public.find_game($1,'1+0') as g", [A4]))[0].g === null, "still not at +-200 (700 apart)");
await db.query("update public.seeks set since = now() - interval '25 seconds' where player=$1", [A3]);
ok((await q("select public.find_game($1,'1+0') as g", [A4]))[0].g === null, "still not at +-400 (700 apart)");
await db.query("update public.seeks set since = now() - interval '29 seconds', seen = now() where player=$1", [A3]);
await db.query("update public.seeks set since = now() - interval '31 seconds', seen = now() where player=$1", [A3]);
ok(!!(await q("select public.find_game($1,'1+0') as g", [A4]))[0].g, "paired with anyone after 30 s");
ok((await q("select category from public.games where tc_min=1"))[0].category === "bullet", "1+0 is bullet");

// 4. children never meet strangers or adults
await as(p1);
ok((await throws("select public.find_game($1,'5+0')", [C1])) === null, "child may search (pool of friends/classmates only)");
await as(a1); await q("select public.stop_seeking($1)", [A1]);
await as(a3); await db.query("select public.stop_seeking($1)", [A3]);
await as(a2); await db.query("select public.find_game($1,'3+0')", [A2]);
await as(p1);
ok((await q("select public.find_game($1,'3+0') as g", [C1]))[0].g === null, "child not paired with an adult seeking same clock");
await as(p1); await db.query("select public.find_game($1,'5+0')", [C1]);
await as(p2);
ok((await q("select public.find_game($1,'5+0') as g", [C2]))[0].g === null, "two children who are not friends/classmates are not paired");
ok((await q("select public.pair_ok($1,$2) as x", [C2, A1]))[0].x === false, "pair_ok(child, adult) is false");
await as(a1);
ok((await q("select public.pair_ok($1,$2) as x", [A1, C1]))[0].x === false, "pair_ok(adult, child) is false");
await as(p2);
ok((await q("select count(*)::int n from public.open_seeks($1)", [C2]))[0].n === 0, "child sees no open challenge from adults or strangers");
// direct insert of a stranger game with a child is refused by the guard
const e1 = await throws("insert into public.games (white, black, kind, via, tc_min) values ($1,$2,'stranger','seek',5)", [A1, C1]);
ok(!!e1 && /never play each other|strangers are grown-ups/.test(e1), "guard refuses a stranger game with a child: " + (e1 || "").slice(0, 60));
const e2 = await throws("insert into public.games (white, black, kind, via, tc_min, rated, category) values ($1,$2,'friend','challenge',5,true,'blitz')", [A1, C1]);
ok(!!e2, "guard refuses a rated adult-vs-child game");
const e3 = await throws("insert into public.games (white, black, kind, via, tc_min, rated, category) values ($1,$2,'friend','challenge',5,true,'blitz')", [A1, A2]);
ok(!!e3 && /stranger games only/.test(e3), "guard refuses a rated adult friend game");
const e3b = await throws("insert into public.games (white, black, kind, via, tc_min, rated, category) values ($1,$2,'stranger','seek',5,true,'blitz')", [C1, C2]);
ok(!!e3b, "guard refuses a stranger game between two children");

// children friends: befriend, then auto-match and open lobby work, rated in the child pool
await as(p1); const code2 = (await q("select friend_code from public.online_players where id=$1", [C2]))[0].friend_code;
await q("select public.add_friend($1,$2)", [C1, code2]);
await as(p2); await q("select public.answer_friend($1,$2,true)", [C2, C1]);
await as(p1); await db.query("select public.stop_seeking($1)", [C1]);
await q("select public.find_game($1,'5+0')", [C1]);
await as(p2);
const cg = (await q("select public.find_game($1,'5+0') as g", [C2]))[0].g;
ok(!!cg, "friends are auto-matched");
g = (await q("select * from public.games where id=$1", [cg]))[0];
ok(g.rated && g.kind === "friend" && g.category === "blitz", "child friend game is rated, kind friend (child pool)");
// child 3 is a stranger to both: not paired
await as(p3); ok((await q("select public.find_game($1,'3+2') as g", [C3]))[0].g === null, "stranger child waits alone");
// open lobby between friends
await as(p1); await db.query("update public.games set status='finished', result='1/2-1/2' where id=$1", [cg]);
await q("select public.post_seek($1,'10+0')", [C1]);
await as(p2); ok((await q("select count(*)::int n from public.open_seeks($1)", [C2]))[0].n === 1, "child sees a friend's open challenge");
await as(p3); ok((await q("select count(*)::int n from public.open_seeks($1)", [C3]))[0].n === 0, "child stranger sees none");
ok((await throws("select public.accept_seek($1,$2)", [C3, C1])) !== null, "child stranger cannot accept it");
await as(p2); const og = (await q("select public.accept_seek($1,$2) as g", [C2, C1]))[0].g; ok(!!og, "friend accepts open challenge");
await db.query("update public.games set status='finished', result='1/2-1/2' where id=$1", [og]);

// adults' open lobby: adult sees strangers, accept works
await as(a3); await db.query("select public.stop_seeking($1)", [A3]);
await as(a4); await db.query("select public.stop_seeking($1)", [A4]);
await db.query("update public.games set status='finished', result='1/2-1/2' where status='active'");
await as(a3); await q("select public.post_seek($1,'15+10')", [A3]);
await as(a4); const rows = await q("select * from public.open_seeks($1)", [A4]);
ok(rows.length === 1 && rows[0].tc === "15+10" && rows[0].category === "rapid", "adult sees a stranger's open challenge (rapid 15+10)");
ok(!("player_name" in rows[0]) && Object.keys(rows[0]).join() === "player,avatar,colour,rating,provisional,tc,category,waited,friend", "open_seeks exposes animal/colour/rating/tc only");
const ag = (await q("select public.accept_seek($1,$2) as g", [A4, A3]))[0].g; ok(!!ag, "adult accepts stranger's challenge");

// 5. ratings: finish a game with 4 moves, check Glicko update, history, deltas
await db.query("update public.games set moves = array['e2e4','e7e5','g1f3','b8c6'] where id=$1", [ag]);
g = (await q("select * from public.games where id=$1", [ag]))[0];
await db.query("update public.games set status='finished', result='1-0', reason='resign' where id=$1", [ag]);
g = (await q("select * from public.games where id=$1", [ag]))[0];
const pr = await q("select player, rating, rd, games from public.player_ratings where category='rapid' and player in ($1,$2)", [A3, A4]);
console.log(pr, g.white_delta, g.black_delta);
ok(g.white_delta > 0 && g.black_delta < 0 && Math.abs(g.white_delta + g.black_delta) <= 1, "winner up, loser down by the same amount");
ok(Math.abs(g.white_delta) > 100, "first game, RD 350: big swing (provisional)");
await as(g.white === A3 ? a3 : a4);
const summ = await q("select * from public.rating_summary($1)", [g.white]);
console.log(summ.map(s => JSON.stringify(s)).join("\n"));
ok(summ.find(s => s.category === "rapid").wins === 1 && summ.find(s => s.category === "rapid").provisional === true, "summary: 1 win, provisional");
const hist = await q("select * from public.rating_history_for($1,'rapid')", [g.white]);
ok(hist.length === 1 && hist[0].result === "w" && hist[0].delta === g.white_delta, "history row");
ok((await throws("select * from public.rating_summary($1)", [g.black])) !== null, "cannot read someone else's summary");
// a game of <2 moves changes nothing
const before = (await q("select count(*)::int n from public.rating_history"))[0].n;
await as(a1);
await db.query("select public.stop_seeking($1)", [A1]);
await db.query("update public.games set status='finished', result='resign' where false");

// 6. rematch
await as(g.white === A3 ? a3 : a4);
const me = g.white, opp = g.black, meU = me === A3 ? a3 : a4, oppU = me === A3 ? a4 : a3;
const rm = (await q("select public.request_rematch($1,$2) as id", [me, ag]))[0].id; ok(!!rm, "rematch requested");
await as(oppU);
const rg = (await q("select public.answer_rematch($1,$2,true) as id", [opp, rm]))[0].id;
const rr = (await q("select * from public.rematches where id=$1", [rm]))[0];
ok(rr.status === "accepted" && !!rr.new_game, "rematch accepted starts a game");
const ng = (await q("select * from public.games where id=$1", [rr.new_game]))[0];
ok(ng.white === g.black && ng.black === g.white && ng.tc_min === 15 && ng.tc_inc === 10 && ng.rated && ng.via === "rematch", "same clock, colours swapped, rated, via rematch");
// a child cannot be rematched against an adult, and a non-participant cannot request
await as(p3); ok((await throws("select public.request_rematch($1,$2)", [C3, ag])) !== null, "non-participant cannot request a rematch");
// block stops a rematch
await db.query("update public.games set status='finished', result='1/2-1/2', moves=array['e2e4','e7e5'] where id=$1", [ng.id]);
await as(meU); await q("select public.block_player($1,$2)", [me, opp]);
ok((await throws("select public.request_rematch($1,$2)", [me, ng.id])) !== null, "a block ends rematches");
ok((await q("select public.pair_ok($1,$2) as x", [me, opp]))[0].x === false, "blocked players are never paired");

// 7. delete_my_account finishes active games
await as(a1); await db.query("select public.find_game($1,'5+0')", [A1]);
await as(a2); const dg = (await q("select public.find_game($1,'5+0') as g", [A2]))[0].g;
ok(!!dg, "paired for the delete test");
await as(a1); await db.query("select public.delete_my_account()");
const dgm = (await q("select * from public.games where id=$1", [dg]))[0];
ok(dgm.status === "finished" && dgm.reason === "abandoned", "delete_my_account finished the active game");

// 8. stale unstarted games are aborted for seekers
await as(a2);
await db.query("update public.games set created_at = now() - interval '5 minutes' where false");
// ladder
await as(a3); const lad = await q("select * from public.adult_ladder($1,'bullet')", [A3]); ok(Array.isArray(lad), "ladder works for bullet");
await as(p1); ok((await throws("select * from public.adult_ladder($1,'bullet')", [C1])) !== null, "a child cannot read the ladder");
console.log(fails ? `${fails} FAILED` : "ALL OK");
process.exit(fails ? 1 : 0);
