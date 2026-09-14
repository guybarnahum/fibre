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

function human(value) {
  return String(value ?? "").replace(/([a-z0-9])([A-Z])/gu, "$1 $2").replace(/[_-]+/gu, " ");
}

function scalar(value) {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return null;
}

function dataTree(value, depth = 0) {
  const simple = scalar(value);
  if (simple !== null) {
    const span = document.createElement("span");
    span.className = typeof value === "string" && (value.startsWith("thr_") || value.includes("sha256:")) ? "mono" : "";
    span.textContent = simple;
    return span;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      const empty = document.createElement("span"); empty.textContent = "[]"; empty.className = "mono"; return empty;
    }
    const list = document.createElement("div"); list.className = "thread-data-list";
    value.forEach((item, index) => {
      const row = document.createElement("div"); row.className = "thread-data-row";
      const key = document.createElement("span"); key.className = "thread-data-key mono"; key.textContent = `[${index}]`;
      const val = document.createElement("div"); val.className = "thread-data-value"; val.append(dataTree(item, depth + 1));
      row.append(key, val); list.append(row);
    });
    return list;
  }

  const entries = Object.entries(value ?? {});
  if (entries.length === 0) {
    const empty = document.createElement("span"); empty.textContent = "{}"; empty.className = "mono"; return empty;
  }
  const list = document.createElement("div"); list.className = "thread-data-list";
  for (const [keyName, item] of entries) {
    const row = document.createElement("div"); row.className = "thread-data-row";
    const key = document.createElement("span"); key.className = "thread-data-key"; key.textContent = human(keyName);
    const val = document.createElement("div"); val.className = "thread-data-value"; val.append(dataTree(item, depth + 1));
    row.append(key, val); list.append(row);
  }
  return list;
}

function section(label, value, { open = false } = {}) {
  const details = document.createElement("details"); details.className = "thread-data-section"; details.open = open;
  const summary = document.createElement("summary"); summary.textContent = label;
  const content = document.createElement("div"); content.className = "thread-data-content"; content.append(dataTree(value));
  details.append(summary, content);
  return details;
}

function mediaSection(identity) {
  const assets = Array.isArray(identity?.assets) ? identity.assets : [];
  if (assets.length === 0) return null;
  const wrap = document.createElement("section"); wrap.className = "thread-assets";
  const head = document.createElement("div"); head.className = "thread-assets-head";
  const heading = document.createElement("strong"); heading.textContent = "Public media";
  const count = document.createElement("span"); count.textContent = `${assets.length} ready asset${assets.length === 1 ? "" : "s"}`;
  head.append(heading, count); wrap.append(head);

  const grid = document.createElement("div"); grid.className = "thread-asset-grid";
  for (const asset of assets) {
    const card = document.createElement("article"); card.className = "thread-asset";
    if (asset.url && String(asset.mediaType ?? "").startsWith("image/")) {
      const preview = document.createElement("a"); preview.className = "thread-asset-preview"; preview.href = asset.url; preview.target = "_blank"; preview.rel = "noreferrer";
      const image = document.createElement("img"); image.src = asset.url; image.loading = "lazy"; image.alt = asset.role ?? asset.mediaId ?? "Thread image";
      preview.append(image); card.append(preview);
    }
    const copy = document.createElement("div"); copy.className = "thread-asset-copy";
    const label = document.createElement("strong"); label.textContent = human(asset.role ?? asset.mediaId ?? asset.kind ?? "Media");
    const meta = document.createElement("small"); meta.textContent = [asset.kind, asset.mediaType, asset.width && asset.height ? `${asset.width}×${asset.height}` : null].filter(Boolean).join(" · ");
    copy.append(label, meta);
    if (asset.url) {
      const link = document.createElement("a"); link.className = "thread-asset-link mono"; link.href = asset.url; link.target = "_blank"; link.rel = "noreferrer"; link.textContent = asset.objectRef ?? "Open asset"; copy.append(link);
    }
    card.append(copy); grid.append(card);
  }
  wrap.append(grid);
  return wrap;
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
      const problem = document.createElement("div"); problem.className = "error-box";
      problem.textContent = payload.detail ?? payload.error ?? `HTTP ${response.status}`;
      body.replaceChildren(detail("Thread ID", threadId, { mono:true, wide:true }), problem);
      return;
    }

    const identity = payload.identity ?? {};
    title.textContent = identity.displayName ?? identity.fibreIdentityNumber ?? "Unnamed Thread";
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

    const media = mediaSection(identity); if (media) body.append(media);
    if (identity.world?.thread) body.append(section("Authoritative World Thread", identity.world.thread, { open:true }));
    if (identity.world?.civilRegistration) body.append(section("Civil registration", identity.world.civilRegistration));
    if ((identity.world?.embodiments ?? []).length) body.append(section("Current embodiments", identity.world.embodiments));
    if ((identity.world?.symbolicGenomes ?? []).length) body.append(section("Symbolic genomes", identity.world.symbolicGenomes));
    if (identity.presentation) body.append(section("Current public Presentation", identity.presentation, { open:true }));
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
  if (!["Enter", " "].includes(event.key)) return;
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
