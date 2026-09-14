const dialog = document.querySelector("#record-dialog");
const title = document.querySelector("#dialog-title");
const eyebrow = document.querySelector("#dialog-eyebrow");
const body = document.querySelector("#dialog-body");
const THREAD = /^thr_[A-Za-z0-9._:-]+$/u;

function detail(label, value, { mono = false, wide = false } = {}) {
  const item = document.createElement("div");
  item.className = `detail${wide ? " detail-wide" : ""}`;
  const name = document.createElement("label"); name.textContent = label;
  const text = document.createElement("div"); text.textContent = value ?? "—";
  if (mono) text.className = "mono";
  item.append(name, text);
  return item;
}

function imageAssets(identity) {
  return (Array.isArray(identity?.assets) ? identity.assets : [])
    .filter((asset) => asset?.url && String(asset.mediaType ?? "").startsWith("image/"));
}

async function openThread(threadId) {
  if (!dialog || !body || !THREAD.test(threadId)) return;
  eyebrow.textContent = "Thread Observatory";
  title.textContent = "Thread";
  body.replaceChildren(detail("Thread ID", threadId, { mono:true, wide:true }), detail("Identity", "Loading…", { wide:true }));
  if (!dialog.open) dialog.showModal();

  try {
    const response = await fetch(`/api/threads/${encodeURIComponent(threadId)}/identity`, {
      headers:{ Accept:"application/json" }, cache:"no-store",
    });
    const payload = await response.json();
    if (!response.ok) {
      eyebrow.textContent = payload.existence === "not_admitted" ? "Pre-birth candidate" : "Thread Observatory";
      title.textContent = payload.existence === "not_admitted" ? "Not admitted to World" : "Thread unavailable";
      const problem = document.createElement("div");
      problem.className = "error-box";
      problem.textContent = payload.detail ?? payload.error ?? `HTTP ${response.status}`;
      body.replaceChildren(detail("Thread ID", threadId, { mono:true, wide:true }), problem);
      return;
    }

    const identity = payload.identity ?? {};
    title.textContent = identity.displayName ?? "Unnamed Thread";
    const visual = identity.visualIdentity ?? {};
    const grid = document.createElement("div"); grid.className = "detail-grid";
    grid.append(
      detail("Name", identity.displayName), detail("FIN", identity.fibreIdentityNumber, { mono:true }),
      detail("Thread ID", identity.threadId ?? threadId, { mono:true, wide:true }),
      detail("World", identity.worldStatus === "admitted" ? "Admitted" : identity.worldStatus),
      detail("Presentation", identity.presentationStatus),
      detail("Birth date", identity.birthDate), detail("Lifecycle", identity.lifecycleStatus),
      detail("Embodiment", visual.embodimentId, { mono:true }),
    );
    body.replaceChildren(grid);

    const assets = imageAssets(identity);
    if (assets.length > 0) {
      const section = document.createElement("section"); section.className = "thread-assets";
      const head = document.createElement("div"); head.className = "thread-assets-head";
      const heading = document.createElement("strong"); heading.textContent = "Public media";
      const count = document.createElement("span"); count.textContent = `${assets.length} ready image${assets.length === 1 ? "" : "s"}`;
      head.append(heading, count);
      const gridAssets = document.createElement("div"); gridAssets.className = "thread-asset-grid";
      for (const asset of assets) {
        const card = document.createElement("a"); card.className = "thread-asset-preview"; card.href = asset.url; card.target = "_blank"; card.rel = "noreferrer";
        const image = document.createElement("img"); image.src = asset.url; image.loading = "lazy"; image.alt = asset.role ?? "Thread image";
        card.append(image); gridAssets.append(card);
      }
      section.append(head, gridAssets); body.append(section);
    }
  } catch (error) {
    const problem = document.createElement("div"); problem.className = "error-box";
    problem.textContent = `Thread identity unavailable: ${error instanceof Error ? error.message : String(error)}`;
    body.replaceChildren(detail("Thread ID", threadId, { mono:true, wide:true }), problem);
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
    if (!threadId || node.children.length > 0 && !node.classList.contains("thread-link")) continue;
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
  if (!['Enter', ' '].includes(event.key)) return;
  const target = event.target.closest?.(".thread-link,[data-thread-id]");
  const threadId = threadIdFor(target);
  if (!threadId || target.tagName === "BUTTON") return;
  event.preventDefault();
  void openThread(threadId);
});

new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) if (node.nodeType === Node.ELEMENT_NODE) decorate(node);
  }
  decorate();
}).observe(document.body, { childList:true, subtree:true });

decorate();
