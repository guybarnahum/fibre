import { decorateActionButton } from "./fa-icons.js";

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

function utcDateParts(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return Object.freeze({
    year:date.getUTCFullYear(),
    month:date.getUTCMonth(),
    day:date.getUTCDate(),
  });
}

function ageMonths(birthValue, momentValue) {
  const birth = utcDateParts(birthValue);
  const moment = utcDateParts(momentValue);
  if (birth === null || moment === null) return null;
  let months = (moment.year - birth.year) * 12 + (moment.month - birth.month);
  if (moment.day < birth.day) months -= 1;
  return months < 0 ? null : months;
}

function memoryMoment(memory) {
  return firstText(memory?.subjectPeriod?.startAt, memory?.subjectPeriod?.endAt, memory?.recordedAt);
}

function memoryAgeLabel(memory, birthDate) {
  if (utcDateParts(birthDate) === null) return "Age — · birth date missing";
  if (utcDateParts(memoryMoment(memory)) === null) return "Age — · memory date missing";
  const months = ageMonths(birthDate, memoryMoment(memory));
  if (months === null) return "Age —";
  const years = Math.floor(months / 12);
  const remainder = months % 12;
  if (years === 0) return `Age ${remainder}m`;
  return remainder === 0 ? `Age ${years}` : `Age ${years}y ${remainder}m`;
}

function copyPayload(value) {
  return typeof value === "string" ? value : JSON.stringify(value, null, 2);
}

