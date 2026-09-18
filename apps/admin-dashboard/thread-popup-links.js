import {
  fetchThreadObservatory,
  renderThreadObservatory,
  threadName,
} from "./thread-observatory.js";

const dialog = document.querySelector("#record-dialog");
const title = document.querySelector("#dialog-title");
const eyebrow = document.querySelector("#dialog-eyebrow");
const body = document.querySelector("#dialog-body");
const THREAD = /^thr_[A-Za-z0-9._:-]+$/u;
let openThreadId = null;
let openThreadLoad = 0;

function el(tag, className = null, text = null) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== null) node.textContent = text;
  return node;
}

function fact(label, value, className = null) {
  const item = el("div", "thread-person-fact");
  item.append(el("span", "thread-person-label", label), el("strong", className, value ?? "—"));
  return item;
}

async function openThread(threadId) {
  if (!dialog || !body || !THREAD.test(threadId)) return;
  openThreadId = threadId;
  const load = ++openThreadLoad;
  dialog.classList.add("thread-observatory-dialog");
  eyebrow.textContent = "Thread Observatory";
  title.textContent = "Thread";
  body.replaceChildren(el("div", "thread-loading", "Loading Thread…"));
  if (!dialog.open) dialog.showModal();

  try {
    const payload = await fetchThreadObservatory(threadId);
    if (openThreadId !== threadId || load !== openThreadLoad) return;
    const identity = payload.identity ?? {};
    title.textContent = identity.fibreIdentityNumber ?? threadName(identity) ?? "Thread";
    body.replaceChildren(renderThreadObservatory({
      identity,
      threadId,
      memories:payload.memories,
      memoryError:payload.memoryError,
    }));
  } catch (error) {
    const payload = error?.payload ?? null;
    eyebrow.textContent = payload?.existence === "not_admitted" ? "Pre-birth candidate" : "Thread Observatory";
    title.textContent = payload?.existence === "not_admitted" ? "Not admitted to World" : "Thread unavailable";
    body.replaceChildren(
      fact("Thread ID", threadId, "mono"),
      el("div", "error-box", error instanceof Error ? error.message : String(error)),
    );
  }
}

function threadIdFor(node) {
  const explicit = node?.dataset?.threadId;
  if (THREAD.test(explicit ?? "")) return explicit;
  const inspect = /^Inspect (thr_[A-Za-z0-9._:-]+)$/u.exec(node?.title ?? "");
  if (inspect) return inspect[1];
  const exact = node?.textContent?.trim();
  if (THREAD.test(exact ?? "")) return exact;
  const heading = /^Thread (thr_[A-Za-z0-9._:-]+)$/u.exec(exact ?? "");
  return heading?.[1] ?? null;
}

function decorate(root = document) {
  for (const node of root.querySelectorAll?.("span,div,td,strong,h2,button") ?? []) {
    if (node.closest("input,textarea") || node.querySelector("input,textarea")) continue;
    const threadId = threadIdFor(node);
    if (!threadId || (node.children.length > 0 && !node.classList.contains("thread-link"))) continue;
    node.dataset.threadId = threadId;
    node.classList.add("thread-link");
    if (!["BUTTON", "A"].includes(node.tagName)) {
      node.setAttribute("role", "button");
      node.tabIndex = 0;
      node.title = `Inspect ${threadId}`;
    }
  }
  const chain = document.querySelector("#chain-title");
  const chainThread = threadIdFor(chain);
  if (chainThread) {
    chain.dataset.threadId = chainThread;
    chain.classList.add("thread-link");
    chain.setAttribute("role", "button");
    chain.tabIndex = 0;
    chain.title = `Inspect ${chainThread}`;
  }
}

document.addEventListener("click", (event) => {
  const target = event.target.closest?.(".thread-link,[data-thread-id]");
  const threadId = threadIdFor(target);
  if (!threadId) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  void openThread(threadId);
}, true);

document.addEventListener("keydown", (event) => {
  if (!["Enter", " "].includes(event.key)) return;
  const target = event.target.closest?.(".thread-link,[data-thread-id]");
  const threadId = threadIdFor(target);
  if (!threadId || target.tagName === "BUTTON") return;
  event.preventDefault();
  void openThread(threadId);
});

dialog?.addEventListener("close", () => {
  openThreadId = null;
  openThreadLoad += 1;
});

window.addEventListener("fibre:thread-identity-updated", (event) => {
  const threadId = event?.detail?.threadId ?? null;
  if (threadId !== openThreadId || !dialog?.open) return;
  void openThread(threadId);
});

new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (node.nodeType === Node.ELEMENT_NODE) decorate(node);
    }
  }
  decorate();
}).observe(document.body, { childList:true, subtree:true });

decorate();
