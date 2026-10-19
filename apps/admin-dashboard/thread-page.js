import { useThumbnailFallback } from "./portrait-preview.js";
import { watchAdminLive } from "./admin-live.js";
import { threadObservatoryViewKey } from "./view-invalidation.js";
import { setWaitingContent } from "./fa-icons.js";
import { threadAppearanceSection } from "./thread-appearance-ui.js";
import { renderThreadHealth } from "./thread-repair-ui.js";
import {
  fetchThreadObservatory,
  portraitAsset,
  portraitThumbnailAsset,
  renderFidSection,
  renderThreadObservatory,
  threadName,
} from "./thread-observatory.js";

let renderedThreadId = null;
let threadPageLoad = 0;
let fidSectionLoad = 0;
let threadPageWatchId = null;
let stopThreadPageWatch = null;
let focusedCorrectionThreadId = null;

function ensureThreadPageWatch(threadId) {
  if (threadPageWatchId === threadId && stopThreadPageWatch !== null) return;
  stopThreadPageWatch?.();
  threadPageWatchId = threadId;
  stopThreadPageWatch = watchAdminLive(
    threadObservatoryViewKey(threadId),
    () => renderThreadPage(threadId),
    {
      active:() => (
        renderedThreadId === threadId
        && document.querySelector(".thread-observatory-page")?.isConnected === true
      ),
      reconcileOnSubscribe:false,
    },
  );
}

function node(tag, className = null, text = null) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== null) element.textContent = text;
  return element;
}

function viewerOrigin(environment) {
  return environment === "staging" ? "https://staging.insidefibre.com" : "https://insidefibre.com";
}

function statusOrigin(environment) {
  return environment === "staging" ? "https://status.staging.insidefibre.com" : "https://status.insidefibre.com";
}

function healthSection(threadId) {
  const health = node("section", "thread-person-section thread-repair-section");
  const head = node("div", "thread-person-section-head");
  head.append(node("h3", null, "Thread health"), node("span", null, "not checked"));
  const actions = node("div", "thread-repair-actions");
  const button = node("button", "secondary thread-repair-button", "Check health");
  button.type = "button";
  button.addEventListener("click", () => renderThreadHealth(health, threadId), { once:true });
  actions.append(button);
  health.append(head, actions);
  return health;
}

// Only the current person/identity/maintenance belongs on Thread detail.
// Full histories are explicitly selected in Life & Causes, not scroll-loaded.
function compactThreadTabs(view,{threadId,name}){
  const hero=view.querySelector(":scope > .thread-person-hero");
  const tabs=node("nav","thread-detail-tabs");
  tabs.setAttribute("aria-label","Thread detail sections");
  const panels=new Map(["overview","identity","maintenance"].map(key=>{
    const panel=node("section","thread-detail-panel");
    panel.dataset.threadTab=key;
    panel.id="thread-tab-"+key;
    return [key,panel];
  }));
  for(const section of [...view.children]){
    if(section===hero)continue;
    const title=section.querySelector(":scope > .thread-person-section-head h3")?.textContent;
    const pane=title==="Now"||section.classList.contains("thread-history-link")
      ?"overview":section.classList.contains("thread-repair-section")
        ?"maintenance":"identity";
    panels.get(pane).append(section);
  }
  panels.get("maintenance").append(
    healthSection(threadId),threadAppearanceSection(threadId,name),
  );
  const activate=key=>{
    for(const [name,panel] of panels)panel.hidden=name!==key;
    for(const button of tabs.children){
      const active=button.dataset.tab===key;
      button.classList.toggle("active",active);
      button.setAttribute("aria-selected",String(active));
      button.tabIndex=active?0:-1;
    }
  };
  for(const [key,label] of [
    ["overview","Overview"],["identity","Identity & Body"],
    ["maintenance","Maintenance"],
  ]){
    const button=node("button","thread-detail-tab",label);
    button.type="button";
    button.dataset.tab=key;
    button.setAttribute("role","tab");
    button.setAttribute("aria-controls",panels.get(key).id);
    button.addEventListener("click",()=>activate(key));
    tabs.append(button);
  }
  tabs.setAttribute("role","tablist");
  view.replaceChildren(hero,tabs,...panels.values());
  activate(location.hash==="#correct-official-id-photo"?"identity":"overview");
  return view;
}

