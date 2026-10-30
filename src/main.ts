// App shell: onboarding, the level path, settings, and the hash router that ties them together.
// DECISIONS #42: Jost (Latin) + Mukta Mahee (Gurmukhi) in every look
import "@fontsource/jost/400.css";
import "@fontsource/jost/500.css";
import "@fontsource/jost/600.css";
import "@fontsource/jost/700.css";
import "@fontsource/mukta-mahee/400.css";
import "@fontsource/mukta-mahee/500.css";
import "@fontsource/mukta-mahee/600.css";
import "@fontsource/mukta-mahee/700.css";
import "./fonts.css";
import "./styles.css";
import "./theme-dark.css";   // DECISIONS #111: dark by default; Settings can switch to light
import { registerSW } from "virtual:pwa-register";
import { premovesOn } from "./play/gamekit";
import { ladderScreen, onlineGame, onlineLobby } from "./online/screens";
import { classBoardScreen } from "./teach/screens";
import { tourneyHome, tourneyView } from "./tourney/screens";
import { PIECE_SETS, pieceHTML } from "./chess/pieces";
import { coachHTML } from "./coach";
import { findLesson, LEVELS } from "./content/levels";
import type { Lesson, Level } from "./lesson/types";
import { placementFromFen } from "./chess/types";
import { icon } from "./icons";
const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
import { num, t, tx } from "./i18n";
import { playLesson } from "./lesson/player";
import { bossRound, bossScreen, heroIntro } from "./heroes/screens";
import { bossOpen, hasHero, heroArt, heroLessons, heroOf } from "./heroes/heroes";
import { playTest } from "./lesson/testplayer";
import { playPlacement } from "./lesson/placement";
import { calcHub, playCalc, playVision } from "./puzzles/calcscreens";
import type { VisionKind } from "./puzzles/vision";
import { playBank, playDaily, playRush, playSurvival, puzzleHub, playRated, themesScreen } from "./puzzles/screens";
import { reviewGame } from "./review/screen";
import { chooseOpening, dueCount, openingsHub, openingsOpen, trainOpenings } from "./openings/screens";
import { botById, MINI_RACE, nextOpponent } from "./bots/bots";
import { botList, playBot } from "./bots/play";
import { powerSetup } from "./power/screen";
import { friendSetup } from "./play/friend";
import { analysisBoard } from "./analysis/screen";
import { GOAL, isPreview, type Look, store, today, unlockAll, devHost, UNLOCK_KEY } from "./store";
import { tabbar } from "./tabbar";
import { voiceOn } from "./voice";
import { mePage } from "./me/screen";
import { avatarHTML, familyScreen } from "./me/family";
import { family } from "./family";
import { firstTouch } from "./firsttouch";
import { allowed, collect, rewardFor, type RewardKind } from "./rewards";
import { isTeacher } from "./teach/api";
import { classView, homeworkCard, joinScreen, teacherHome } from "./teach/screens";
import { mountAccount } from "./accountui";
import { account, startSync, syncConfigured } from "./sync";
import { insightsScreen } from "./insights/screen";
import { NATIVE, OFFLINE_APP, nativeBackButton, nativeBars } from "./native";
import { boardEditor } from "./analysis/editor";
import { soloScreen } from "./solo/screen";
import { ladderScreen as endgameLadder, playRung, rungOpen } from "./ladder/screen";
import { rungById } from "./content/ladder";
import { masterScreen } from "./master/screen";
import { gameSettingsHTML, wireGameSettings } from "./play/gamesettings";
import { wideLayout } from "./wide";
import { courseHub, coursePage, runCourse } from "./openings/course";
import { ask } from "./ui/dialog";
import { startMusic } from "./music";

// the Android app (DECISIONS #121) carries every file inside it: no service worker
if (!NATIVE) registerSW({ immediate: true });
if (NATIVE) nativeBackButton();
// image fallbacks (full check 2026-10-08): the site's security policy blocks inline onerror="…" handlers, so one
// listener does it: an image marked data-hide-on-error disappears, one with data-fallback is replaced by its fallback
document.addEventListener("error", e => {
  const img = e.target;
  if (!(img instanceof HTMLImageElement)) return;
  if (img.dataset.fallback) img.outerHTML = decodeURIComponent(img.dataset.fallback);
  else if (img.hasAttribute("data-hide-on-error")) img.remove();
}, true);
startSync();
startMusic();   // soft background music, when switched on (DECISIONS #129)

const app = document.getElementById("app")!;
let teardown: (() => void) | null = null;
const go = (hash: string) => { if (location.hash === hash) route(); else location.hash = hash; };

function applyTheme() {
  const s = store.get();
  document.documentElement.lang = s.lang;
  document.documentElement.dataset.look = s.look;
  document.documentElement.dataset.board = s.boardTheme ?? "walnut";
  // DECISIONS #111: dark (SWC black and gold) unless the learner chose light in Settings
  const mode = s.themeMode ?? "dark";
  document.documentElement.dataset.theme = mode;
  document.title = t("appName");
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", mode === "dark" ? "#141414" : "#FFFFFF");
  if (NATIVE) nativeBars();   // the Android status-bar icons follow the look (DECISIONS #121)
}

/** A lesson is open once the one before it is finished; the first lesson is always open. */
function lessonState(id: string): "done" | "current" | "locked" {
  const all = LEVELS.flatMap(l => l.lessons), i = all.findIndex(l => l.id === id), done = store.get().lessons;
  if (done[id]) return "done";
  if (i === 0 || unlockAll()) return "current";
  // the placement test opens every level up to the one it placed the learner at (DECISIONS #71)
  if (all[i].level <= store.get().placed) return "current";
  // the first lesson of a level opens when the level before is passed: its test if it has one (DECISIONS #53)
  const lv = LEVELS.find(l => l.lessons.some(x => x.id === id))!, prev = LEVELS[lv.n - 2];
  // (anyone who had already started the next level before its test existed keeps it open)
  if (lv.lessons[0].id === id && (prev?.test || prev?.botTest))
    return store.get().tests[prev.n]?.passed || lv.lessons.some(x => done[x.id]) ? "current" : "locked";
  return done[all[i - 1].id] ? "current" : "locked";
}

