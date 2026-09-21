import { renderThreadHealth } from "./thread-repair-ui.js";
import {
  fetchThreadObservatory,
  portraitAsset,
  renderFidSection,
  renderThreadObservatory,
  threadName,
} from "./thread-observatory.js";

let renderedThreadId = null;
let threadPageLoad = 0;
let fidSectionLoad = 0;

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

export async function renderThreadPage(threadId) {
  renderedThreadId = threadId;
  const load = ++threadPageLoad;
  const main = document.querySelector(".main");
  document.querySelector("#record-dialog")?.remove();
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
  copy.append(node("p", "eyebrow", "Thread Observatory"), node("h1", null, "Loading Thread…"), node("p", "lede mono", threadId));
  person.append(portrait, copy);

  const pageActions = node("div", "page-actions");
  const back = node("a", "button-link secondary", "← Threads");
  back.href = "/activity?mode=threads";
  const viewer = node("a", "button-link primary", "Open as visitor ↗");
  const activity = node("a", "button-link secondary", "Activity ↗");
  activity.href = `/activity?kind=thread&value=${encodeURIComponent(threadId)}&limit=100&mode=raw`;
  pageActions.append(back, viewer, activity);
  pageHead.append(person, pageActions);
  main.append(pageHead);

  const host = node("section", "panel thread-observatory-page");
  host.append(node("div", "thread-loading", "Loading Thread Observatory…"));
  main.append(host);

  try {
    const payload = await fetchThreadObservatory(threadId);
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
      image.src = photo.url;
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
      encounterError:payload.encounterError,
      experienceJournalEntries:payload.experienceJournalEntries,
      journal:payload.journal,
      journalError:payload.journalError,
    });
    observatory.querySelector(".thread-person-hero")?.after(healthSection(threadId));
    host.replaceChildren(observatory);
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