export async function renderThreadPage(threadId) {
  const selectedMemory=new URLSearchParams(location.search).get("memory");
  if(selectedMemory){
    location.replace("/life?thread="+encodeURIComponent(threadId)
      +"&memory="+encodeURIComponent(selectedMemory));
    return;
  }
  renderedThreadId = threadId;
  ensureThreadPageWatch(threadId);
  const load = ++threadPageLoad;
  const main = document.querySelector(".main");
  document.querySelector("#record-dialog")?.remove();
  document.querySelector("#thread-image-dialog")?.remove();
  for (const item of document.querySelectorAll(".nav-item")) item.classList.remove("active");

  main.replaceChildren();
  const topbar = node("header", "topbar");
  const crumbs = node("div", "crumbs");
  const home = node("a", "crumb-link", "Threads");
  home.href = "/activity?mode=threads";
  crumbs.append(home, node("span", null, "/"), node("strong", null, "Thread Observatory"));
  const actions = node("div", "topbar-actions");
  const environmentPill = node("span", "environment-pill", "—");
  actions.append(environmentPill, node("span", "admin-pill", "Admin"));
  topbar.append(crumbs, actions);
  main.append(topbar);

  const pageHead = node("section", "page-head thread-page-head");
  const person = node("div", "thread-page-person");
  const portrait = node("div", "thread-page-avatar");
  portrait.append(node("span", "thread-page-avatar-mark", "◎"));
  const copy = node("div");
  copy.append(node("p", "eyebrow", "Thread Observatory"), node("h1", null, "Thread"), node("p", "lede mono", threadId));
  person.append(portrait, copy);

  const pageActions = node("div", "page-actions");
  const back = node("a", "button-link secondary", "← Threads");
  back.href = "/activity?mode=threads";
  const viewer = node("a", "button-link primary", "Open as visitor ↗");
  const life = node("a","button-link secondary","Life & Causes ↗");
  life.href = "/life?thread="+encodeURIComponent(threadId);
  const activity = node("a", "button-link secondary", "Activity ↗");
  activity.href = `/activity?kind=thread&value=${encodeURIComponent(threadId)}&limit=100&mode=raw`;
  pageActions.append(back, viewer, life, activity);
  pageHead.append(person, pageActions);
  main.append(pageHead);

  const host = node("section", "panel thread-observatory-page");
  const waiting = node("div", "thread-loading");
  setWaitingContent(waiting, "Loading Thread Observatory");
  host.append(waiting);
  main.append(host);

  try {
    const payload = await fetchThreadObservatory(threadId,{currentOnly:true});
    if (renderedThreadId !== threadId || load !== threadPageLoad) return;
    environmentPill.textContent = payload.environment;
    const identity = payload.identity ?? {};
    const name = threadName(identity) ?? "Unnamed Thread";
    document.title = `Fibre Admin · ${name}`;
    copy.querySelector("h1").textContent = name;
    viewer.href = `${viewerOrigin(payload.environment)}/meet?thread=${encodeURIComponent(threadId)}`;
    const status = document.querySelector("#status-link");
    if (status) status.href = statusOrigin(payload.environment);

    const photo = portraitAsset(identity);
    if (photo) {
      const button = node("button", "thread-page-avatar-button");
      button.type = "button";
      button.dataset.lightboxSrc = photo.url;
      button.dataset.lightboxAlt = `${name} portrait`;
      const image = node("img");
      image.src = portraitThumbnailAsset(identity)?.url??photo.url;
      if(portraitThumbnailAsset(identity)?.url)useThumbnailFallback(image,{threadId,thumbnailUrl:portraitThumbnailAsset(identity).url,
        fallbackUrl:photo.role==="portrait_thumbnail"?null:photo.url,context:"thread_page"});
      image.alt = `${name} portrait`;
      button.append(image);
      portrait.replaceChildren(button);
      portrait.classList.add("has-image");
    }

    const observatory = renderThreadObservatory({
      identity,
      threadId,
      memories:payload.memories,
      memoryError:payload.memoryError,
      encounterStories:payload.encounterStories,
      livedNow:payload.livedNow,
      socialInteractions:payload.socialInteractions,
      encounterError:payload.encounterError,
      experienceJournalEntries:payload.experienceJournalEntries,
      experienceConsolidation:payload.experienceConsolidation,
      contactOutreach:payload.contactOutreach,
      semanticStates:payload.semanticStates,
      lifeRelations:payload.lifeRelations,
      journal:payload.journal,
      journalError:payload.journalError,
      deferredHistory:true,
    });
    compactThreadTabs(observatory,{threadId,name});
    host.replaceChildren(observatory);
    if (location.hash === "#correct-official-id-photo"
        && focusedCorrectionThreadId !== threadId) {
      const correction = observatory.querySelector("#correct-official-id-photo");
      if (correction) {
        focusedCorrectionThreadId = threadId;
        correction.scrollIntoView({block:"center"});
        correction.focus({preventScroll:true});
      }
    }

  } catch (error) {
    copy.querySelector("h1").textContent = "Thread unavailable";
    host.replaceChildren(node("div", "error-box", `Thread identity unavailable: ${error instanceof Error ? error.message : String(error)}`));
    viewer.removeAttribute("href");
  }
}

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function replaceFidSection(current, identity, threadId, credential = null) {
  const replacement = renderFidSection(identity, threadId);
  if (credential) {
    const status = replacement.querySelector(".thread-repair-actions")?.nextElementSibling;
    if (status) {
      status.hidden = false;
      status.textContent = `Re-issued · Revision ${credential.revision} · ${credential.credentialId}`;
    }
  }
  current.replaceWith(replacement);
}