/** A level test opens once every lesson of its level is done. */
function testState(n: number): "done" | "current" | "locked" {
  const lv = LEVELS[n - 1];
  if (store.get().tests[n]?.passed) return "done";
  return unlockAll() || lv.lessons.every(l => store.get().lessons[l.id]) ? "current" : "locked";
}

// ---------- welcome (DECISIONS #48): design B. The Shaheedi Bunga logo shows Baba Deep Singh Ji;
// it appears on this screen only, never on pieces, badges or in play. ----------
function welcome() {
  const s = store.get();
  const reasons = ([["reason1", "grad"], ["reason2", "languages"], ["reason3", "shield"]] as const).map(([k, ic]) =>
    `<li>${icon(ic)}${t(k)}</li>`).join("");
  const board = ["wR", "", "bK", "", "", "wQ", "", "bP", "wN", "", "wP", "", "", "bN", "", "wK"].map((p, i) =>
    `<div class="${(Math.floor(i / 4) + i) % 2 ? "d" : "l"}">${p ? pieceHTML(p as "wK", "A") : ""}</div>`).join("");
  // DECISIONS #76: the walnut look, so the first screen matches the app behind it; content as chosen in #48
  app.innerHTML = `<div class="screen wscreen"><div class="welcome wb wwal">
    <div class="wtop"><div class="wbrand"><img class="wlogo swc" src="art/swc-mark.webp" alt="Sikh World Championships"><span>${t("fromSB")}</span></div>
      <div class="wlang" role="group" aria-label="${t("language")}">
        <button data-l="pa" aria-pressed="${s.lang === "pa"}" lang="pa">ਪੰਜਾਬੀ</button><button data-l="en" aria-pressed="${s.lang === "en"}" lang="en">English</button></div></div>
    <div class="wart"><div class="wboard">${board}</div><div class="wchidi">${coachHTML("junior", "happy")}</div></div>
    <h1 class="wtitle">${t("appName")}${s.lang === "en" ? `<span lang="pa">ਸ਼ਤਰੰਜ ਪਾਠਸ਼ਾਲਾ</span>` : `<span lang="en">Chess School</span>`}</h1><p class="wtag">${t("tagline")}</p>
    <ul class="wreasons chips">${reasons}</ul>
    <div class="wcta"><button class="btn wide gold" data-go="new">${t("getStarted")}</button>
      ${OFFLINE_APP ? "" : `<button class="linkbtn" data-go="have">${t("haveAccount")}</button>`}</div>
  </div></div>`;
  app.querySelectorAll<HTMLButtonElement>(".wlang [data-l]").forEach(b => b.onclick = () => {
    store.set({ lang: b.dataset.l as "en" | "pa" }); applyTheme(); welcome();
  });
  app.querySelectorAll<HTMLButtonElement>("[data-go]").forEach(b => b.onclick = () => {
    // the Android app has no sign-in in version 1 (DECISIONS #121): straight into onboarding, saved on the phone
    if (OFFLINE_APP) { localOnly = true; return onboarding(1); }
    go(b.dataset.go === "have" ? "#/signin/have" : "#/signin");
  });
}

// ---------- sign-in, required (DECISIONS #50) ----------
function signInScreen(haveAccount: boolean) {
  app.innerHTML = `<div class="screen">
    <div class="topbar"><button class="iconbtn" data-back aria-label="${t("back")}">${icon("arrowLeft")}</button></div>
    <div class="group signin" data-account></div>
    ${syncConfigured && !devHost() ? "" : `<button class="btn ghost wide" data-local>${devHost() ? t("testLocal") : t("continueLocal")}</button>`}
  </div>`;
  teardown = mountAccount(app.querySelector("[data-account]")!, { startAt: haveAccount ? "methods" : "age" });
  app.querySelector<HTMLButtonElement>("[data-back]")!.onclick = () => go("#/");
  app.querySelector<HTMLButtonElement>("[data-local]")?.addEventListener("click", () => {
    localOnly = true;
    if (devHost()) try { localStorage.setItem(TEST_KEY, "1"); } catch { /* blocked */ }
    if (store.get().onboarded) go("#/"); else onboarding(1);
  });
}
// Test mode (2026-10-06): on the developer's own computer only (localhost), the app can be used without an account,
// saving progress and games on this device and never to the database. It can never appear on the live site.
const TEST_KEY = "scc-test-local";
let localOnly = (() => { try { return devHost() && localStorage.getItem(TEST_KEY) === "1"; } catch { return false; } })();

