const dialog = document.querySelector("#record-dialog");
const title = document.querySelector("#dialog-title");
const eyebrow = document.querySelector("#dialog-eyebrow");
const body = document.querySelector("#dialog-body");
const THREAD = /^thr_[A-Za-z0-9._:-]+$/u;

function el(tag, className = null, text = null) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== null) node.textContent = text;
  return node;
}

function human(value) {
  return String(value ?? "").replace(/([a-z0-9])([A-Z])/gu, "$1 $2").replace(/[_-]+/gu, " ");
}

function sentence(value) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  return `${text[0].toUpperCase()}${text.slice(1)}${/[.!?]$/u.test(text) ? "" : "."}`;
}

function prettyDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat([], { month:"short", day:"numeric", year:"numeric" }).format(date);
}

function firstText(...values) {
  return values.find((value) => typeof value === "string" && value.trim() !== "")?.trim() ?? null;
}

function uniqueStrings(...values) {
  return [...new Set(values.flatMap((value) => Array.isArray(value) ? value : []).filter((value) => typeof value === "string" && value.trim() !== ""))];
}

function threadName(identity) {
  return firstText(
    identity?.displayName,
    identity?.world?.thread?.identity?.name,
    identity?.presentation?.subject?.displayName,
  );
}

function threadSex(identity) {
  return firstText(
    identity?.world?.thread?.identity?.sex,
    identity?.presentation?.subject?.sex,
    identity?.presentation?.identity?.sex,
  );
}

function memoryRefs(identity) {
  const thread = identity?.world?.thread ?? {};
  return uniqueStrings(
    thread.memoryRefs,
    thread.currentState?.memoryRefs,
    thread.identity?.memoryRefs,
    identity?.presentation?.memoryRefs,
    identity?.presentation?.memories?.refs,
  );
}

function valueOrNone(value, none = "None recorded") {
  return Array.isArray(value) ? (value.length ? value.join(" · ") : none) : (value ?? none);
}

function scalar(value) {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return null;
}

function dataTree(value) {
  const simple = scalar(value);
  if (simple !== null) {
    return el("span", typeof value === "string" && (value.startsWith("thr_") || value.includes("sha256:")) ? "mono" : null, simple);
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return el("span", null, "None");
    const list = el("div", "thread-data-list");
    value.forEach((item, index) => {
      const row = el("div", "thread-data-row");
      const val = el("div", "thread-data-value"); val.append(dataTree(item));
      row.append(el("span", "thread-data-key mono", `[${index}]`), val); list.append(row);
    });
    return list;
  }
  const entries = Object.entries(value ?? {});
  if (entries.length === 0) return el("span", null, "None");
  const list = el("div", "thread-data-list");
  for (const [keyName, item] of entries) {
    const row = el("div", "thread-data-row");
    const val = el("div", "thread-data-value"); val.append(dataTree(item));
    row.append(el("span", "thread-data-key", human(keyName)), val); list.append(row);
  }
  return list;
}

function disclosure(label, value, { open = false } = {}) {
  const details = el("details", "thread-data-section"); details.open = open;
  details.append(el("summary", null, label));
  const content = el("div", "thread-data-content"); content.append(dataTree(value));
  details.append(content); return details;
}

function fact(label, value, className = null) {
  const item = el("div", "thread-person-fact");
  item.append(el("span", "thread-person-label", label), el("strong", className, value ?? "—"));
  return item;
}

function section(titleText, subtitle = null) {
  const wrap = el("section", "thread-person-section");
  const head = el("div", "thread-person-section-head");
  head.append(el("h3", null, titleText));
  if (subtitle) head.append(el("span", null, subtitle));
  wrap.append(head); return wrap;
}

function firstGenome(identity) {
  return Array.isArray(identity?.world?.symbolicGenomes) ? identity.world.symbolicGenomes[0] ?? null : null;
}

function loci(identity) {
  return Array.isArray(firstGenome(identity)?.loci) ? firstGenome(identity).loci : [];
}

function phenotype(identity) {
  return identity?.world?.thread?.identity?.canonicalVisualIdentity?.specification?.subject?.description
    ?? identity?.world?.thread?.identity?.canonicalVisualIdentity?.subject?.description
    ?? null;
}

