// Classes (DECISIONS #82): the teacher's screens, and the parent's "join a class" with consent.
// Pupils are shown only as their animal and colour; a teacher's own labels stay on the teacher's device.
import { LEVELS, findLesson } from "../content/levels";
import { family } from "../family";
import { num, t, tx } from "../i18n";
import { icon } from "../icons";
import { avatarHTML } from "../me/family";
import { createClass, deleteClass, joinClass, leaveClass, myClasses, previewClass, pupils, removePupil, setHomework, teacherClasses, type Pupil } from "./api";

type Go = (h: string) => void;
const bar = (title: string) => `<div class="lessonbar"><button class="iconbtn" data-back aria-label="${t("back")}">${icon("chevronLeft")}</button><h1 class="grow">${title}</h1></div>`;
const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

// ---------- teacher: own labels for pupils, on this device only ----------
const LABELS = "scc-teacher-labels";
const labels = (): Record<string, string> => { try { return JSON.parse(localStorage.getItem(LABELS) ?? "{}"); } catch { return {}; } };
const setLabel = (key: string, v: string) => { try { const l = labels(); if (v.trim()) l[key] = v.trim().slice(0, 40); else delete l[key]; localStorage.setItem(LABELS, JSON.stringify(l)); } catch { /* storage blocked */ } };
const pupilKey = (classId: string, p: Pupil) => `${classId}:${p.parent}:${p.profile_id}`;

export async function teacherHome(root: HTMLElement, go: Go) {
  root.innerHTML = `<div class="screen">${bar(t("teachTitle"))}<p class="muted">${t("loading")}</p></div>`;
  root.querySelector<HTMLButtonElement>("[data-back]")!.onclick = () => go("#/settings");
  const classes = await teacherClasses();
  root.innerHTML = `<div class="screen">${bar(t("teachTitle"))}
    <p class="muted">${t("teachAbout")}</p>
    <div class="botlist">${classes.map(c => `<button class="botcard" data-class="${c.id}"><span class="rushicon dark">${icon("users")}</span>
      <span class="grow"><b>${esc(c.title)}</b><small>${t("teachCode")}: <b class="codetxt">${c.code}</b></small></span>${icon("arrowRight", "go")}</button>`).join("")}</div>
    <form class="emailform" data-new><label class="note" for="ct">${t("teachNew")}</label>
      <input id="ct" maxlength="40" required placeholder="${t("teachNewPh")}"><button class="btn wide" type="submit">${icon("plus")} ${t("teachCreate")}</button></form>
    <p class="note err" data-err></p>
    <p class="note">${t("teachSafe")}</p></div>`;
  root.querySelector<HTMLButtonElement>("[data-back]")!.onclick = () => go("#/settings");
  root.querySelectorAll<HTMLButtonElement>("[data-class]").forEach(b => b.onclick = () => go(`#/teach/${b.dataset.class}`));
  root.querySelector<HTMLFormElement>("[data-new]")!.onsubmit = async e => {
    e.preventDefault();
    const err = await createClass(root.querySelector<HTMLInputElement>("#ct")!.value);
    if (err) root.querySelector("[data-err]")!.textContent = err; else void teacherHome(root, go);
  };
}

export async function classView(root: HTMLElement, classId: string, go: Go) {
  const c = (await teacherClasses()).find(x => x.id === classId);
  if (!c) return go("#/teach");
  const list = await pupils(classId), lab = labels();
  const lessons = LEVELS.flatMap(l => l.lessons);
  root.innerHTML = `<div class="screen">${bar(esc(c.title))}
    <div class="code"><small class="note">${t("teachCodeHow")}</small><b class="codetxt big">${c.code}</b></div>
    <h2 class="sec">${t("teachHomework")}</h2>
    <select class="hwsel" data-hw aria-label="${t("teachHomework")}"><option value="">${t("teachNoHomework")}</option>${lessons.map(l =>
      `<option value="${l.id}" ${c.homework === l.id ? "selected" : ""}>${l.id} · ${esc(tx(l.title))}</option>`).join("")}</select>
    <h2 class="sec">${t("teachPupils")} <span>${num(list.length)}</span></h2>
    ${list.length ? `<div class="pupils">${list.map(p => {
      const s = p.summary, key = pupilKey(classId, p);
      return `<div class="pupil">${avatarHTML(p)}
        <div class="grow"><input class="plabel" data-label="${esc(key)}" value="${esc(lab[key] ?? "")}" placeholder="${t("teachLabelPh")}" aria-label="${t("teachLabelPh")}">
          <small>${t("level")} ${num(s.level ?? 1)} · ${num(s.lessons ?? 0)} ${t("lessons")} · ${t("teachThisWeek")}: ${num(s.lessonsWeek ?? 0)} ${t("lessons")}, ${num(s.daysWeek ?? 0)} ${t("teachDays")} · ${num(s.tests ?? 0)} ${t("teachTests")}</small></div>
        <button class="iconbtn" data-rm="${esc(key)}" aria-label="${t("teachRemove")}">${icon("trash")}</button></div>`;
    }).join("")}</div>` : `<p class="note">${t("teachNoPupils")}</p>`}
    <p class="note">${t("teachLabelNote")}</p>
    <div class="actions"><button class="danger" data-del>${t("teachDelete")}</button></div></div>`;
  root.querySelector<HTMLButtonElement>("[data-back]")!.onclick = () => go("#/teach");
  root.querySelector<HTMLSelectElement>("[data-hw]")!.onchange = e => void setHomework(classId, (e.target as HTMLSelectElement).value || null);
  root.querySelectorAll<HTMLInputElement>("[data-label]").forEach(i => i.onchange = () => setLabel(i.dataset.label!, i.value));
  root.querySelectorAll<HTMLButtonElement>("[data-rm]").forEach(b => b.onclick = async () => {
    const p = list.find(x => pupilKey(classId, x) === b.dataset.rm)!;
    if (confirm(t("teachRemoveConfirm"))) { await removePupil(classId, p); void classView(root, classId, go); }
  });
  root.querySelector<HTMLButtonElement>("[data-del]")!.onclick = async () => { if (confirm(t("teachDeleteConfirm"))) { await deleteClass(classId); go("#/teach"); } };
}