// ---------- onboarding ----------
function onboarding(step = 0) {
  const s = store.get();
  if (step === 0) {
    app.innerHTML = `<div class="screen">
      <div class="hero"><img src="art/app-icon-192.png" alt="" width="84" height="84" style="border-radius:20px">
        <h1>ਸ਼ਤਰੰਜ ਪਾਠਸ਼ਾਲਾ<br><span style="font-size:.7em">Chess School</span></h1>
        <p lang="pa">ਆਪਣੀ ਭਾਸ਼ਾ ਚੁਣੋ · <span lang="en">Choose your language</span></p></div>
      <div class="choicegrid">
        <button class="bigchoice" data-l="pa" lang="pa"><span class="em">ੳ</span><span>ਪੰਜਾਬੀ<small>ਗੁਰਮੁਖੀ ਵਿੱਚ ਪਾਠ</small></span></button>
        <button class="bigchoice" data-l="en" lang="en"><span class="em">A</span><span>English<small>Lessons in English</small></span></button>
      </div></div>`;
    app.querySelectorAll<HTMLButtonElement>("[data-l]").forEach(b => b.onclick = () => {
      store.set({ lang: b.dataset.l as "en" | "pa" }); applyTheme(); onboarding(1);
    });
  } else if (step === 1) {
    const opts: [Look, string, "wP" | "wN" | "wK"][] = [["young", "ageYoung", "wP"], ["junior", "ageJunior", "wN"], ["adult", "ageAdult", "wK"]];
    app.innerHTML = `<div class="screen">
      <div class="hero"><h1>${t("howOld")}</h1><p>${t("howOldWhy")}</p></div>
      <div class="choicegrid">${opts.map(([look, k, em]) =>
        `<button class="bigchoice" data-look="${look}" aria-pressed="${s.look === look}"><span class="em">${pieceHTML(em, "A")}</span><span>${t(k as "ageYoung")}<small>${t(`${k}Sub` as "ageYoungSub")}</small></span></button>`).join("")}</div>
      <div class="actions"><button class="btn ghost" data-back>${t("back")}</button></div></div>`;
    app.querySelectorAll<HTMLButtonElement>("[data-look]").forEach(b => b.onclick = () => {
      // DECISIONS #94: a new 10-15 learner starts on the clear Classic flat pieces and earns the illustrated set
      const look = b.dataset.look as Look;
      store.set({ look, ...(look === "junior" && !s.onboarded ? { pieceSet: "cburnett" as const } : {}) }); applyTheme();
      // DECISIONS #94: a piece in the hand before any reading, for a new learner only
      if (s.onboarded) onboarding(2); else firstTouch(app, () => onboarding(2));
    });
    app.querySelector<HTMLButtonElement>("[data-back]")!.onclick = () => go("#/");
  } else {
    const look = s.look;
    app.innerHTML = `<div class="screen">
      <div class="hero">${look !== "adult" ? `<div class="herocoach">${coachHTML(look, "happy")}</div>` : `<img src="art/app-icon-192.png" alt="" width="84" height="84" style="border-radius:20px">`}
        <h1>${t("appName")}</h1><p>${look === "young" ? t("coachHi") : t("welcome")}</p></div>
      <p class="note" style="text-align:center">${t(syncConfigured ? "progressNoteAccount" : "progressNote")}</p>
      <div class="actions" style="flex-direction:column"><button class="btn wide" data-start>${t("start")}</button>
        <button class="btn ghost wide" data-back>${t("back")}</button></div></div>`;
    // Junior and Adult learners are offered the placement test here; Young always start at Level 1 (DECISIONS #71)
    app.querySelector<HTMLButtonElement>("[data-start]")!.onclick = () => { store.set({ onboarded: true }); go(look === "young" ? "#/" : "#/placement"); };
    app.querySelector<HTMLButtonElement>("[data-back]")!.onclick = () => onboarding(1);
  }
}

// ---------- home: Walnut Club (DECISIONS #67) ----------
let homeLevel = 0;   // the level whose lessons are listed; 0 = the learner's current level

/** A small static board for the Continue card: the lesson's first diagram, else its Try position. */
function thumb(fen: string): string {
  const b = placementFromFen(fen);
  let out = "";
  for (let r = 8; r >= 1; r--) for (let f = 0; f < 8; f++) {
    const sq = "abcdefgh"[f] + r, p = b[sq];
    out += `<div class="${(f + r) % 2 ? "l" : "d"}">${p ? pieceHTML(p) : ""}</div>`;
  }
  return `<div class="thumb">${out}</div>`;
}
const lessonFen = (l: Lesson) => l.learn.find(x => x.board?.fen)?.board?.fen ?? ("fen" in l.try ? (l.try as { fen: string }).fen : START_FEN);

/** The level the learner is on: the level of their next lesson (after a placement, at least the placed level). */
function learnerLevel(): number {
  const s = store.get(), all = LEVELS.flatMap(l => l.lessons);
  const current = all.find(l => l.level >= s.placed && lessonState(l.id) === "current") ?? all.find(l => lessonState(l.id) === "current");
  // when the next level waits on a test, no lesson is 'current': fall back to the first unfinished one
  return (current ?? all.find(l => !s.lessons[l.id]))?.level ?? LEVELS.length;
}

// ---------- the lighter home (DECISIONS #94, trial A): one big next step, three small tiles, the level's progress,
// and the full level and lesson list one tap away ----------
const ALL_KEY = "scc-home-all";
const showAll = () => { try { return sessionStorage.getItem(ALL_KEY) === "1"; } catch { return false; } };
const setShowAll = (on: boolean) => { try { sessionStorage.setItem(ALL_KEY, on ? "1" : "0"); } catch { /* blocked */ } };

function nextCard(l: Lesson, s: ReturnType<typeof store.get>): string {
  const lv = LEVELS[l.level - 1], minutes = 2 + Math.round((l.learn.length + l.practise.length) * 0.7);
  return `<button class="nextcard" data-go="${l.id}">
    <span class="nexttop">${s.look !== "adult" ? `<span class="nextcoach">${coachHTML(s.look, "cheer")}</span>` : thumb(lessonFen(l))}
      <span class="grow"><small>${s.lessons[LEVELS[0].lessons[0].id] ? t("continue") : t("start")} · ${t("level")} ${num(l.level)}</small>
        <b>${num(l.id)} · ${tx(l.title)}</b>
        <small>${t("lessonOf").replace("{i}", num(lv.lessons.indexOf(l) + 1)).replace("{n}", num(lv.lessons.length))} · ${t("aboutMin").replace("{n}", num(minutes))}</small></span></span>
    <span class="nextgo">${s.lessons[LEVELS[0].lessons[0].id] ? t("continue") : t("start")} ${icon("arrowRight")}</span></button>`;
}