function appearanceRule(identity) {
  return identity?.world?.thread?.identity?.canonicalVisualIdentity?.specification?.description
    ?? identity?.world?.thread?.identity?.canonicalVisualIdentity?.description
    ?? null;
}

function primaryImage(identity) {
  return (identity.assets ?? []).find((asset) => asset?.url && String(asset.mediaType ?? "").startsWith("image/")) ?? null;
}

function hero(identity, threadId) {
  const worldThread = identity.world?.thread ?? {};
  const worldIdentity = worldThread.identity ?? {};
  const name = threadName(identity);
  const sex = threadSex(identity);
  const image = primaryImage(identity);
  const wrap = el("section", "thread-person-hero");
  const portrait = el("div", `thread-person-portrait${image ? " has-image" : ""}`);
  if (image) {
    const img = el("img"); img.src = image.url; img.alt = name ?? "Thread portrait"; img.loading = "lazy"; portrait.append(img);
  } else {
    portrait.append(
      el("span", "thread-person-portrait-mark", "◌"),
      el("strong", null, "Canonical image not materialized"),
      el("small", null, phenotype(identity) ? "Visual identity is defined in World" : "No canonical visual identity available"),
    );
  }

  const copy = el("div", "thread-person-hero-copy");
  copy.append(
    el("p", "thread-person-fin mono", identity.fibreIdentityNumber ?? "No FIN"),
    el("h2", null, name ?? "Fibre Thread"),
  );
  const traits = [sex, identity.lifecycleStatus, worldIdentity.originOrientation]
    .filter(Boolean).map((item) => human(item));
  if (traits.length) copy.append(el("p", "thread-person-meta", traits.join(" · ")));

  const identityFacts = el("div", "thread-person-facts hero-facts");
  identityFacts.append(
    fact("Name", name ?? "—"),
    fact("Sex", sex ? human(sex) : "—"),
  );
  copy.append(identityFacts, el("p", "thread-person-id mono", threadId));

  const states = el("div", "thread-person-states");
  states.append(
    el("span", "thread-state good", "● World admitted"),
    el("span", `thread-state ${identity.presentationStatus === "current" ? "good" : "muted"}`, `${identity.presentationStatus === "current" ? "●" : "○"} Presentation ${identity.presentationStatus ?? "unavailable"}`),
  );
  copy.append(states); wrap.append(portrait, copy); return wrap;
}

function whoSection(identity) {
  const items = loci(identity).map((locus) => locus?.value).filter(Boolean);
  if (!items.length) return null;
  const wrap = section("Who", `${items.length} symbolic ${items.length === 1 ? "locus" : "loci"}`);
  const prose = el("div", "thread-who");
  for (const item of items) prose.append(el("p", null, sentence(item)));
  wrap.append(prose); return wrap;
}

function nowSection(identity) {
  const thread = identity.world?.thread ?? {};
  const current = thread.currentState ?? {};
  const accounts = thread.accounts ?? {};
  const wrap = section("Now");
  const self = current.selfModel ?? thread.identity?.selfDescription ?? "No self-model recorded.";
  wrap.append(el("blockquote", "thread-self-model", `“${self}”`));
  const grid = el("div", "thread-person-facts four");
  grid.append(
    fact("Feelings", valueOrNone(current.feelings)),
    fact("Needs", valueOrNone(current.needs)),
    fact("Intentions", valueOrNone(current.unresolvedIntentions, "None unresolved")),
    fact("Resources", `FC ${accounts.fibreCredits ?? 0} · $${accounts.usdAvailable ?? 0} · ${accounts.modelTokensAvailable ?? 0} tokens`),
  );
  wrap.append(grid); return wrap;
}