async function copyToClipboard(value) {
  const payload = copyPayload(value);
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(payload);
    return;
  }
  const textarea = el("textarea");
  textarea.value = payload;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.append(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

function uniqueStrings(...values) {
  return [...new Set(values.flatMap((value) => Array.isArray(value) ? value : []).filter((value) => typeof value === "string" && value.trim() !== ""))];
}

export function threadName(identity) {
  return firstText(identity?.displayName, identity?.world?.thread?.identity?.name);
}

function threadSex(identity) {
  return firstText(identity?.sex, identity?.world?.thread?.identity?.sex);
}

export function mergeObservatoryWorldIdentity(identity = {}, deepWorld = null) {
  const thread = deepWorld?.thread;
  const authoritative = thread?.identity;
  if (!authoritative || typeof authoritative !== "object") {
    return Object.freeze({
      ...identity,
      world:deepWorld ?? identity.world ?? null,
    });
  }

  const worldName = firstText(authoritative.name);
  const finishedWorldName = worldName !== null
    && !["fibre thread","fiber thread"].includes(worldName.toLocaleLowerCase("en-US"))
    ? worldName
    : null;
  const identityVersion = Number.isFinite(identity.version) ? identity.version : null;
  const deepWorldVersion = Number.isFinite(thread.version) ? thread.version : null;
  const deepWorldIsNewer = deepWorldVersion !== null
    && (identityVersion === null || deepWorldVersion > identityVersion);

  if (!deepWorldIsNewer) {
    return Object.freeze({
      ...identity,
      displayName:firstText(identity.displayName, finishedWorldName),
      sex:firstText(identity.sex, authoritative.sex),
      birthDate:firstText(identity.birthDate, authoritative.birthDate),
      birthPlace:firstText(identity.birthPlace, authoritative.birthCity),
      culture:Object.freeze(Array.isArray(identity.culture) ? [...identity.culture] : [...(authoritative.culture ?? [])]),
      languages:Object.freeze(Array.isArray(identity.languages) ? [...identity.languages] : [...(authoritative.languages ?? [])]),
      originOrientation:firstText(identity.originOrientation, authoritative.originOrientation),
      summary:firstText(identity.summary, authoritative.selfDescription),
      lifecycleStatus:firstText(identity.lifecycleStatus, thread.status),
      world:deepWorld,
    });
  }

  return Object.freeze({
    ...identity,
    displayName:finishedWorldName ?? identity.displayName ?? null,
    sex:firstText(authoritative.sex, identity.sex),
    birthDate:firstText(authoritative.birthDate, identity.birthDate),
    birthPlace:firstText(authoritative.birthCity, identity.birthPlace),
    culture:Object.freeze(Array.isArray(authoritative.culture) ? [...authoritative.culture] : [...(identity.culture ?? [])]),
    languages:Object.freeze(Array.isArray(authoritative.languages) ? [...authoritative.languages] : [...(identity.languages ?? [])]),
    originOrientation:firstText(authoritative.originOrientation, identity.originOrientation),
    summary:firstText(authoritative.selfDescription, identity.summary),
    lifecycleStatus:firstText(thread.status, identity.lifecycleStatus),
    version:deepWorldVersion,
    world:deepWorld,
  });
}

export function portraitAsset(identity) {
  const assets = Array.isArray(identity?.assets) ? identity.assets : [];
  return assets.find((asset) => asset?.role === "official_id_photo" && asset?.url)
    ?? assets.find((asset) => asset?.role === "canonical_portrait" && asset?.url)
    ?? assets.find((asset) => asset?.url && String(asset.mediaType ?? "").startsWith("image/"))
    ?? null;
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

function disclosure(label, value, { open = false, prose = false } = {}) {
  const details = el("details", "thread-data-section"); details.open = open;
  const summary = el("summary", "thread-data-summary");
  summary.append(el("span", null, label));
  const copy = el("button", "thread-copy-button");
  copy.type = "button";
  decorateActionButton(copy, {
    icon:"copy",
    label:`Copy ${label}`,
    tooltip:`Copy ${label}`,
    iconOnly:true,
  });
  copy.addEventListener("click", async (event) => {
    event.preventDefault();
    event.stopPropagation();
    try {
      await copyToClipboard(value);
      decorateActionButton(copy, { icon:"copy", label:`Copied ${label}`, tooltip:`Copied ${label}`, iconOnly:true });
    } catch {
      decorateActionButton(copy, { icon:"copy", label:`Copy ${label} failed`, tooltip:`Copy ${label} failed`, iconOnly:true });
    }
    window.setTimeout(() => {
      decorateActionButton(copy, { icon:"copy", label:`Copy ${label}`, tooltip:`Copy ${label}`, iconOnly:true });
    }, 1200);
  });
  summary.append(copy);
  details.append(summary);
  const content = el("div", "thread-data-content");
  if (prose && typeof value === "string") content.append(el("p", "thread-data-prose", value));
  else content.append(dataTree(value));
  details.append(content); return details;
}

function fact(label, value, { mono = false, long = false } = {}) {
  const item = el("div", `thread-person-fact${long ? " long" : ""}`);
  item.append(el("span", "thread-person-label", label), el("strong", mono ? "mono" : null, value ?? "—"));
  return item;
}

function section(titleText, subtitle = null) {
  const wrap = el("section", "thread-person-section");
  const head = el("div", "thread-person-section-head");
  head.append(el("h3", null, titleText));
  if (subtitle) head.append(el("span", null, subtitle));
  wrap.append(head); return wrap;
}

function imageButton(asset, alt, className = "thread-asset-preview") {
  const button = el("button", `${className} thread-image-button`);
  button.type = "button";
  button.dataset.lightboxSrc = asset.url;
  button.dataset.lightboxAlt = alt;
  const image = el("img");
  image.src = asset.url;
  image.loading = "lazy";
  image.alt = alt;
  button.append(image);
  return button;
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

function worldCanonicalAsset(identity) {
  return (identity.assets ?? []).find((asset) => (
    asset?.source === "world_embodiment"
    && asset?.role === "canonical_portrait"
    && String(asset.mediaType ?? "").startsWith("image/")
  )) ?? null;
}

function hero(identity, threadId) {
  const worldIdentity = identity.world?.thread?.identity ?? {};
  const name = threadName(identity);
  const sex = threadSex(identity);
  const image = portraitAsset(identity);
  const admittedPortrait = worldCanonicalAsset(identity);
  const wrap = el("section", "thread-person-hero");
  const portrait = el("div", `thread-person-portrait${image ? " has-image" : ""}`);
  if (image) {
    portrait.append(imageButton(image, `${name ?? "Thread"} portrait`, "thread-person-portrait-button"));
  } else if (admittedPortrait) {
    portrait.append(
      el("span", "thread-person-portrait-mark", "◌"),
      el("strong", null, "Canonical portrait admitted in World"),
      el("small", null, "Image exists, but Thread Presentation has not published it for delivery."),
    );
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
  if (identity.summary) copy.append(el("p", "thread-person-summary", identity.summary));
  copy.append(el("p", "thread-person-id mono", threadId));

  const states = el("div", "thread-person-states");
  states.append(
    el("span", "thread-state good", "● World admitted"),
    el("span", `thread-state ${identity.presentationStatus === "current" ? "good" : "muted"}`, `${identity.presentationStatus === "current" ? "●" : "○"} Presentation ${identity.presentationStatus ?? "unavailable"}`),
  );
  copy.append(states); wrap.append(portrait, copy); return wrap;
}

function identitySection(identity, threadId) {
  const raised = identity.raisedAs ?? {};
  const wrap = section("Identity", "Authoritative World identity");
  const grid = el("div", "thread-identity-table");
  grid.append(
    fact("Name", threadName(identity)),
    fact("FIN", identity.fibreIdentityNumber, { mono:true }),
    fact("Sex", threadSex(identity) ? human(threadSex(identity)) : null),
    fact("Birth date", identity.birthDate),
    fact("Birth place", identity.birthPlace),
    fact("Lifecycle", identity.lifecycleStatus ? human(identity.lifecycleStatus) : null),
    fact("Culture", valueOrNone(identity.culture)),
    fact("Raised languages", valueOrNone(raised.languages)),
    fact("Spoken languages", valueOrNone(identity.languages)),
    fact("Origin", identity.originOrientation ? human(identity.originOrientation) : null),
    fact("Raised cultural context", raised.culturalContext, { long:true }),
    fact("Schooling / community", raised.schoolingOrCommunityContext, { long:true }),
    fact("Thread ID", threadId, { mono:true }),
  );
  wrap.append(grid);
  return wrap;
}

function nowSection(identity) {
  const thread = identity.world?.thread ?? {};
  const current = thread.currentState ?? {};
  const accounts = thread.accounts ?? {};
  const wrap = section("Now");
  const self = current.selfModel ?? thread.identity?.selfDescription ?? identity.summary ?? "No self-model recorded.";
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

function memoryCard(memory, birthDate) {
  const card = el("article", "thread-memory-card");
  const head = el("div", "thread-memory-head");
  head.append(
    el("strong", null, memoryAgeLabel(memory, birthDate)),
    el("span", null, [memory.retentionState, memory.accessibility].filter(Boolean).map(human).join(" · ")),
  );
  card.append(head);
  if (memory.rememberedContent) card.append(el("p", "thread-memory-content", memory.rememberedContent));
  if (memory.rememberedMeaning) {
    const meaning = el("blockquote", "thread-memory-meaning");
    meaning.append(el("span", null, "What it means"), el("p", null, memory.rememberedMeaning));
    card.append(meaning);
  }
  if (Array.isArray(memory.uncertainty) && memory.uncertainty.length) {
    card.append(el("p", "thread-memory-uncertainty", `Uncertainty · ${memory.uncertainty.join(" · ")}`));
  }
  const foot = el("div", "thread-memory-foot");
  foot.append(
    el("span", null, `Salience ${Number.isFinite(memory.salience) ? Math.round(memory.salience * 100) + "%" : "—"}`),
    el("span", null, `Confidence ${Number.isFinite(memory.confidence) ? Math.round(memory.confidence * 100) + "%" : "—"}`),
    el("span", "mono", memory.memoryId ?? "memory"),
  );
  card.append(foot);
  return card;
}

function memoriesSection(memories, birthDate, memoryError = null) {
  const records = Array.isArray(memories) ? memories : [];
  const wrap = section("Memories", records.length ? `${records.length} current autobiographical ${records.length === 1 ? "memory" : "memories"}` : null);
  if (memoryError) {
    wrap.append(el("p", "thread-empty-note", `Memory view unavailable · ${memoryError}`));
    return wrap;
  }
  if (!records.length) {
    wrap.append(el("p", "thread-empty-note", "No current autobiographical memories are recorded."));
    return wrap;
  }

  const ordered = [...records].sort((left, right) => {
    const leftTime = Date.parse(memoryMoment(left) ?? "");
    const rightTime = Date.parse(memoryMoment(right) ?? "");
    if (!Number.isFinite(leftTime) && !Number.isFinite(rightTime)) return String(left.memoryId ?? "").localeCompare(String(right.memoryId ?? ""));
    if (!Number.isFinite(leftTime)) return 1;
    if (!Number.isFinite(rightTime)) return -1;
    return leftTime - rightTime;
  });

  const timeline = el("div", "thread-memory-timeline");
  timeline.setAttribute("aria-label", "Autobiographical memory timeline");
  const track = el("div", "thread-memory-track");
  track.setAttribute("role", "tablist");
  const detail = el("div", "thread-memory-selected");
  detail.setAttribute("role", "tabpanel");
  detail.tabIndex = 0;
  detail.title = "Click the left or right side to browse memories";
  const markers = [];
  let selectedIndex = -1;

  const selectMemory = (index, direction = null) => {
    if (index < 0 || index >= ordered.length || index === selectedIndex) return;
    const movement = direction ?? (selectedIndex < 0 ? null : index > selectedIndex ? "right" : "left");
    markers.forEach((marker, markerIndex) => {
      const selected = markerIndex === index;
      marker.classList.toggle("active", selected);
      marker.setAttribute("aria-selected", selected ? "true" : "false");
      marker.tabIndex = selected ? 0 : -1;
    });
    const card = memoryCard(ordered[index], birthDate);
    if (movement) card.classList.add(movement === "right" ? "slide-from-right" : "slide-from-left");
    detail.replaceChildren(card);
    selectedIndex = index;
    detail.dataset.hasPrevious = index > 0 ? "true" : "false";
    detail.dataset.hasNext = index < ordered.length - 1 ? "true" : "false";
  };

  detail.addEventListener("click", (event) => {
    if (ordered.length < 2 || selectedIndex < 0) return;
    const bounds = detail.getBoundingClientRect();
    const goRight = event.clientX >= bounds.left + bounds.width / 2;
    selectMemory(selectedIndex + (goRight ? 1 : -1), goRight ? "right" : "left");
  });
  detail.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      selectMemory(selectedIndex - 1, "left");
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      selectMemory(selectedIndex + 1, "right");
    }
  });

  ordered.forEach((memory, index) => {
    const marker = el("button", "thread-memory-marker");
    marker.type = "button";
    marker.setAttribute("role", "tab");
    marker.setAttribute("aria-selected", "false");
    marker.tabIndex = -1;
    marker.title = memory.rememberedContent ?? memory.memoryId ?? "Memory";
    marker.append(
      el("span", "thread-memory-dot"),
      el("span", "thread-memory-age", memoryAgeLabel(memory, birthDate)),
    );
    marker.addEventListener("click", () => selectMemory(index));
    markers.push(marker);
    track.append(marker);
  });

  timeline.append(track);
  wrap.append(timeline, detail);
  selectMemory(ordered.length - 1);
  return wrap;
}

function fidSection(identity) {
  const presentation = identity.presentation?.presentation ?? null;
  const card = presentation?.identityCard ?? null;
  const wrap = section("Fibre Identity Card", card ? `Revision ${card.revision ?? "—"} · ${human(card.status ?? "unknown")}` : "Card not issued");
  const assets = Array.isArray(identity.assets) ? identity.assets : [];
  const officialPhotoMediaRef = typeof card?.officialPhotoMediaRef === "string" ? card.officialPhotoMediaRef : null;
  const officialPhoto = assets.find((asset) => asset?.role === "official_id_photo" && asset?.url)
    ?? (officialPhotoMediaRef === null ? null : assets.find((asset) => asset?.mediaId === officialPhotoMediaRef && asset?.url))
    ?? null;

  const visuals = el("div", "thread-fid-visuals");
  const photoPane = el("article", "thread-fid-photo");
  if (officialPhoto) {
    photoPane.append(
      imageButton(officialPhoto, "Official identity photo", "thread-fid-photo-preview"),
      el("strong", null, "Official ID photo"),
    );
  } else {
    photoPane.append(
      el("div", "thread-fid-photo-missing", "No published official ID photo"),
      el("strong", null, "Official ID photo"),
    );
  }
  visuals.append(photoPane);

  const cardPane = el("div", "thread-fid-cards");
  if (card === null) {
    cardPane.append(el("p", "thread-empty-note", "No active Fibre Identity Card is projected for this Thread."));
  } else {
    const refs = [card.frontMediaRef, card.backMediaRef].filter((value) => typeof value === "string");
    const cardAssets = refs.map((mediaId) => assets.find((asset) => asset.mediaId === mediaId && asset.url)).filter(Boolean);
    if (cardAssets.length) {
      const grid = el("div", "thread-fid-grid");
      for (const asset of cardAssets) {
        const side = asset.role === "fibre_identity_card_back" ? "Back" : "Front";
        const pane = el("article", "thread-fid-card");
        pane.append(imageButton(asset, `Fibre Identity Card ${side.toLowerCase()}`, "thread-fid-preview"), el("strong", null, side));
        grid.append(pane);
      }
      cardPane.append(grid);
    } else {
      cardPane.append(el("p", "thread-empty-note", card.credentialVersion === "fibre-identity-card-credential-v0.1"
        ? "Legacy identity credential metadata exists; rendered front/back card media has not been issued."
        : "Identity credential exists, but rendered card media is not currently available to Admin."));
    }
  }
  visuals.append(cardPane);
  wrap.append(visuals);

  if (card !== null) {
    const meta = el("div", "thread-person-facts thread-fid-meta");
    meta.append(
      fact("FIN", identity.fibreIdentityNumber, { mono:true }),
      fact("Credential", card.credentialId, { mono:true }),
      fact("Issued", prettyDate(card.issuedAt)),
      fact("Visibility", card.visibility ? human(card.visibility) : null),
    );
    wrap.append(meta);
  }
  return wrap;
}

function whoSection(identity) {
  const items = loci(identity).map((locus) => locus?.value).filter(Boolean);
  if (!items.length) return null;
  const wrap = section("Who", `${items.length} symbolic ${items.length === 1 ? "locus" : "loci"}`);
  const prose = el("div", "thread-who");
  for (const item of items) prose.append(el("p", null, sentence(item)));
  wrap.append(prose); return wrap;
}

function appearanceSection(identity) {
  const description = phenotype(identity);
  const rule = appearanceRule(identity);
  const sex = threadSex(identity);
  if (!description && !rule && !sex) return null;
  const wrap = section("Appearance");
  if (description) wrap.append(el("p", "thread-appearance-prose", description));
  const grid = el("div", "thread-person-facts");
  grid.append(
    fact("Sex", sex ? human(sex) : "—"),
    fact("Renderer", identity.world?.thread?.identity?.canonicalVisualIdentity?.specification?.model ?? "—"),
  );
  wrap.append(grid);
  if (rule) wrap.append(disclosure("Identity continuity rule", rule, { prose:true }));
  return wrap;
}

function mediaSection(identity) {
  const assets = (Array.isArray(identity?.assets) ? identity.assets : []).filter((asset) => !["official_id_photo","fibre_identity_card_front","fibre_identity_card_back"].includes(asset?.role));
  if (!assets.length) return null;
  const published = assets.filter((asset) => asset?.deliveryStatus === "published").length;
  const admitted = assets.filter((asset) => asset?.deliveryStatus === "world_only").length;
  const subtitle = [published ? `${published} published` : null, admitted ? `${admitted} admitted in World` : null].filter(Boolean).join(" · ");
  const wrap = section("Media", subtitle);
  const grid = el("div", "thread-asset-grid");
  for (const asset of assets) {
    const card = el("article", "thread-asset");
    if (asset.url && String(asset.mediaType ?? "").startsWith("image/")) {
      card.append(imageButton(asset, human(asset.role ?? asset.mediaId ?? "Thread image")));
    }
    const copy = el("div", "thread-asset-copy");
    copy.append(
      el("strong", null, human(asset.role ?? asset.mediaId ?? asset.kind ?? "Media")),
      el("small", null, [asset.kind, asset.mediaType, asset.width && asset.height ? `${asset.width}×${asset.height}` : null].filter(Boolean).join(" · ")),
    );
    if (!asset.url) copy.append(el("span", "thread-asset-link", "Admitted in World · not published by Thread Presentation"));
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
  wrap.append(list, disclosure("Genome provenance", { header:genome.header, mutations:genome.mutations ?? [], genomeDigest:genome.genomeDigest }));
  return wrap;
}

export async function fetchThreadObservatory(threadId) {
  const identityResponse = await fetch(`/api/threads/${encodeURIComponent(threadId)}/identity`, { headers:{ Accept:"application/json" }, cache:"no-store" });
  const payload = await identityResponse.json().catch(() => null);
  if (!identityResponse.ok) {
    const error = new Error(payload?.detail ?? payload?.error ?? `HTTP ${identityResponse.status}`);
    error.payload = payload;
    error.status = identityResponse.status;
    throw error;
  }

  let memories = [];
  let memoryError = null;
  let deepWorld = null;
  try {
    const response = await fetch(`/api/threads/${encodeURIComponent(threadId)}/observatory`, { headers:{ Accept:"application/json" }, cache:"no-store" });
    const observatoryPayload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(observatoryPayload?.detail ?? observatoryPayload?.error?.detail ?? observatoryPayload?.error?.code ?? observatoryPayload?.error ?? `HTTP ${response.status}`);
    const observatory = observatoryPayload?.observatory ?? null;
    if (!observatory || observatory.threadId !== threadId) throw new Error("World Observatory returned mismatched Thread");
    memories = Array.isArray(observatory.memories) ? observatory.memories : [];
    deepWorld = {
      thread:observatory.thread ?? null,
      civilRegistration:observatory.civilRegistration ?? null,
      embodiments:Array.isArray(observatory.embodiments) ? observatory.embodiments : [],
      symbolicGenomes:Array.isArray(observatory.symbolicGenomes) ? observatory.symbolicGenomes : [],
    };
  } catch (error) {
    memoryError = error instanceof Error ? error.message : String(error);
  }
  const identity = mergeObservatoryWorldIdentity(payload.identity ?? {}, deepWorld);
  return Object.freeze({
    ...payload,
    identity,
    memories:Object.freeze(memories),
    memoryError,
  });
}

export function renderThreadObservatory({ identity, threadId, memories = [], memoryError = null } = {}) {
  const view = el("div", "thread-person-view");
  view.append(
    hero(identity, threadId),
    identitySection(identity, threadId),
    fidSection(identity),
    nowSection(identity),
    memoriesSection(memories, firstText(identity.birthDate, identity.world?.thread?.identity?.birthDate), memoryError),
  );
  const who = whoSection(identity); if (who) view.append(who);
  const appearance = appearanceSection(identity); if (appearance) view.append(appearance);
  const media = mediaSection(identity); if (media) view.append(media);
  const dna = dnaSection(identity); if (dna) view.append(dna);

  const records = el("section", "thread-records"); records.append(el("h3", null, "Records"));
  if (identity.world?.civilRegistration) records.append(disclosure("Civil identity & World registration", identity.world.civilRegistration));
  if ((identity.world?.embodiments ?? []).length) records.append(disclosure("Current embodiments", identity.world.embodiments));
  if (identity.world?.thread?.provenance) records.append(disclosure("Technical provenance", { threadId:identity.world.thread.threadId, status:identity.world.thread.status, version:identity.world.thread.version, provenance:identity.world.thread.provenance }));
  if (identity.presentation) records.append(disclosure("Current public Presentation", identity.presentation));
  view.append(records);
  return view;
}