/** Today's puzzle, the next bot and the daily goal; the openings trainer joins once it is open. */
function miniTiles(s: ReturnType<typeof store.get>): string {
  const n = s.goal.date === today() ? Math.min(s.goal.n, GOAL) : 0;
  const dailyDone = s.daily.date === today() && s.daily.solved;
  const nextBot = nextOpponent(s.rating.r, s.stats.botWins);
  const tile = (href: string, cls: string, ic: Parameters<typeof icon>[0], title: string, sub: string) =>
    `<button class="mtile ${cls}" data-href="${href}">${icon(ic)}<b>${title}</b><small>${sub}</small></button>`;
  return `<div class="mtiles ${openingsOpen() ? "four" : ""}">
    ${tile("#/puzzles/daily", "t1", dailyDone ? "check" : "target", t("dailyTitle"), dailyDone ? t("dailyDone") : t("dailyReward"))}
    ${tile(`#/play/${nextBot.id}`, "t4", "swords", t("playBot").replace("{bot}", tx(nextBot.name)), t("playNextSub"))}
    <div class="mtile goal"><span class="goalring" style="--deg:${Math.round((n / GOAL) * 360)}deg"><span>${num(n)}/${num(GOAL)}</span></span><b>${n >= GOAL ? t("goalDone") : t("goalTitle")}</b></div>
    ${openingsOpen() ? tile("#/openings", "t2", "book", t("courseTitle"), dueCount() ? t("openDueHome").replace("{n}", num(dueCount())) : t("openNoneDueShort")) : ""}
  </div>`;
}

function levelProgress(lv: Level, s: ReturnType<typeof store.get>): string {
  const got = lv.lessons.filter(l => s.lessons[l.id]).length, pct = Math.round((got / lv.lessons.length) * 100);
  return `<div class="lvprog"><div class="lvprogtop"><b>${t("level")} ${num(lv.n)} · ${tx(lv.title)}</b><span>${num(got)} / ${num(lv.lessons.length)}</span></div>
    <div class="ubar"><i style="width:${pct}%"></i></div>
    ${heroRow(lv.n)}
    <button class="linkbtn" data-seeall>${showAll() ? t("hideLessons") : t("seeAllLessons")}</button></div>`;
}

/** DECISIONS #109 (option A): the level's hero on its card, with the boss battle (or the hero, once won). */
function heroRow(n: number): string {
  const h = heroOf(n), mine = hasHero(h.id), open = bossOpen(n, k => testState(k) !== "locked");
  return `<div class="lvhero"><img class="heroface" src="${heroArt(h.id)}" alt="">
    <span class="grow"><b>${tx(h.name)}</b><small>${tx(h.virtue)}</small></span>
    <button class="bossbtn ${open ? "" : "off"}" data-boss="${n}">${mine ? `${icon("check")} ${tx(h.name)}` : t("bossBattle")}</button></div>`;
}

function home() {
  const s = store.get();
  const all = LEVELS.flatMap(l => l.lessons);
  const curLevel = learnerLevel();
  // after a placement, Continue starts at the placed level, not at an untouched 1.1
  const current = all.find(l => l.level >= s.placed && lessonState(l.id) === "current") ?? all.find(l => lessonState(l.id) === "current");
  const shown = LEVELS[(homeLevel || curLevel) - 1];
  const levelDone = (n: number) => LEVELS[n - 1].lessons.every(l => s.lessons[l.id]);
  const testCount = (lv: Level) => lv.test!.packs.reduce((a, p) => a + p.count, 0);
  const ring = (pct: number, color: string, ic: string) =>
    `<span class="ring" style="--p:${pct}%;--c:${color}"><span>${ic}</span></span>`;
  app.innerHTML = `<div class="screen club tabbed">
    <header class="clubhead">
      <div class="clubtop"><span class="clubbrand"><img class="swcmark" src="art/swc-mark.webp" alt="Sikh World Championships">${t("appName")}</span>
        <span class="topbtns"><button class="iconbtn dark" data-themeflip aria-label="${t((s.themeMode ?? "dark") === "dark" ? "themeToLight" : "themeToDark")}">${icon((s.themeMode ?? "dark") === "dark" ? "light" : "dark")}</button>
        <button class="iconbtn dark" data-settings aria-label="${t("settings")}">${icon("settings")}</button></span></div>
      <h1>${s.lessons[all[0].id] ? t("welcomeBack") : t("welcomeNew")}</h1>
      <div class="homechips"><span>${icon("flame")}${num(s.streak.days)}</span><span>${icon("xp")}${num(s.xp)}</span><span>${icon("trophy")}${t("level")} ${num(curLevel)}</span></div>
    </header>
    ${current ? nextCard(current, s) : ""}
    <div data-homework></div>
    ${miniTiles(s)}
    ${levelProgress(LEVELS[curLevel - 1], s)}
    <div class="homeall" data-all ${showAll() ? "" : "hidden"}>
    <h2 class="sec">${t("levelsTitle")}</h2>
    <div class="lvrow" role="tablist">${LEVELS.map(lv => {
      const open = lv.n <= curLevel || unlockAll(), cls = lv.n === shown.n ? "on" : open ? "" : "lock";
      const got = lv.lessons.filter(l => s.lessons[l.id]).length;
      return `<button class="lvcard ${cls}" role="tab" aria-selected="${lv.n === shown.n}" data-level="${lv.n}">
        <img src="art/badges/level-${lv.n}.webp" alt="" data-hide-on-error><b>${tx(lv.title)}</b>
        <small>${levelDone(lv.n) ? t("levelDone") : open ? `${num(got)} / ${num(lv.lessons.length)}` : `${icon("lock")} ${num(lv.band)}`}</small></button>`;
    }).join("")}</div>
    <h2 class="sec">${t("level")} ${num(shown.n)} · ${tx(shown.title)} <span>${num(shown.band)}</span></h2>
    <div class="lslist">${shown.lessons.map(l => {
      const st = lessonState(l.id), res = s.lessons[l.id];
      const r = st === "done" ? ring(100, "var(--kesri)", icon("check")) : st === "current" ? ring(35, "var(--gold)", icon("play")) : ring(0, "var(--line)", icon("lock"));
      return `<button class="li ${st}" data-go="${l.id}" ${st === "locked" ? `aria-disabled="true" title="${t("locked")}"` : ""}>${r}
        <span class="grow"><b>${num(l.id)} · ${tx(l.title)}</b><small>${tx(l.goal)}</small></span>
        ${res?.review ? `<span class="again" title="${t("skippedNote")}">${icon("again")} ${t("practiseAgain")}</span>` : ""}
        ${res ? `<span class="stars" aria-label="${res.stars} / 3">${[1, 2, 3].map(i => icon("star", i <= res.stars ? "on" : "")).join("")}</span>` : ""}</button>`;
    }).join("")}${shown.test ? (() => {
      const st = testState(shown.n), res = s.tests[shown.n];
      return `<button class="li test ${st}" data-test="${shown.n}" ${st === "locked" ? `aria-disabled="true" title="${t("testLocked")}"` : ""}>
        ${ring(res?.passed ? 100 : 0, "var(--gold)", icon(st === "locked" ? "lock" : "trophy"))}
        <span class="grow"><b>${t("levelTest")}</b><small>${res ? `${t("bestScore")}: ${num(res.best)} / ${num(testCount(shown))}` : st === "locked" ? t("testLocked") : t("testShort").replace("{n}", num(testCount(shown))).replace("{p}", num(shown.test!.pass))}</small></span></button>`;
    })() : shown.botTest ? (() => {
      const st = testState(shown.n), bot = botById(shown.botTest)!;
      return `<button class="li test ${st}" data-bottest="${bot.id}" data-n="${shown.n}" ${st === "locked" ? `aria-disabled="true" title="${t("testLocked")}"` : ""}>
        ${ring(s.tests[shown.n]?.passed ? 100 : 0, "var(--gold)", icon(st === "locked" ? "lock" : "trophy"))}
        <span class="grow"><b>${t("levelTest")}</b><small>${(shown.race ? t("raceShort").replace("{n}", num(shown.race)) : t("botTestShort")).replace("{bot}", tx(bot.name))}</small></span></button>`;
    })() : ""}${shown.n === 9 ? `<button class="li current" data-href="#/ladder">${ring(0, "var(--gold)", icon("target"))}
        <span class="grow"><b>${t("egTitle")}</b><small>${t("egAboutShort")}</small></span>${icon("arrowRight")}</button>` : ""}</div>
    </div>
  </div>${tabbar("learn")}`;
  app.querySelector<HTMLButtonElement>("[data-boss]")?.addEventListener("click", e => go(`#/boss/${(e.currentTarget as HTMLElement).dataset.boss}`));
  app.querySelector<HTMLButtonElement>("[data-seeall]")?.addEventListener("click", () => {
    const box = app.querySelector<HTMLElement>("[data-all]")!; box.hidden = !box.hidden; setShowAll(!box.hidden);
    app.querySelector("[data-seeall]")!.textContent = box.hidden ? t("seeAllLessons") : t("hideLessons");
    if (!box.hidden) { const row = app.querySelector<HTMLElement>(".lvrow"), on = app.querySelector<HTMLElement>(".lvcard.on"); if (row && on) row.scrollLeft = on.offsetLeft - (row.clientWidth - on.offsetWidth) / 2; }
  });
  const shake = (b: HTMLElement) => b.animate([{ transform: "translateX(-4px)" }, { transform: "translateX(4px)" }, { transform: "none" }], 250);
  app.querySelectorAll<HTMLButtonElement>("[data-level]").forEach(b => b.onclick = () => {
    if (+b.dataset.level! > curLevel && !unlockAll()) return void shake(b);
    homeLevel = +b.dataset.level!; setShowAll(true); home();
  });
  // centre the current level's card by scrolling the row sideways only (scrollIntoView also scrolled the page down)
  const row = app.querySelector<HTMLElement>(".lvrow"), on = app.querySelector<HTMLElement>(".lvcard.on");
  if (row && on) row.scrollLeft = on.offsetLeft - (row.clientWidth - on.offsetWidth) / 2;
  app.querySelectorAll<HTMLButtonElement>("[data-test]").forEach(b => b.onclick = () => {
    if (testState(+b.dataset.test!) === "locked") return void shake(b);
    go(`#/test/${b.dataset.test}`);
  });
  app.querySelectorAll<HTMLButtonElement>("[data-go]").forEach(b => b.onclick = () => {
    if (lessonState(b.dataset.go!) === "locked") return void shake(b);
    go(`#/lesson/${b.dataset.go}`);
  });
  app.querySelector<HTMLButtonElement>("[data-settings]")!.onclick = () => go("#/settings");
  // DECISIONS #117: one tap swaps the look, from the top of the home screen
  app.querySelector<HTMLButtonElement>("[data-themeflip]")!.onclick = () => {
    store.set({ themeMode: (store.get().themeMode ?? "dark") === "dark" ? "light" : "dark" }); applyTheme(); route();
  };
  app.querySelectorAll<HTMLButtonElement>("[data-href]").forEach(b => b.onclick = () => go(b.dataset.href!));
  if (account.signedIn()) void homeworkCard(app.querySelector<HTMLElement>("[data-homework]")!, go);
  app.querySelector<HTMLButtonElement>("[data-bottest]")?.addEventListener("click", e => {
    const b = e.currentTarget as HTMLButtonElement;
    if (testState(+b.dataset.n!) === "locked") return void shake(b);
    go(`#/play/${b.dataset.bottest}/test`);
  });
}

