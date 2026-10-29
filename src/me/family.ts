// The family screen (DECISIONS #80): each child is a coloured animal; tap one to switch, or add a child.
// No names: a parent tells the children apart by animal and colour, as agreed for privacy (#38).
import { AVATARS, type Avatar, COLOURS, family, MAX_CHILDREN, type Profile } from "../family";
import { t } from "../i18n";
import { icon } from "../icons";
import { account } from "../sync";
import { classesBlock } from "../teach/screens";
import { disableOnlineFor } from "../online/api";
import { onlineBlock } from "../online/screens";
import { type Look, store } from "../store";
import { animalHeroArt, heroArt } from "../heroes/heroes";
import { ask } from "../ui/dialog";

export const avatarHTML = (p: Pick<Profile, "avatar" | "colour">, cls = "") =>
  `<span class="kidav ${cls}" style="--kc:${p.colour}">${icon(p.avatar as Avatar)}</span>`;

/** The learner's picture on their OWN screens (DECISIONS #109): a hero they have won, if they chose one, else their
 *  animal. Anything other people see (online, class boards) stays the animal and colour (#38). */
export function myAvatarHTML(cls = ""): string {
  const h = store.get().heroAvatar;
  if (!h) return avatarHTML(family.current(), cls);
  const src = h.startsWith("bot:") ? animalHeroArt(h.slice(4)) : heroArt(h);
  return `<span class="kidav heroav ${cls}"><img src="${src}" alt=""></span>`;
}

export function familyScreen(root: HTMLElement, go: (h: string) => void) {
  const cur = family.current(), kids = family.list();
  root.innerHTML = `<div class="screen">
    <div class="lessonbar"><button class="iconbtn" data-back aria-label="${t("back")}">${icon("chevronLeft")}</button><h1 class="grow">${t("famTitle")}</h1></div>
    <p class="muted">${t("famAbout")}</p>
    <div class="kids">${kids.map(p => `<div class="kid ${p.id === cur.id ? "on" : ""}">
      <button class="kidbtn" data-kid="${p.id}" aria-label="${t("famSwitch")}" ${p.id === cur.id ? 'aria-current="true"' : ""}>${avatarHTML(p, "big")}
        <small>${p.id === cur.id ? t("famNow") : t(`look${p.look === "young" ? "Young" : p.look === "junior" ? "Junior" : "Adult"}` as "lookYoung")}</small></button>
      ${p.id !== cur.id ? `<button class="iconbtn kiddel" data-del="${p.id}" aria-label="${t("famRemove")}">${icon("trash")}</button>` : ""}</div>`).join("")}
      ${kids.length < MAX_CHILDREN ? `<button class="kidbtn add" data-add aria-label="${t("famAdd")}"><span class="kidav big addav">${icon("plus")}</span><small>${t("famAdd")}</small></button>` : ""}
    </div>
    <div data-classes></div>
    <div data-online></div>
    <p class="note">${t("famPrivacy")}</p></div>`;
  // classes need an account: the parent joins this child to a class (DECISIONS #82)
  const box = root.querySelector<HTMLElement>("[data-classes]")!;
  if (account.signedIn()) { void classesBlock(box, go); void onlineBlock(root.querySelector<HTMLElement>("[data-online]")!); }
  root.querySelector<HTMLButtonElement>("[data-back]")!.onclick = () => go("#/me");
  root.querySelectorAll<HTMLButtonElement>("[data-kid]").forEach(b => b.onclick = () => { family.switchTo(b.dataset.kid!); go("#/"); });
  root.querySelectorAll<HTMLButtonElement>("[data-del]").forEach(b => b.onclick = async () => {
    if (!(await ask(t("famRemoveConfirm"), { danger: true }))) return;
    // their online play goes with them: friendships, challenges, and unfinished games resigned (DECISIONS #86)
    if (account.signedIn()) await disableOnlineFor(b.dataset.del!);
    family.remove(b.dataset.del!); familyScreen(root, go);
  });
  root.querySelector<HTMLButtonElement>("[data-add]")?.addEventListener("click", () => addChild(root, go));
}

function addChild(root: HTMLElement, go: (h: string) => void) {
  const taken = new Set(family.list().map(p => `${p.avatar}${p.colour}`));
  let avatar: Avatar = AVATARS.find(a => !family.list().some(p => p.avatar === a)) ?? "cat", colour = COLOURS[family.list().length % COLOURS.length], look: Look = "young";
  const render = () => {
    root.innerHTML = `<div class="screen">
      <div class="lessonbar"><button class="iconbtn" data-back aria-label="${t("back")}">${icon("chevronLeft")}</button><h1 class="grow">${t("famAdd")}</h1></div>
      <div class="hero">${avatarHTML({ avatar, colour }, "huge")}</div>
      <h2 class="sec">${t("famPickAnimal")}</h2>
      <div class="avgrid">${AVATARS.map(a => `<button data-av="${a}" aria-pressed="${a === avatar}" aria-label="${a}">${avatarHTML({ avatar: a, colour })}</button>`).join("")}</div>
      <h2 class="sec">${t("famPickColour")}</h2>
      <div class="colgrid">${COLOURS.map(c => `<button data-col="${c}" aria-pressed="${c === colour}" style="--kc:${c}" aria-label="${c}"></button>`).join("")}</div>
      <h2 class="sec">${t("howOld")}</h2>
      <div class="seg" role="group">${(["young", "junior", "adult"] as Look[]).map(l => `<button data-look="${l}" aria-pressed="${l === look}">${t(l === "young" ? "ageYoung" : l === "junior" ? "ageJunior" : "ageAdult")}</button>`).join("")}</div>
      ${taken.has(`${avatar}${colour}`) ? `<p class="note warnnote">${t("famSame")}</p>` : ""}
      <div class="actions"><button class="btn wide" data-save ${taken.has(`${avatar}${colour}`) ? "disabled" : ""}>${t("famAddGo")}</button></div></div>`;
    root.querySelector<HTMLButtonElement>("[data-back]")!.onclick = () => familyScreen(root, go);
    root.querySelectorAll<HTMLButtonElement>("[data-av]").forEach(b => b.onclick = () => { avatar = b.dataset.av as Avatar; render(); });
    root.querySelectorAll<HTMLButtonElement>("[data-col]").forEach(b => b.onclick = () => { colour = b.dataset.col!; render(); });
    root.querySelectorAll<HTMLButtonElement>("[data-look]").forEach(b => b.onclick = () => { look = b.dataset.look as Look; render(); });
    root.querySelector<HTMLButtonElement>("[data-save]")!.onclick = () => { if (family.add(avatar, colour, look)) go("#/"); };
  };
  render();
}