// ---------- parent: join a class, with consent ----------
export function joinScreen(root: HTMLElement, go: Go) {
  const kid = family.current();
  const step1 = (err = "") => {
    root.innerHTML = `<div class="screen">${bar(t("joinTitle"))}
      <div class="hero">${avatarHTML(kid, "big")}<p>${t("joinFor")}</p></div>
      <form class="emailform" data-code><label class="note" for="cc">${t("joinAsk")}</label>
        <input id="cc" maxlength="6" autocapitalize="characters" autocomplete="off" required placeholder="ABC234" class="codein">
        <button class="btn wide" type="submit">${t("next")}</button></form>
      ${err ? `<p class="note err">${esc(err)}</p>` : ""}</div>`;
    root.querySelector<HTMLButtonElement>("[data-back]")!.onclick = () => go("#/family");
    root.querySelector<HTMLFormElement>("[data-code]")!.onsubmit = async e => {
      e.preventDefault();
      const code = root.querySelector<HTMLInputElement>("#cc")!.value.toUpperCase();
      const title = await previewClass(code);
      if (!title) return step1(t("joinBad"));
      step2(code, title);
    };
  };
  // what the parent agrees to, in plain words, before anything is shared
  const step2 = (code: string, title: string) => {
    root.innerHTML = `<div class="screen">${bar(t("joinTitle"))}
      <div class="hero">${avatarHTML(kid, "big")}<h3>${esc(title)}</h3></div>
      <div class="parentcard">${icon("shield")}<div><b>${t("joinShares")}</b>
        <small>${t("joinSharesList")}</small><small><b>${t("joinNever")}</b> ${t("joinNeverList")}</small><small>${t("joinLeave")}</small></div></div>
      <div class="actions" style="flex-direction:column"><button class="btn wide" data-agree>${t("joinAgree")}</button>
        <button class="btn ghost wide" data-cancel>${t("cancel")}</button></div><p class="note err" data-err></p></div>`;
    root.querySelector<HTMLButtonElement>("[data-back]")!.onclick = () => step1();
    root.querySelector<HTMLButtonElement>("[data-cancel]")!.onclick = () => go("#/family");
    root.querySelector<HTMLButtonElement>("[data-agree]")!.onclick = async () => {
      const err = await joinClass(code);
      if (err) root.querySelector("[data-err]")!.textContent = err; else go("#/family");
    };
  };
  step1();
}

/** The active child's classes on the family screen, each with Leave. */
export async function classesBlock(box: HTMLElement, go: Go) {
  const mine = (await myClasses(true)).filter(m => m.profile_id === family.current().id);
  box.innerHTML = `<h2 class="sec">${t("joinMine")}</h2>
    ${mine.map(m => `<div class="li"><span class="rushicon dark">${icon("users")}</span><span class="grow"><b>${esc(m.title)}</b>
      ${m.homework ? `<small>${t("hwLabel")}: ${m.homework}</small>` : ""}</span><button class="btn ghost" data-leave="${m.class_id}">${t("joinLeaveBtn")}</button></div>`).join("")}
    <button class="btn ghost wide" data-join>${icon("plus")} ${t("joinTitle")}</button>`;
  box.querySelector<HTMLButtonElement>("[data-join]")!.onclick = () => go("#/join");
  box.querySelectorAll<HTMLButtonElement>("[data-leave]").forEach(b => b.onclick = async () => {
    if (confirm(t("joinLeaveConfirm"))) { await leaveClass(b.dataset.leave!, family.current().id); void classesBlock(box, go); }
  });
}

/** Homework for the active child, if a class set one: shown on the home screen. */
export async function homeworkCard(box: HTMLElement, go: Go) {
  const hw = (await myClasses()).find(m => m.profile_id === family.current().id && m.homework);
  const lesson = hw?.homework ? findLesson(hw.homework) : undefined;
  if (!hw || !lesson) { box.innerHTML = ""; return; }
  box.innerHTML = `<button class="goalcard hwcard" data-hw><span class="rushicon dark">${icon("book")}</span>
    <span class="grow"><b>${t("hwLabel")}: ${lesson.id} · ${esc(tx(lesson.title))}</b><small>${t("hwFrom").replace("{c}", esc(hw.title))}</small></span>${icon("arrowRight")}</button>`;
  box.querySelector<HTMLButtonElement>("[data-hw]")!.onclick = () => go(`#/lesson/${lesson.id}`);
}