// ---------- settings ----------
// rewards (DECISIONS #94): one not yet earned shows a lock and what unlocks it; the one in use is never locked out
const lockedOut = (kind: RewardKind, v: string) => {
  const s = store.get(), inUse = (kind === "pieces" && s.pieceSet === v) || (kind === "board" && (s.boardTheme ?? "walnut") === v) || (kind === "frame" && s.frame === v);
  return !inUse && !allowed(kind, v);
};
const lockAttr = (kind: RewardKind, v: string) => lockedOut(kind, v) ? ` class="locked" aria-disabled="true"` : "";
const lockLabel = (kind: RewardKind, v: string, name: string) => lockedOut(kind, v) ? `${name}<br>${tx(rewardFor(kind, v)!.need)}` : name;
const shakeIt = (b: HTMLElement) => b.animate([{ transform: "translateX(-4px)" }, { transform: "translateX(4px)" }, { transform: "none" }], 250);
const lockPip = (kind: RewardKind, v: string) => lockedOut(kind, v) ? `<span class="lockpip">${icon("lock")}</span>` : "";

function settings() {
  const s = store.get();
  const seg = (name: string, cur: string, items: [string, string][]) =>
    `<div class="seg" role="group" data-seg="${name}">${items.map(([v, label]) => `<button data-v="${v}" aria-pressed="${v === cur}">${label}</button>`).join("")}</div>`;
  app.innerHTML = `<div class="screen">
    <div class="lessonbar"><button class="iconbtn" data-home aria-label="${t("back")}">${icon("chevronLeft")}</button><h1 class="grow">${t("settings")}</h1></div>
    <div class="group" data-account></div>
    <div class="group"><h2>${icon("languages")} ${t("language")}</h2>${seg("lang", s.lang, [["pa", "ਪੰਜਾਬੀ"], ["en", "English"]])}</div>
    <div class="group"><h2>${icon("user")} ${t("look")}</h2>${seg("look", s.look, [["young", t("lookYoung")], ["junior", t("lookJunior")], ["adult", t("lookAdult")]])}</div>
    <div class="group"><h2>${icon("crown")} ${t("pieces")}</h2>
      <div class="sets" role="group" data-seg="pieceSet">${PIECE_SETS.map(k => `<button data-v="${k}" aria-pressed="${s.pieceSet === k}"${lockAttr("pieces", k)}>
        <span class="setrow">${(["wK", "wN", "bQ", "bP"] as const).map(p => pieceHTML(p, k)).join("")}</span><small>${lockLabel("pieces", k, t(`set${k}` as "setA"))}</small>${lockPip("pieces", k)}</button>`).join("")}</div>
      <p class="note">${t("pieceCredits")}</p></div>
    <div class="group"><h2>${icon("grid")} ${t("boardLabel2")}</h2>
      <div class="themes" role="group" data-seg="boardTheme">${(["walnut", "forest", "lake", "slate", "stone", "contrast", "gold", "river", "night"] as const).map(k => `<button data-v="${k}" aria-pressed="${(s.boardTheme ?? "walnut") === k}"${lockAttr("board", k)}>
        <span class="swatch" data-th="${k}"><i></i><i></i><i></i><i></i></span><small>${lockLabel("board", k, t(`th${k}`))}</small>${lockPip("board", k)}</button>`).join("")}</div></div>
    ${s.look !== "adult" ? `<div class="group"><h2>${icon("medal")} ${t("frameLabel")}</h2>
      <div class="themes" role="group" data-seg="frame">${(["", "gold", "phulkari"] as const).map(k => `<button data-v="${k}" aria-pressed="${(s.frame ?? "") === k}"${k ? lockAttr("frame", k) : ""}>
        ${avatarHTML(family.current(), k ? `fr-${k}` : "")}<small>${k ? lockLabel("frame", k, tx(rewardFor("frame", k)!.name)) : t("frameNone")}</small>${k ? lockPip("frame", k) : ""}</button>`).join("")}</div></div>` : ""}
    <div class="group"><h2>${icon("sun")} ${t("themeLabel")}</h2>${seg("themeMode", s.themeMode ?? "dark", [["dark", t("themeDark")], ["light", t("themeLight")]])}</div>
    <div class="group"><h2>${icon("music")} ${t("soundLabel")}</h2>${seg("sound", String(s.sound), [["true", t("soundOn")], ["false", t("soundOff")]])}</div>
    <div class="group"><h2>${icon("music")} ${t("musicLabel")}</h2>${seg("music", String(!!s.music), [["true", t("soundOn")], ["false", t("soundOff")]])}<p class="note">${t("musicNote")}</p></div>
    <div class="group"><h2>${icon("sound")} ${t("voiceLabel")}</h2>${seg("voice", String(voiceOn()), [["true", t("soundOn")], ["false", t("soundOff")]])}<p class="note">${t("voiceNote")}</p></div>
    <div class="group"><h2>${icon("vibrate")} ${t("buzzLabel")}</h2>${seg("buzz", String(s.buzz), [["true", t("soundOn")], ["false", t("soundOff")]])}</div>
    <div class="group"><h2>${icon("crown")} ${t("autoQueenLabel")}</h2>${seg("autoQueen", String(!!s.autoQueen), [["true", t("soundOn")], ["false", t("soundOff")]])}<p class="note">${t("autoQueenNote")}</p></div>
    <div class="group gsgroup" data-gsgroup><h2>${icon("grid")} ${t("gsGroup")}</h2>${gameSettingsHTML()}</div>
    <div class="group"><h2>${icon("swords")} ${t("premoveLabel")}</h2>${seg("premove", String(premovesOn()), [["true", t("soundOn")], ["false", t("soundOff")]])}<p class="note">${t("premoveNote")}</p></div>
    ${s.look === "junior" ? `<div class="group"><h2>${t("coachLabel")}</h2>${seg("coach", s.coach, [["singh", t("coachSingh")], ["kaur", t("coachKaur")]])}</div>` : ""}
    <div class="group" data-teacher hidden><h2>${icon("users")} ${t("teachTitle")}</h2><p class="note">${t("teachSettings")}</p><button class="btn ghost wide" data-teach>${t("teachOpen")}</button></div>
    ${s.look !== "young" ? `<div class="group"><h2>${t("placeTitle")}</h2><p class="note">${t("placeSettings")}</p><button class="btn ghost wide" data-placement>${icon("target")} ${t("placeTitle")}</button></div>` : ""}
    ${devHost() ? `<div class="group"><h2>${icon("lock")} ${t("unlockLabel")}</h2>${seg("unlock", String(unlockAll()), [["true", t("soundOn")], ["false", t("soundOff")]])}<p class="note">${t("unlockNote")}</p></div>` : ""}
    <div class="group"><h2>${icon("book")} ${t("aboutApp")}</h2><p class="note">${t("sourceNote")}</p>
      <a class="btn ghost wide" href="https://github.com/SchoolShaheedi/scc-chess-school" target="_blank" rel="noopener">${t("sourceCode")}</a></div>
    <div class="group"><p class="note">${t(syncConfigured ? "progressNoteAccount" : "progressNote")}</p><button class="danger" data-reset>${t("resetProgress")}</button></div>
  </div>`;
  app.querySelectorAll<HTMLElement>("[data-seg]").forEach(g => g.querySelectorAll<HTMLButtonElement>("button").forEach(b => b.onclick = () => {
    if (b.classList.contains("locked")) return void shakeIt(b);   // a reward not yet earned: its label says how (DECISIONS #94)
    const v = b.dataset.v === "true" ? true : b.dataset.v === "false" ? false : b.dataset.v;
    if (g.dataset.seg === "unlock") { try { localStorage.setItem(UNLOCK_KEY, v ? "1" : "0"); } catch { /* blocked */ } teardown?.(); return settings(); }
    store.set({ [g.dataset.seg!]: v } as Partial<ReturnType<typeof store.get>>); applyTheme(); teardown?.(); settings();
  }));
  wireGameSettings(app.querySelector("[data-gsgroup]")!, () => {});   // DECISIONS #115
  if (OFFLINE_APP) app.querySelector<HTMLElement>("[data-account]")!.hidden = true;   // no accounts in the offline build
  else teardown = mountAccount(app.querySelector("[data-account]")!);
  app.querySelector<HTMLButtonElement>("[data-home]")!.onclick = () => go("#/me");
  app.querySelector<HTMLButtonElement>("[data-placement]")?.addEventListener("click", () => go("#/placement"));
  // teacher tools only for approved teachers (the database decides: is_teacher())
  void isTeacher().catch(() => false).then(yes => { const g = app.querySelector<HTMLElement>("[data-teacher]"); if (g && yes) g.hidden = false; });
  app.querySelector<HTMLButtonElement>("[data-teach]")!.onclick = () => go("#/teach");
  app.querySelector<HTMLButtonElement>("[data-reset]")!.onclick = () => { void ask(t("resetConfirm"), { danger: true }).then(ok => { if (ok) { store.reset(); go("#/"); } }); };
}