function lifeSection(identity) {
  const thread = identity.world?.thread ?? {};
  const memories = memoryRefs(identity);
  const relations = uniqueStrings(thread.relationshipRefs, thread.currentState?.relationshipRefs);
  const createdAt = thread.provenance?.createdAt ?? null;
  const wrap = section("Life", memories.length ? `${memories.length} memory ${memories.length === 1 ? "reference" : "references"}` : null);
  const summary = el("div", "thread-life-summary");
  summary.append(
    fact("Memories", memories.length ? `${memories.length} referenced` : "None referenced"),
    fact("Relationships", relations.length ? `${relations.length} recorded` : "None recorded"),
    fact("Created", prettyDate(createdAt) ?? "—"),
    fact("Version", thread.version ?? "—"),
  );
  wrap.append(summary);
  if (memories.length) wrap.append(disclosure("Memory references", memories, { open:true }));
  return wrap;
}

function appearanceSection(identity) {
  const description = phenotype(identity);
  const rule = appearanceRule(identity);
  const sex = threadSex(identity);
  if (!description && !rule && !sex) return null;
  const wrap = section("Appearance", identity.assets?.length ? `${identity.assets.length} ready media` : "Canonical image not materialized");
  if (description) wrap.append(el("p", "thread-appearance-prose", description));
  const grid = el("div", "thread-person-facts");
  grid.append(
    fact("Sex", sex ? human(sex) : "—"),
    fact("Renderer", identity.world?.thread?.identity?.canonicalVisualIdentity?.specification?.model ?? "—"),
  );
  wrap.append(grid);
  if (rule) wrap.append(disclosure("Identity continuity rule", rule));
  return wrap;
}

function mediaSection(identity) {
  const assets = Array.isArray(identity?.assets) ? identity.assets : [];
  if (!assets.length) return null;
  const wrap = section("Media", `${assets.length} ready ${assets.length === 1 ? "asset" : "assets"}`);
  const grid = el("div", "thread-asset-grid");
  for (const asset of assets) {
    const card = el("article", "thread-asset");
    if (asset.url && String(asset.mediaType ?? "").startsWith("image/")) {
      const preview = el("a", "thread-asset-preview"); preview.href = asset.url; preview.target = "_blank"; preview.rel = "noreferrer";
      const image = el("img"); image.src = asset.url; image.loading = "lazy"; image.alt = asset.role ?? asset.mediaId ?? "Thread image"; preview.append(image); card.append(preview);
    }
    const copy = el("div", "thread-asset-copy");
    copy.append(el("strong", null, human(asset.role ?? asset.mediaId ?? asset.kind ?? "Media")), el("small", null, [asset.kind, asset.mediaType, asset.width && asset.height ? `${asset.width}×${asset.height}` : null].filter(Boolean).join(" · ")));
    if (asset.url) { const link = el("a", "thread-asset-link mono", asset.objectRef ?? "Open asset"); link.href = asset.url; link.target = "_blank"; link.rel = "noreferrer"; copy.append(link); }
    card.append(copy); grid.append(card);
  }
  wrap.append(grid); return wrap;
}

function dnaSection(identity) {
  const genome = firstGenome(identity);
  if (!genome) return null;
  const genomeLoci = Array.isArray(genome.loci) ? genome.loci : [];
  const wrap = section("DNA", `${human(genome.header?.originKind ?? "unknown origin")} · ${genomeLoci.length} loci`);
  const list = el("div", "thread-dna-list");
  genomeLoci.forEach((locus, index) => {
    const item = el("div", "thread-dna-locus");
    item.append(el("span", "thread-dna-number mono", String(locus.ordinal ?? index + 1).padStart(2, "0")), el("p", null, sentence(locus.value)));
    list.append(item);
  });
  wrap.append(list);
  wrap.append(disclosure("Genome provenance", { header:genome.header, mutations:genome.mutations ?? [], genomeDigest:genome.genomeDigest }));
  return wrap;
}