async function refreshFidSection(threadId, expectedCredential = null, publishedIdentity = null) {
  const load = ++fidSectionLoad;
  const current = document.querySelector(".thread-observatory-page .thread-fid-section");
  if (!current) return;

  if (publishedIdentity?.presentation?.presentation?.identityCard) {
    replaceFidSection(current, publishedIdentity, threadId, expectedCredential);
    return;
  }

  try {
    let payload = null;
    for (let attempt = 0; attempt < 6; attempt += 1) {
      payload = await fetchThreadObservatory(threadId);
      if (renderedThreadId !== threadId || load !== fidSectionLoad || !current.isConnected) return;

      const card = payload.identity?.presentation?.presentation?.identityCard ?? null;
      if (expectedCredential === null
        || (card?.credentialId === expectedCredential.credentialId && card?.revision === expectedCredential.revision)) break;

      await sleep(250);
    }

    if (renderedThreadId !== threadId || load !== fidSectionLoad || !current.isConnected || payload === null) return;
    replaceFidSection(current, payload.identity ?? {}, threadId, expectedCredential);
  } catch (error) {
    if (renderedThreadId !== threadId || load !== fidSectionLoad || !current.isConnected) return;
    const status = current.querySelector(".thread-repair-actions")?.nextElementSibling;
    if (status) {
      status.hidden = false;
      status.textContent = `FIN Card refresh failed: ${error instanceof Error ? error.message : String(error)}`;
    }
  }
}

window.addEventListener("fibre:fid-card-reissued", (event) => {
  const threadId = event?.detail?.threadId ?? null;
  if (threadId === null || threadId !== renderedThreadId) return;
  const credential = event?.detail?.result?.credential ?? null;
  const identity = event?.detail?.identity ?? null;
  void refreshFidSection(threadId, credential, identity);
});

window.addEventListener("fibre:thread-identity-updated", (event) => {
  const threadId = event?.detail?.threadId ?? null;
  if (threadId === null || threadId !== renderedThreadId) return;
  void renderThreadPage(threadId);
});

window.addEventListener("fibre:thread-updated", (event) => {
  const threadId = event?.detail?.threadId ?? null;
  if (threadId === null || threadId !== renderedThreadId) return;
  void renderThreadPage(threadId);
});