let routedPath = "";
function route() {
  teardown?.(); teardown = null;
  // a new screen opens at its top (the UX review found Play opening 323 px down, its header out of sight); a redraw
  // of the same screen (settings, sign-in changes) keeps its place (DECISIONS #128)
  const path = location.hash.split("?")[0];
  if (path !== routedPath) { routedPath = path; window.scrollTo(0, 0); }
  collect();   // rewards earned since the last screen stay earned (DECISIONS #94)
  applyTheme();
  const [, page, arg, sub] = location.hash.split("?")[0].split("/");
  if (new URLSearchParams(location.search).has("welcome")) return welcome();   // screenshots / design trials
  // the gate (DECISIONS #50): an account is required. While sign-in is not configured yet,
  // "Continue on this device" on the sign-in screen stands in for it so the app can be tested.
  if (syncConfigured && !account.ready()) { app.innerHTML = `<div class="screen" data-waiting></div>`; return; }
  const gated = syncConfigured ? !account.signedIn() && !isPreview() && !localOnly : !store.get().onboarded && !localOnly;
  if (gated) return page === "signin" ? signInScreen(arg === "have") : welcome();
  if (!store.get().onboarded) return onboarding(1);
  // the Android app has nothing online in version 1 (DECISIONS #121): those screens are never opened there
  if (OFFLINE_APP && ["online", "teach", "class", "join", "signin"].includes(page)) { go("#/"); return; }
  if (page === "test" && arg) {
    const lv = LEVELS[parseInt(arg) - 1];
    if (lv?.test && testState(lv.n) !== "locked") { teardown = playTest(app, lv, go); return; }
  }
  if (page === "lesson" && arg) {
    const lesson = findLesson(arg);
    if (lesson && lessonState(arg) !== "locked") {
      // DECISIONS #109: the level's hero opens its first lesson and its key lesson, once on each device
      const lv = parseInt(arg), seenKey = `scc-hero-seen-${arg}`;
      let seen = true; try { seen = !!localStorage.getItem(seenKey); } catch { /* blocked: skip the card */ }
      if (!seen && heroLessons(lv).includes(arg)) {
        heroIntro(app, lv, () => { try { localStorage.setItem(seenKey, "1"); } catch { /* blocked */ } teardown = playLesson(app, lesson, go); });
        return;
      }
      teardown = playLesson(app, lesson, go); return;
    }
  }
  if (page === "settings") return settings();
  if (page === "me") return mePage(app, go);
  if (page === "family") return familyScreen(app, go);
  // teacher pages need a signed-in, approved teacher; anyone else lands on Settings
  if (page === "teach") {
    if (!account.signedIn()) return settings();
    void isTeacher().catch(() => false).then(yes => { if (!yes) go("#/settings"); else if (arg) void classView(app, arg, go); else void teacherHome(app, go); });
    return;
  }
  if (page === "join") return account.signedIn() ? joinScreen(app, go) : familyScreen(app, go);
  if (page === "openings") {
    if (arg === "choose" && (sub === "white" || sub === "e4" || sub === "d4") && openingsOpen()) return chooseOpening(app, sub, go);
    if (arg === "train") { teardown = trainOpenings(app, go); return; }
    if (arg === "review") return openingsHub(app, go);
    // the openings course (DECISIONS #127): /o/<id> is an opening, /o/<id>/<step> plays a step
    if (!openingsOpen()) return openingsHub(app, go);
    const step = location.hash.split("?")[0].split("/")[4];
    if (arg === "o" && sub && step) { teardown = runCourse(app, sub, step, go); return; }
    if (arg === "o" && sub) return coursePage(app, sub, go);
    return courseHub(app, go);
  }
  if (page === "review") { teardown = reviewGame(app, go); return; }
  // Insights (DECISIONS #113): practise goes to the level's next open lesson, or nowhere if the level is still locked
  if (page === "insights") {
    teardown = insightsScreen(app, go, n => { const ls = LEVELS[n - 1].lessons;
      const l = ls.find(x => lessonState(x.id) === "current") ?? ls.find(x => lessonState(x.id) !== "locked");
      return l ? `#/lesson/${l.id}` : null; });
    return;
  }
  if (page === "puzzles") {
    if (arg === "daily") { teardown = playDaily(app, learnerLevel(), go); return; }
    if (arg === "rush") { teardown = playRush(app, go); return; }
    if (arg === "survival") { teardown = playSurvival(app, go); return; }   // DECISIONS #115
    if (arg === "solo") { teardown = soloScreen(app, go); return; }
    if (arg === "bank") { teardown = playBank(app, go, sub); return; }   // /bank/<phase>: Insights' drills of your own mistakes
    if (arg === "rated") { teardown = playRated(app, go); return; }
    if (arg === "calc") {   // feature 3: #/puzzles/calc, /calc/<level>, /calc/v-<drill>
      if (sub?.startsWith("v-")) { teardown = playVision(app, go, sub.slice(2) as VisionKind); return; }
      if (sub) { teardown = playCalc(app, go, parseInt(sub)); return; }
      return calcHub(app, go);
    }
    if (arg === "themes") return themesScreen(app, go);
    if (arg === "theme" && sub) { teardown = playRated(app, go, sub); return; }
    return puzzleHub(app, learnerLevel(), go);
  }
  // the Endgame ladder (2026-10-30): #/ladder is the list, #/ladder/<rung> plays one (only once the rung before is finished)
  if (page === "ladder") {
    const rung = arg ? rungById(arg) : undefined;
    if (rung && rungOpen(rung.id)) { teardown = playRung(app, rung, go); return; }
    return endgameLadder(app, go);
  }
  if (page === "placement") { teardown = playPlacement(app, go); return; }
  if (page === "play" && arg === "friend") { teardown = friendSetup(app, go); return; }
  if (page === "power") { teardown = powerSetup(app, go, arg); return; }
  // the boss battle (DECISIONS #109): #/boss/<level>, and #/boss/<level>/<round>
  if (page === "boss" && arg && LEVELS[parseInt(arg) - 1]) {
    const n = parseInt(arg), open = bossOpen(n, k => testState(k) !== "locked");
    if (sub) { teardown = bossRound(app, n, parseInt(sub), open, go); return; }
    return bossScreen(app, n, open, go);
  }
  if (page === "online") { teardown = arg === "game" && sub ? onlineGame(app, sub, go) : arg === "ladder" ? ladderScreen(app, go) : onlineLobby(app, go); return; }
  if (page === "class" && arg) return void classBoardScreen(app, arg, go);
  if (page === "tourney") return arg ? tourneyView(app, arg, go) : tourneyHome(app, go);
  if (page === "master") { teardown = masterScreen(app, go, arg); return; }   // guess the move in famous games
  if (page === "analysis") { teardown = analysisBoard(app, go); return; }
  if (page === "editor") { teardown = boardEditor(app, go); return; }   // DECISIONS #115
  if (page === "play") {
    const bot = arg ? botById(arg) : undefined;
    if (!bot) return botList(app, go);
    // the Level 1 test is a game against its bot (DECISIONS #69); it opens once the level's lessons are done
    const lv = sub === "test" ? LEVELS.find(l => l.botTest === bot.id) : undefined;
    if (lv && testState(lv.n) === "locked") return home();
    // the quick game after every third lesson (DECISIONS #94): a short capture race, not a test
    if (sub === "race") { teardown = playBot(app, bot, go, undefined, MINI_RACE); return; }
    // Play vs Coach (DECISIONS #108): the coach explains every move; unrated
    if (sub === "coach") { teardown = playBot(app, bot, go, undefined, undefined, true); return; }
    teardown = playBot(app, bot, go, lv?.n, lv?.race); return;
  }
  home();
}