async function openThread(threadId) {
  if (!dialog || !body || !THREAD.test(threadId)) return;
  dialog.classList.add("thread-observatory-dialog");
  eyebrow.textContent = "Thread Observatory"; title.textContent = "Thread";
  body.replaceChildren(el("div", "thread-loading", "Loading Thread…"));
  if (!dialog.open) dialog.showModal();

  try {
    const response = await fetch(`/api/threads/${encodeURIComponent(threadId)}/identity`, { headers:{ Accept:"application/json" }, cache:"no-store" });
    const payload = await response.json();
    if (!response.ok) {
      eyebrow.textContent = payload.existence === "not_admitted" ? "Pre-birth candidate" : "Thread Observatory";
      title.textContent = payload.existence === "not_admitted" ? "Not admitted to World" : "Thread unavailable";
      body.replaceChildren(fact("Thread ID", threadId, "mono"), el("div", "error-box", payload.detail ?? payload.error ?? `HTTP ${response.status}`)); return;
    }

    const identity = payload.identity ?? {};
    title.textContent = identity.fibreIdentityNumber ?? threadName(identity) ?? "Thread";
    const view = el("div", "thread-person-view");
    view.append(hero(identity, threadId));
    const media = mediaSection(identity); if (media) view.append(media);
    const who = whoSection(identity); if (who) view.append(who);
    view.append(nowSection(identity), lifeSection(identity));
    const appearance = appearanceSection(identity); if (appearance) view.append(appearance);
    const dna = dnaSection(identity); if (dna) view.append(dna);

    const records = el("section", "thread-records"); records.append(el("h3", null, "Records"));
    if (identity.world?.civilRegistration) records.append(disclosure("Civil identity & World registration", identity.world.civilRegistration));
    if ((identity.world?.embodiments ?? []).length) records.append(disclosure("Current embodiments", identity.world.embodiments));
    if (identity.world?.thread?.provenance) records.append(disclosure("Technical provenance", { threadId:identity.world.thread.threadId, status:identity.world.thread.status, version:identity.world.thread.version, provenance:identity.world.thread.provenance }));
    if (identity.presentation) records.append(disclosure("Current public Presentation", identity.presentation));
    view.append(records); body.replaceChildren(view);
  } catch (error) {
    body.replaceChildren(el("div", "error-box", `Thread identity unavailable: ${error instanceof Error ? error.message : String(error)}`));
  }
}

function threadIdFor(node) {
  const explicit = node?.dataset?.threadId;
  if (THREAD.test(explicit ?? "")) return explicit;
  const inspect = /^Inspect (thr_[A-Za-z0-9._:-]+)$/u.exec(node?.title ?? ""); if (inspect) return inspect[1];
  const exact = node?.textContent?.trim(); if (THREAD.test(exact ?? "")) return exact;
  const heading = /^Thread (thr_[A-Za-z0-9._:-]+)$/u.exec(exact ?? ""); return heading?.[1] ?? null;
}

function decorate(root = document) {
  for (const node of root.querySelectorAll?.("span,div,td,strong,h2,button") ?? []) {
    if (node.closest("input,textarea") || node.querySelector("input,textarea")) continue;
    const threadId = threadIdFor(node);
    if (!threadId || node.children.length > 0 && !node.classList.contains("thread-link")) continue;
    node.dataset.threadId = threadId; node.classList.add("thread-link");
    if (!["BUTTON", "A"].includes(node.tagName)) { node.setAttribute("role", "button"); node.tabIndex = 0; node.title = `Inspect ${threadId}`; }
  }
  const chain = document.querySelector("#chain-title");
  const chainThread = threadIdFor(chain);
  if (chainThread) { chain.dataset.threadId = chainThread; chain.classList.add("thread-link"); chain.setAttribute("role", "button"); chain.tabIndex = 0; chain.title = `Inspect ${chainThread}`; }
}

document.addEventListener("click", (event) => {
  const target = event.target.closest?.(".thread-link,[data-thread-id]");
  const threadId = threadIdFor(target); if (!threadId) return;
  event.preventDefault(); event.stopImmediatePropagation(); void openThread(threadId);
}, true);

document.addEventListener("keydown", (event) => {
  if (!["Enter", " "].includes(event.key)) return;
  const target = event.target.closest?.(".thread-link,[data-thread-id]");
  const threadId = threadIdFor(target); if (!threadId || target.tagName === "BUTTON") return;
  event.preventDefault(); void openThread(threadId);
});

new MutationObserver((mutations) => {
  for (const mutation of mutations) for (const node of mutation.addedNodes) if (node.nodeType === Node.ELEMENT_NODE) decorate(node);
  decorate();
}).observe(document.body, { childList:true, subtree:true });

decorate();