window.addEventListener("hashchange", route);

// the offline notice (DECISIONS #76): lessons, puzzles and bots all run on the device; only syncing waits
function offlineBanner() {
  let b = document.querySelector<HTMLElement>(".offbanner");
  if (navigator.onLine) { b?.remove(); return; }
  if (!b) { b = document.createElement("div"); b.className = "offbanner"; b.setAttribute("role", "status"); document.body.appendChild(b); }
  b.innerHTML = `${icon("offline")} ${t("offline")}`;
}
window.addEventListener("online", offlineBanner);
window.addEventListener("offline", offlineBanner);
offlineBanner();
wideLayout(app);   // DECISIONS #126: two columns on a wide screen (website only)
// re-route when sign-in changes; always on the first answer from Supabase (the screen is blank until then),
// but never yank someone out of a lesson or test they are in the middle of. Every save also tells the account's
// listeners (for "saved at" in Settings), so only a real change of signed-in state re-routes: re-routing on each
// save sent a new learner back to the age question 1.5 s after they chose (2026-10-18).
let signedState = "";
const signedKey = () => `${account.ready()}|${account.signedIn()}`;
const onboardingShown = () => !!app.querySelector("[data-look], .ftscreen, [data-start]");
account.subscribe(() => {
  const key = signedKey();
  if (account.returnPending() && !app.querySelector("[data-account]")) { go("#/signin/have"); return; }   // a sign-in link that failed: say so where a new one is asked for
  // the account turned out to have progress already (a new device): skip the age question
  if (key === signedState && store.get().onboarded && onboardingShown()) { route(); return; }
  if (key === signedState && !app.querySelector("[data-waiting]")) return;
  signedState = key;
  if (app.querySelector("[data-waiting]") || !/^#\/(lesson|test)\//.test(location.hash)) route();
});
signedState = signedKey();
route();
