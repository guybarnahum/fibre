import { useThumbnailFallback } from "./portrait-preview.js";
import { bindCopyAction } from "./copy-action.js";
import { humanAppearanceKey, parseCanonicalAppearancePresentation } from "./appearance-description.mjs";
import { decorateActionButton, faIcon, setWaitingContent } from "./fa-icons.js";
import { createFibreFinCard } from "./fibre-fin-card.js";
import { packJournalPages, threadJournalPresentationModel } from "./thread-journal-presentation.mjs";
import { buildEncounterEpisodes, buildSocialAnalytics, buildThreadWorldEvents } from "./thread-encounter-model.mjs";
import { openThreadActionDialog } from "./thread-action-dialog.js";
import { currentThreadPlace, threadLocationText } from "./thread-person-ui.js";

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

function readableGenesisPlace(name){
  const match=/^place_modern_[0-9a-f]{12}_(home|school|transit|learning|commerce)$/u.exec(name??"");
  return match?{
    home:"Home",school:"School",transit:"Transit setting",
    learning:"Learning place",commerce:"Shops / commerce",
  }[match[1]]:name;
}

export function threadSituationPlace(situation,livedNow=null){
  const location=situation?.location;
  if(!location)return null;
  const name=(ref)=>{
    const shared=(livedNow?.worldPlaces??[]).find((place)=>place.ref===ref);
    const episode=(livedNow?.placeEpisodes??[]).find((place)=>
      `per:${place.episodeId}:${place.revision}`===ref);
    return readableGenesisPlace(shared?.displayName??episode?.place?.displayName??ref);
  };
  if(location.kind==="place")return {
    kind:"place",placeRef:location.placeRef,
    name:name(location.placeRef),
  };
  if(location.kind==="transit")return {
    kind:"transit",fromPlaceRef:location.fromPlaceRef,
    toPlaceRef:location.toPlaceRef,
    name:`In transit · ${name(location.fromPlaceRef)} → ${name(location.toPlaceRef)}`,
  };
  return null;
}

export function threadObservatoryDebugSnapshot({
  threadId,identity,livedNow=null,encounterStories=[],
  experienceConsolidation=null,experienceJournalEntries=[],
  memories=[],semanticStates=[],lifeRelations=[],
  encounterError=null,memoryError=null,
}={}){
  const current=livedNow?.currentSituation??null;
  const episodes=buildEncounterEpisodes({
    encounterStories,experienceConsolidation,experienceJournalEntries,
    memories,semanticStates,lifeRelations,
  });
  return {
    threadId,
    name:threadName(identity),
    current:current===null?null:{
      situationId:current.situationId,
      establishedAt:current.establishedAt,
      activity:current.activity,
      wakefulness:current.wakefulness??"unknown",
      meetingPlace:threadSituationPlace(current,livedNow),
      currentPlace:observatoryCurrentPlace(livedNow),
      timeZone:livedNow?.worldContext?.timeZone??null,
    },
    worldEvents:buildThreadWorldEvents({livedNow,encounterStories})
      .slice(0,16).map((event)=>({
        kind:event.kind,at:event.occurredAt,
        ...(event.kind==="scene"?{
          situationId:event.situationId,activity:event.activity,
          place:threadSituationPlace({location:event.location},livedNow),
        }:{
          encounterId:event.encounterId,text:event.text,attention:event.attention,
        }),
      })),
    encounterEpisodes:episodes.slice(0,5).map((episode)=>({
      startedAt:episode.startedAt,
      meetingPlace:threadSituationPlace(episode.stories[0]?.situation,livedNow),
      conversation:episode.stories.flatMap((story)=>(story.story?.beats??[])
        .filter((beat)=>beat.kind==="utterance"||beat.kind==="occurrence")
        .map((beat)=>({
          speaker:beat.actorThreadId===null?"Visitor":beat.actorThreadId===threadId?"Thread":beat.actorThreadId,
          text:beat.text,
        }))).slice(0,28),
      experiences:episode.experiences.map((e)=>e.experienceText).filter(Boolean).slice(0,12),
      consolidation:episode.consolidation.status,
      afterthoughts:episode.afterthoughts.slice(0,6),
      journalEntries:episode.journals.map((entry)=>entry.entryText??entry.text)
        .filter(Boolean).slice(0,8),
      memories:episode.memories.map((memory)=>({
        content:memory.rememberedContent??null,
        meaning:memory.rememberedMeaning??null,
      })).slice(0,6),
      memoryOutcomes:episode.consolidation.records
        .map((record)=>record.complete?.payload?.memoryOutcome??record.decision?.payload?.memory?.outcome)
        .filter(Boolean),
    })),
    latestWorldJournalEntries:[...experienceJournalEntries]
      .sort((a,b)=>String(b.writtenAt??"").localeCompare(String(a.writtenAt??"")))
      .slice(0,6).map((entry)=>({writtenAt:entry.writtenAt,text:entry.entryText})),
    currentMemories:[...memories].slice(0,6)
      .map((memory)=>({content:memory.rememberedContent,meaning:memory.rememberedMeaning})),
    ...(encounterError?{encounterError}:{}),
    ...(memoryError?{memoryError}:{}),
  };
}

function observatoryCopyAction({
  identity,threadId,memories,memoryError,livedNow,encounterStories,
  experienceConsolidation,experienceJournalEntries,semanticStates,lifeRelations,encounterError,
}) {
  const actions=el("div","thread-observatory-actions");
  const button=el("button","secondary thread-observatory-copy");
  button.type="button";
  bindCopyAction(button,{
    value:()=>threadObservatoryDebugSnapshot({
      identity,threadId,memories,memoryError,livedNow,encounterStories,
      experienceConsolidation,experienceJournalEntries,semanticStates,lifeRelations,encounterError,
    }),
    label:"Copy debug snapshot",
    tooltip:"Copy debug snapshot",
    copiedLabel:"Copied debug snapshot",
    failedLabel:"Copy debug snapshot failed",
    iconOnly:true,
  });
  actions.append(button);
  return actions;
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

export function portraitThumbnailAsset(identity) {
  return (identity?.assets??[]).find((asset)=>asset?.role==="portrait_thumbnail"&&asset?.url)??null;
}

export function portraitAsset(identity) {
  const assets = Array.isArray(identity?.assets) ? identity.assets : [];
  return assets.find((asset) => asset?.role === "canonical_portrait" && asset?.url)
    ?? assets.find((asset) => asset?.role === "official_id_photo" && asset?.url)
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
  bindCopyAction(copy,{
    value,
    label:`Copy ${label}`,
    tooltip:`Copy ${label}`,
    copiedLabel:`Copied ${label}`,
    failedLabel:`Copy ${label} failed`,
    iconOnly:true,
    preventDefault:true,
    stopPropagation:true,
  });
  summary.append(copy);
  details.append(summary);
  const content = el("div", "thread-data-content");
  if (prose && typeof value === "string") content.append(el("p", "thread-data-prose", value));
  else content.append(dataTree(value));
  details.append(content); return details;
}

function fact(label, value, { mono = false, long = false, wide = false } = {}) {
  const item = el("div", `thread-person-fact${long ? " long" : ""}${wide ? " wide" : ""}`);
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

function imageButton(asset, alt, className = "thread-asset-preview", previewUrl = asset.url, threadId = null) {
  const button = el("button", `${className} thread-image-button`);
  button.type = "button";
  button.dataset.lightboxSrc = asset.url;
  button.dataset.lightboxAlt = alt;
  const image = el("img");
  image.src = previewUrl;
  if(previewUrl!==asset.url||asset.role==="portrait_thumbnail")useThumbnailFallback(image,{threadId,thumbnailUrl:previewUrl,
    fallbackUrl:previewUrl===asset.url?null:asset.url,context:"observatory"});
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

function currentVisualSpecification(identity) {
  const embodiment=(identity?.world?.embodiments??[]).find((entry)=>(
    entry?.kind==="portrait"&&entry?.visibility==="public"
  ));
  return embodiment?.specification
    ?? identity?.world?.thread?.identity?.canonicalVisualIdentity?.specification
    ?? identity?.world?.thread?.identity?.canonicalVisualIdentity
    ?? null;
}

function phenotype(identity) {
  return currentVisualSpecification(identity)?.subject?.description ?? null;
}

function appearanceRule(identity) {
  return currentVisualSpecification(identity)?.description ?? null;
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
    portrait.append(imageButton(image, `${name ?? "Thread"} portrait`, "thread-person-portrait-button",portraitThumbnailAsset(identity)?.url??image.url,threadId));
  } else if (admittedPortrait) {
    portrait.append(
      el("span", "thread-person-portrait-mark", "◌"),
      el("strong", null, "Canonical portrait admitted in World"),
      el("small", null, "Image exists, but Thread Presentation has not published it for delivery."),
    );
  } else {
    portrait.append(
      faIcon("id-card", "thread-person-portrait-icon"),
      el("strong", null, "Canonical image not materialized"),
      el("small", null, phenotype(identity) ? "Visual identity is defined in World; its image has not been materialized yet." : "No canonical visual identity available"),
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

export function observatoryCurrentPlace(livedNow){
  const privatePlace=livedNow?.privatelyKnownCurrentPlace;
  const located=currentThreadPlace(livedNow?.currentLocation)
    ??currentThreadPlace(privatePlace?.publicGranularity==="city"
      ?{...privatePlace,kind:"place"}:null);
  if(located===null){
    return livedNow?.currentSituation?.location?.kind==="transit"
      ?"In transit · location unresolved"
      :livedNow?.currentSituation?"Location unresolved":"Not established";
  }
  const city=threadLocationText(located);
  const situation=livedNow?.currentSituation;
  const publicVenue=situation?.location?.kind==="place"
    ?(livedNow?.worldPlaces??[]).find(place=>
      place.ref===situation.location.placeRef
      &&place.authority==="world-public-place-v1")??null
    :null;
  return publicVenue?.displayName
    ?publicVenue.displayName+" · "+city:city;
}

function identitySection(identity, threadId, livedNow=null) {
  const raised = identity.raisedAs ?? {};
  const wrap = section("Identity", "Authoritative World identity");
  const grid = el("div", "thread-identity-table");
  grid.append(
    fact("Name", threadName(identity)),
    fact("FIN", identity.fibreIdentityNumber, { mono:true }),
    fact("Sex", threadSex(identity) ? human(threadSex(identity)) : null),
    fact("Birth date", identity.birthDate),
    fact("Birth place", identity.birthPlace),
    fact("Current place",observatoryCurrentPlace(livedNow)),
    fact("Lifecycle", identity.lifecycleStatus ? human(identity.lifecycleStatus) : null),
    fact("Genesis origin", identity.originOrientation ? human(identity.originOrientation) : null),
    fact("Thread ID", threadId, { mono:true }),
    fact("Culture", valueOrNone(identity.culture), { wide:true }),
    fact("Raised cultural context", raised.culturalContext, { long:true }),
    fact("Schooling / community", raised.schoolingOrCommunityContext, { long:true }),
    fact("Raised languages", valueOrNone(raised.languages), { wide:true }),
    fact("Spoken languages", valueOrNone(identity.languages), { wide:true }),
  );
  wrap.append(grid);
  return wrap;
}

function threadWorldClock(livedNow) {
  const situation = livedNow?.currentSituation;
  const zone = livedNow?.worldContext?.timeZone;
  if (situation?.phase !== "at_place" || situation.location?.kind !== "place"
    || typeof zone !== "string") return null;
  try {
    const time = new Intl.DateTimeFormat(undefined, {
      timeZone:zone, year:"numeric", month:"short", day:"numeric",
      hour:"numeric", minute:"2-digit", timeZoneName:"short",
    }).format(new Date());
    return `${time} · ${zone}`;
  } catch { return null; }
}

function nowSection(identity, livedNow = null) {
  const thread = identity.world?.thread ?? {};
  const current = thread.currentState ?? {};
  const accounts = thread.accounts ?? {};
  const wrap = section("Now");
  const self = current.selfModel ?? thread.identity?.selfDescription ?? identity.summary ?? "No self-model recorded.";
  wrap.append(el("blockquote", "thread-self-model", `“${self}”`));
  const clock = threadWorldClock(livedNow);
  wrap.append(el("p", "thread-world-clock", clock
    ? `Thread local time (World context) · ${clock}`
    : "Thread local time unavailable for this enacted place"));
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
  wrap.id="thread-memories";
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


function appendJournalBlocks(host, lines) {
  let paragraph = [];
  let list = null;
  const flushParagraph = () => {
    const text = paragraph.join(" ").trim();
    paragraph = [];
    if (text) host.append(el("p", "thread-journal-prose", text));
  };
  const flushList = () => {
    if (list !== null) {
      host.append(list);
      list = null;
    }
  };
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }
    if (line.startsWith("> ")) {
      flushParagraph();
      flushList();
      host.append(el("blockquote", "thread-journal-quote", line.slice(2)));
      continue;
    }
    if (/^#{3,6}\s/u.test(line)) {
      flushParagraph();
      flushList();
      host.append(el("h5", "thread-journal-subhead", line.replace(/^#{3,6}\s+/u, "")));
      continue;
    }
    if (/^[-*]\s/u.test(line)) {
      flushParagraph();
      if (list === null) list = el("ul", "thread-journal-list");
      list.append(el("li", null, line.slice(2)));
      continue;
    }
    flushList();
    paragraph.push(line);
  }
  flushParagraph();
  flushList();
}

function journalSection(journal, journalError = null, authorityEntries = []) {
  const model = threadJournalPresentationModel(journal, authorityEntries);
  const { profile, entries, authorityCount } = model;
  const wrap = section(
    "Journal",
    profile
      ? `${entries.length} private ${entries.length === 1 ? "entry" : "entries"} · ${authorityCount} World ${authorityCount === 1 ? "record" : "records"} · not memory`
      : null,
  );
  wrap.classList.add("thread-journal-section");
  wrap.id="thread-journal";
  if (journalError) {
    wrap.append(el("p", "thread-empty-note", `Journal unavailable · ${journalError}`));
    return wrap;
  }
  if (journal === null || profile === null) {
    wrap.append(el(
      "p",
      "thread-empty-note",
      authorityCount > 0
        ? "World journal authority exists; no private book projection is available yet."
        : "This Thread has not started a journal yet.",
    ));
    if (authorityCount > 0) wrap.append(disclosure("World journal-entry authority", model.authorityEntries));
    return wrap;
  }

  const book = el("div", `thread-journal-book journal-${profile.presentationStyle ?? "classic"}`);
  const cover = el("header", "thread-journal-cover");
  cover.append(
    el("p", "thread-journal-kicker", "Private journal"),
    el("h4", null, profile.title),
    el("p", "thread-journal-aesthetic", profile.aestheticNote),
  );
  book.append(cover);

  const viewport = el("div", "thread-journal-viewport");
  const pages = el("div", "thread-journal-pages");
  const measure = el("div", "thread-journal-measure");
  const articles = entries.map((entry) => {
    const article = el("article", "thread-journal-entry");
    const time = el("time", "thread-journal-date");
    const date = new Date(entry.heading.replace(" · ", "T"));
    time.textContent = Number.isNaN(date.getTime())
      ? entry.heading
      : new Intl.DateTimeFormat(undefined, {
          weekday:"short",month:"short",day:"numeric",year:"numeric",
          hour:"numeric",minute:"2-digit",
        }).format(date);
    if (!Number.isNaN(date.getTime())) time.dateTime=date.toISOString();
    article.append(time);
    appendJournalBlocks(article, entry.lines);
    return article;
  });
  viewport.append(pages);
  if (articles.length === 0) {
    pages.append(el("p", "thread-empty-note", "The journal exists, but it has no entries yet."));
    book.append(viewport);
  } else {
    // One page can contain several complete reflections; an oversized one scrolls.
    const pager = el("nav", "thread-journal-pager");
    pager.setAttribute("aria-label", "Journal pages");
    const indicator = el("span", "thread-journal-page-count");
    indicator.setAttribute("aria-live", "polite");
    let groups=[];
    let current=0;
    let initialized=false;
    const button = (label, description, destination) => {
      const control=el("button", "thread-journal-page-button", label);
      control.type="button";
      control.title=description;
      control.setAttribute("aria-label", description);
      control.addEventListener("click", () => {
        current=destination();
        showPage();
      });
      pager.append(control);
      return control;
    };
    const first=button("«", "First page", () => 0);
    const previous=button("‹", "Previous page", () => current-1);
    pager.append(indicator);
    const next=button("›", "Next page", () => current+1);
    const last=button("»", "Last page", () => groups.length-1);
    function showPage(){
      const count=groups.length;
      current=Math.max(0,Math.min(count-1,current));
      pages.replaceChildren(...groups[current].map((index) => articles[index]));
      viewport.scrollTop=0;
      indicator.textContent=`Page ${current+1} of ${count}`;
      first.disabled=previous.disabled=current===0;
      next.disabled=last.disabled=current===count-1;
    }
    function repaginate(){
      if (!viewport.isConnected || viewport.clientHeight===0) return;
      const wasLast=initialized && current===groups.length-1;
      const selected=groups[current]?.[0] ?? articles.length-1;
      measure.style.width=`${viewport.clientWidth}px`;
      measure.replaceChildren(...articles);
      const heights=articles.map((article) => article.getBoundingClientRect().height);
      groups=packJournalPages(heights,viewport.clientHeight);
      current=!initialized || wasLast ? groups.length-1
        : Math.max(0,groups.findIndex((group) => group.includes(selected)));
      initialized=true;
      showPage();
    }
    measure.append(...articles);
    book.append(pager,viewport,measure);
    if(typeof ResizeObserver==="function"){
      new ResizeObserver(repaginate).observe(viewport);
    }else{
      window.addEventListener("resize",repaginate);
    }
    requestAnimationFrame(repaginate);
  }
  wrap.append(
    book,
    el("p", "thread-journal-note", "This book presents the Thread's admitted private reflections, not World history or autobiographical memory."),
  );
  if (authorityCount > 0) wrap.append(disclosure("World journal-entry authority", model.authorityEntries));
  return wrap;
}


function socialMetric(label,value,note){
  const card=el("article","thread-social-metric");
  card.append(
    el("span","thread-encounter-kicker",label),
    el("strong",null,value),
    el("p",null,note),
  );
  return card;
}

function laterContactSection(contactOutreach){
  const attempts=Array.isArray(contactOutreach?.attempts)?contactOutreach.attempts:[];
  const sent=Array.isArray(contactOutreach?.sent)?contactOutreach.sent:[];
  const sentById=new Map(sent.map((message)=>[message.messageId,message]));
  const wrap=section(
    "Later contact",
    attempts.length
      ? String(attempts.length)+" delayed "+(attempts.length===1?"consideration":"considerations")
      : null,
  );

  if(attempts.length===0){
    wrap.append(el(
      "p",
      "thread-empty-note",
      "No delayed private thought has become a later contact consideration.",
    ));
    return wrap;
  }

  for(const attempt of attempts){
    const decision=attempt.decision?.payload??null;
    const complete=attempt.complete?.payload??null;
    const expression=attempt.expression?.payload??null;
    const outcome=complete?.outcome??(decision===null?"pending":"considering");
    const card=el("article","thread-contact-card");
    const head=el("header","thread-contact-head");
    head.append(
      el("strong",null,prettyDate(attempt.startedAt)??attempt.startedAt??"Contact"),
      el("span","thread-encounter-status "+outcome,human(outcome)),
    );
    card.append(head);

    const recipient=complete?.recipientPartyId??decision?.recipientPartyId??null;
    if(recipient!==null){
      card.append(fact("Recipient route",recipient,{mono:true}));
    }

    const message=complete?.messageId===null||complete?.messageId===undefined
      ?null
      :sentById.get(complete.messageId)??null;
    if(message!==null){
      const outward=el("div","thread-contact-message");
      outward.append(
        el("span","thread-encounter-kicker","Outward message"),
        el("p",null,message.messageText),
      );
      card.append(outward);
    }else if(outcome==="kept_private"){
      card.append(el(
        "p",
        "thread-empty-note",
        "The Thread considered contact and chose to keep the thought private.",
      ));
    }else if(outcome==="route_unavailable"){
      card.append(el(
        "p",
        "thread-empty-note",
        "The Thread chose contact, but that route was no longer available before delivery.",
      ));
    }

    if(attempt.decision!==null){
      card.append(disclosure("Private contact decision",attempt.decision));
    }
    if(attempt.expression!==null){
      card.append(disclosure("Outward expression authority",attempt.expression));
    }
    card.append(disclosure("Contact completion",attempt.complete));
    wrap.append(card);
  }

  wrap.append(el(
    "p",
    "thread-journal-note",
    "Routing capability says World can deliver to a party; it does not prove autobiographical recognition. Private contact judgment, outward wording and delivery remain separate authorities.",
  ));
  return wrap;
}

function socialAnalyticsSection({
  threadId,
  encounterStories,
  socialInteractions,
  experienceConsolidation,
  experienceJournalEntries,
  memories,
  semanticStates,
  lifeRelations,
}={}){
  const wrap=section("Social life","derived analytics · never cognition authority");
  const controls=el("div","thread-social-window");
  const metrics=el("div","thread-social-grid");
  const explanation=el(
    "p",
    "thread-journal-note",
    "No sociability score is computed. These are bounded observational measures over recorded social history; anonymous visitors are not treated as distinct known people, and none of these values feeds Thread cognition.",
  );

  const render=(windowDays)=>{
    const model=buildSocialAnalytics({
      threadId,
      encounterStories,
      socialInteractions,
      experienceConsolidation,
      experienceJournalEntries,
      memories,
      semanticStates,
      lifeRelations,
      windowDays,
    });
    for(const button of controls.querySelectorAll("button")){
      button.classList.toggle("active",Number(button.dataset.days)===windowDays);
    }
    metrics.replaceChildren(
      socialMetric(
        "Exposure",
        String(model.exposure.episodes),
        String(model.exposure.noticedEpisodes)+" noticed · "+String(model.exposure.anonymousVisitorEpisodes)+" anonymous-visitor episodes",
      ),
      socialMetric(
        "Initiative",
        String(model.initiative.openedEpisodes),
        String(model.initiative.outgoingOvertures)+" explicit Thread→Thread overtures",
      ),
      socialMetric(
        "Responsiveness",
        String(model.responsiveness.answeredEpisodes)+"/"+String(model.responsiveness.externallyOpenedEpisodes),
        String(model.responsiveness.incomingOvertures)+" incoming · "+String(model.responsiveness.accepted)+" accepted · "+String(model.responsiveness.declined)+" declined · "+String(model.responsiveness.deferred)+" deferred",
      ),
      socialMetric(
        "Breadth",
        String(model.breadth.knownCounterparties),
        "known counterparties · "+String(model.breadth.anonymousVisitorEpisodes)+" anonymous-visitor episodes",
      ),
      socialMetric(
        "Reciprocity",
        String(model.reciprocity.bidirectionalCounterparties)+"/"+String(model.reciprocity.directionalCounterparties),
        "known counterparties with both incoming and outgoing overtures",
      ),
      socialMetric(
        "Depth",
        String(model.depth.continuedEpisodes),
        "continued episodes · max "+String(model.depth.maxStoryCount)+" Encounter Stories in one episode",
      ),
      socialMetric(
        "Continuity",
        String(model.continuity.recurringCounterparties),
        "known counterparties appearing in 2+ distinct social episodes",
      ),
      socialMetric(
        "Consequence",
        String(model.consequence.episodes),
        [
          String(model.consequence.memoryEpisodes)+" memory",
          String(model.consequence.journalEpisodes)+" journal",
          String(model.consequence.afterthoughtEpisodes)+" afterthought",
          String(model.consequence.semanticEpisodes)+" semantic",
          String(model.consequence.relationshipEpisodes)+" relationship",
        ].join(" · "),
      ),
    );
  };

  for(const days of [7,30,90]){
    const button=el("button","secondary",days+"d");
    button.type="button";
    button.dataset.days=String(days);
    button.addEventListener("click",()=>render(days));
    controls.append(button);
  }
  wrap.append(controls,metrics,explanation);
  render(30);
  return wrap;
}

function situationLabel(situation,livedNow=null){
  const activity=situation?.activity??null;
  const place=threadSituationPlace(situation,livedNow);
  return [activity,place?.name].filter(Boolean).join(" · ")||"World scene";
}

function lifeRecordLinks(){
  const nav=el("nav","thread-life-nav");
  nav.setAttribute("aria-label","Thread life and history");
  for(const [label,target] of [
    ["World events","thread-world-events"],
    ["Encounters","thread-encounters"],
    ["Journal","thread-journal"],
    ["Memories","thread-memories"],
  ]){
    const link=el("a","thread-life-link",label);
    link.href="#"+target;
    nav.append(link);
  }
  return nav;
}

function worldEventsSection({livedNow=null,encounterStories=[],encounterError=null}={}){
  const events=buildThreadWorldEvents({livedNow,encounterStories});
  const wrap=section("World events",events.length
    ?`${events.length} enacted scene / objective occurrence records · newest first`
    :null);
  wrap.id="thread-world-events";
  if(encounterError){
    wrap.append(el("p","thread-empty-note","World history unavailable · "+encounterError));
    return wrap;
  }
  if(events.length===0){
    wrap.append(el("p","thread-empty-note","No enacted scene or World occurrence history is available."));
    return wrap;
  }
  const list=el("div","thread-encounter-stream");
  for(const event of events){
    const row=el("article","thread-encounter-beat");
    const label=event.kind==="scene"?"Enacted situation":"World occurrence";
    row.append(el("strong",null,label+" · "+(event.occurredAt??"time unknown")));
    if(event.kind==="scene"){
      row.append(el("p",null,situationLabel({
        activity:event.activity,
        location:event.location,
      },livedNow)));
      row.append(el("small","mono",event.situationId));
    }else{
      row.append(el("p",null,event.text??"An occurrence was admitted without prose."));
      row.append(el("small",null,
        "Attention: "+(event.attention==="noticed"?"noticed"
          :event.attention==="not_noticed"?"not noticed"
            :"not established")+" · "+event.encounterId));
    }
    list.append(row);
  }
  wrap.append(list,el("p","thread-journal-note",
    "Only enacted situations and admitted objective occurrences appear here. An event is not automatically noticed, journaled, or remembered. Outward conversation and its personal aftermath remain in Encounter episodes, Journal, and Memories."));
  return wrap;
}

function episodeSpeaker(beat,threadId,name){
  if(beat.actorThreadId===null)return "Visitor";
  if(beat.actorThreadId===threadId)return name??"This Thread";
  return beat.actorThreadId??"World";
}

function encounterEpisodeSection({
  identity,
  threadId,
  encounterStories,
  encounterError=null,
  experienceConsolidation=null,
  experienceJournalEntries=[],
  memories=[],
  semanticStates=[],
  lifeRelations=[],
  livedNow=null,
}={}){
  const episodes=buildEncounterEpisodes({
    encounterStories,
    experienceConsolidation,
    experienceJournalEntries,
    memories,
    semanticStates,
    lifeRelations,
  });
  const wrap=section(
    "Encounter episodes",
    episodes.length?(String(episodes.length)+" derived "+(episodes.length===1?"episode":"episodes")+" · objective history → private consequence"):null,
  );
  wrap.id="thread-encounters";
  if(encounterError){
    wrap.append(el("p","thread-empty-note","Encounter view unavailable · "+encounterError));
    return wrap;
  }
  if(episodes.length===0){
    wrap.append(el("p","thread-empty-note","No Encounter Stories are recorded for this Thread."));
    return wrap;
  }

  const name=threadName(identity);
  for(const episode of episodes){
    const article=el("article","thread-encounter-episode");
    const head=el("header","thread-encounter-episode-head");
    const firstStory=episode.stories[0];
    const firstBeat=firstStory?.story?.beats?.[0]?.text??"Encounter";
    const heading=el("div");
    heading.append(
      el("strong",null,prettyDate(episode.startedAt)??episode.startedAt??"Encounter"),
      el("p",null,firstBeat),
    );
    head.append(
      heading,
      el("span","thread-encounter-status "+episode.consolidation.status,human(episode.consolidation.status)),
    );
    article.append(head);

    const scene=el("div","thread-encounter-scene");
    const distinctSituations=[];
    const seenSituations=new Set();
    for(const story of episode.stories){
      const situation=story.situation??null;
      const id=situation?.situationId??null;
      if(id!==null&&!seenSituations.has(id)){
        seenSituations.add(id);
        distinctSituations.push(situation);
      }
    }
    scene.append(el("span","thread-encounter-kicker","World"));
    if(distinctSituations.length===0){
      scene.append(el("p",null,"Historical World scene unavailable."));
    }else{
      for(const situation of distinctSituations){
        scene.append(el("p",null,situationLabel(situation,livedNow)));
      }
    }
    article.append(scene);

    const stream=el("div","thread-encounter-stream");
    stream.append(el("span","thread-encounter-kicker","Outward encounter"));
    for(const story of episode.stories){
      for(const beat of story.story?.beats??[]){
        const row=el("div","thread-encounter-beat beat-"+(beat.kind??"event"));
        row.append(
          el("strong",null,episodeSpeaker(beat,threadId,name)),
          el("p",null,beat.text??""),
        );
        if(beat.completion==="interrupted"){
          row.append(el("span","thread-encounter-interrupted","interrupted"));
        }
        stream.append(row);
      }
    }
    article.append(stream);

    const causal=el("div","thread-encounter-causal");
    const experienceBlock=el("div","thread-encounter-causal-step");
    experienceBlock.append(
      el("span","thread-encounter-kicker","This Thread's experience"),
      el("strong",null,episode.experiences.length
        ?String(episode.experiences.length)+" noticed "+(episode.experiences.length===1?"experience":"experiences")
        :"No noticed experience"),
    );
    for(const experience of episode.experiences){
      if(experience.experienceText){
        experienceBlock.append(el("p",null,experience.experienceText));
      }
    }

    const consequenceBlock=el("div","thread-encounter-causal-step");
    consequenceBlock.append(
      el("span","thread-encounter-kicker","Consolidation / consequence"),
      el("strong",null,human(episode.consolidation.status)),
    );
    const consequenceBits=[
      episode.journals.length?String(episode.journals.length)+" journal "+(episode.journals.length===1?"entry":"entries"):null,
      episode.memories.length?String(episode.memories.length)+" retained "+(episode.memories.length===1?"memory":"memories"):null,
      episode.afterthoughts.length?String(episode.afterthoughts.length)+" delayed "+(episode.afterthoughts.length===1?"thought":"thoughts"):null,
      episode.semanticStates.length?String(episode.semanticStates.length)+" semantic consequence":null,
      episode.lifeRelations.length?String(episode.lifeRelations.length)+" relationship consequence":null,
    ].filter(Boolean);
    consequenceBlock.append(el(
      "p",
      null,
      consequenceBits.length?consequenceBits.join(" · "):"No durable Journal, Memory, or delayed thought linked yet.",
    ));
    for(const thought of episode.afterthoughts){
      consequenceBlock.append(el("p","thread-encounter-afterthought",human(thought.kind)+" · "+thought.text));
    }
    causal.append(experienceBlock,consequenceBlock);
    article.append(causal);

    article.append(disclosure("Objective Encounter Story records",episode.stories));
    if(episode.consolidation.records.length){
      article.append(disclosure("Consolidation authority",episode.consolidation.records));
    }
    if(episode.journals.length)article.append(disclosure("Linked Journal authority",episode.journals));
    if(episode.memories.length)article.append(disclosure("Linked autobiographical memory",episode.memories));
    if(episode.semanticStates.length)article.append(disclosure("Linked semantic-state consequence",episode.semanticStates));
    if(episode.lifeRelations.length)article.append(disclosure("Linked relationship consequence",episode.lifeRelations));
    wrap.append(article);
  }

  wrap.append(el(
    "p",
    "thread-journal-note",
    "Encounter Episode is an Observatory projection derived from Encounter Story continuation. Encounter Story, Thread Experience, consolidation, Journal and autobiographical Memory remain separate authorities.",
  ));
  return wrap;
}

export function identityWithFidPublication(identity, result) {
  const snapshot = result?.presentation?.publication?.snapshot ?? null;
  if (!snapshot?.presentation || !Array.isArray(snapshot?.media?.assets)) return identity;

  const publishedAssets = snapshot.media.assets
    .filter((asset) => asset?.status === "ready" && typeof asset.locator === "string" && asset.locator !== "")
    .map((asset) => ({
      ...asset,
      objectRef:asset.locator,
      url:`/api/thread-assets/${encodeURIComponent(asset.locator)}`,
      source:"current_public_presentation",
      deliveryStatus:"published",
    }));
  const preserved = (Array.isArray(identity?.assets) ? identity.assets : [])
    .filter((asset) => asset?.source !== "current_public_presentation");

  return Object.freeze({
    ...identity,
    assets:Object.freeze([...publishedAssets, ...preserved]),
    presentation:structuredClone(snapshot),
  });
}

function fidReissueKey() {
  return `admin_fid_reissue_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function reissueFidCard(threadId, { idempotencyKey = fidReissueKey() } = {}) {
  const response = await fetch(`/api/threads/${encodeURIComponent(threadId)}/fid/reissue`, {
    method:"POST",
    headers:{ Accept:"application/json", "Content-Type":"application/json" },
    body:JSON.stringify({ idempotencyKey }),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.detail ?? payload?.error ?? `HTTP ${response.status}`);
  return payload;
}

export async function resumeFidReissue(threadId, {
  idempotencyKey,
  initialResult,
  wait = (ms) => new Promise((resolve) => globalThis.setTimeout(resolve, ms)),
  maxAttempts = 120,
} = {}) {
  if (typeof idempotencyKey !== "string" || idempotencyKey.trim() === "") {
    throw new TypeError("FID reissue continuation requires idempotencyKey");
  }
  if (!Number.isSafeInteger(maxAttempts) || maxAttempts < 1) {
    throw new TypeError("FID reissue continuation maxAttempts must be a positive integer");
  }

  let result = initialResult ?? await reissueFidCard(threadId, { idempotencyKey });
  let delayMs = 500;
  for (let attempt = 0; result?.state === "derivation_requested" && attempt < maxAttempts; attempt += 1) {
    await wait(delayMs);
    result = await reissueFidCard(threadId, { idempotencyKey });
    delayMs = Math.min(5_000, Math.round(delayMs * 1.6));
  }
  return result;
}

function fidPhotoCorrectionKey(){
  return `fid_photo_correction_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`;
}

async function fidPhotoCorrectionRequest(threadId,correctionId,method="GET",action=""){
  const response=await fetch(
    `/api/threads/${encodeURIComponent(threadId)}/fid/photo-corrections/${encodeURIComponent(correctionId)}${action}`,
    {method,headers:{Accept:"application/json"}},
  );
  const result=await response.json().catch(()=>null);
  if(!response.ok)throw new Error(result?.error?.detail??result?.detail??`HTTP ${response.status}`);
  return result;
}

async function waitForFidPhotoCorrection(threadId,correctionId){
  for(let attempt=0;attempt<40;attempt+=1){
    const result=await fidPhotoCorrectionRequest(threadId,correctionId);
    if(result.state==="ready"||result.state==="approved")return result;
    await new Promise(resolve=>setTimeout(resolve,3000));
  }
  throw new Error("Photo is still processing; no new generation was requested");
}

export function renderFidSection(identity, threadId) {
  const presentation = identity.presentation?.presentation ?? null;
  const card = presentation?.identityCard ?? null;
  const wrap = section("Fibre Identity Card", card ? `Revision ${card.revision ?? "—"} · ${human(card.status ?? "unknown")}` : "Card not issued");
  wrap.classList.add("thread-fid-section");
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
    const front = typeof card.frontMediaRef === "string"
      ? assets.find((asset) => asset.mediaId === card.frontMediaRef && asset.url) ?? null
      : null;
    const back = typeof card.backMediaRef === "string"
      ? assets.find((asset) => asset.mediaId === card.backMediaRef && asset.url) ?? null
      : null;
    const descriptor = assets.find((asset) => asset.role === "fibre_identity_card"
      && asset.kind === "document" && asset.url) ?? null;

    if (front && back) {
      cardPane.append(createFibreFinCard({
        front,
        back,
        descriptor,
        label:`Fibre Identity Card revision ${card.revision ?? ""}`.trim(),
      }));
    } else {
      cardPane.append(el("p", "thread-empty-note", card.credentialVersion === "fibre-identity-card-credential-v0.1"
        ? "Legacy identity credential metadata exists; rendered front/back card media has not been issued."
        : "Identity credential exists, but rendered card media is not currently available to Admin."));
    }
  }
  visuals.append(cardPane);
  wrap.append(visuals);

  const actionStatus = el("p", "thread-empty-note");
  actionStatus.hidden = true;
  const actions = el("div", "thread-repair-actions");
  const reissue = el("button", "secondary thread-repair-button");
  reissue.type = "button";
  decorateActionButton(reissue, {
    icon:"id-card",
    label:"Re-issue FIN Card",
    tooltip:"Cut a new FIN Card from the current authoritative Thread identity",
  });
  reissue.addEventListener("click", () => {
    openThreadActionDialog({
      threadId,
      threadName:threadName(identity),
      label:"Re-issue FIN Card",
      eyebrow:"Fibre Identity Card",
      description:"Cut a new FIN Card from the current authoritative Thread identity. The FIN and Thread identity do not change; the previous card remains in history.",
      run:async () => {
        const idempotencyKey = fidReissueKey();
        const result = await reissueFidCard(threadId, { idempotencyKey });
        const credential = result?.credential ?? null;
        actionStatus.hidden = false;
        if (credential) {
          actionStatus.textContent = `Re-issued · Revision ${credential.revision} · ${credential.credentialId}`;
        } else if (result?.state === "derivation_requested") {
          setWaitingContent(actionStatus, "Reissue pending · official ID photo is being prepared");
        } else {
          actionStatus.textContent = `Reissue · ${human(result?.state ?? "accepted")}`;
        }

        const publish = (completed) => window.dispatchEvent(new CustomEvent("fibre:fid-card-reissued", {
          detail:{
            threadId,
            result:completed,
            identity:identityWithFidPublication(identity, completed),
          },
        }));

        if (result?.state !== "derivation_requested") {
          publish(result);
          return;
        }

        reissue.disabled = true;
        void resumeFidReissue(threadId, {
          idempotencyKey,
          initialResult:result,
        }).then((completed) => {
          const completedCredential = completed?.credential ?? null;
          if (completed?.state === "active" && completedCredential !== null) {
            if (actionStatus.isConnected) {
              actionStatus.hidden = false;
              actionStatus.textContent = `Re-issued · Revision ${completedCredential.revision} · ${completedCredential.credentialId}`;
            }
            publish(completed);
            return;
          }

          if (actionStatus.isConnected) {
            actionStatus.hidden = false;
            if (completed?.state === "derivation_requested") {
              setWaitingContent(actionStatus, "Reissue pending · official ID photo is still being prepared");
            } else {
              actionStatus.textContent = `Reissue · ${human(completed?.state ?? "not completed")}`;
            }
            reissue.disabled = false;
          }
        }).catch((error) => {
          if (!actionStatus.isConnected) return;
          actionStatus.hidden = false;
          actionStatus.textContent = `FIN Card reissue failed: ${error instanceof Error ? error.message : String(error)}`;
          reissue.disabled = false;
        });
      },
    });
  });
  actions.append(reissue);

  const correction=el("button","secondary thread-repair-button");
  correction.type="button";
  decorateActionButton(correction,{
    icon:"image",
    label:"Correct Official ID Photo",
    tooltip:"Create and review one new OpenAI photo from the canonical portrait before reissuing",
  });
  const review=el("div","thread-fid-visuals");
  let pendingCorrectionId=null;
  correction.addEventListener("click",()=>{
    openThreadActionDialog({
      threadId,threadName:threadName(identity),
      label:"Generate corrected ID photo",
      eyebrow:"Fibre visual identity",
      description:"Generate one OpenAI candidate from the existing canonical portrait. The current card remains active until you review and approve the image.",
      run:async()=>{
        const correctionId=pendingCorrectionId??fidPhotoCorrectionKey();
        pendingCorrectionId=correctionId;
        await fidPhotoCorrectionRequest(threadId,correctionId,"POST");
        correction.disabled=true;
        actionStatus.hidden=false;
        setWaitingContent(actionStatus,"Preparing corrected ID photograph");
        void waitForFidPhotoCorrection(threadId,correctionId).then(()=>{
          actionStatus.textContent="Review the new photograph against the Thread's canonical likeness before approving.";
          const prefix=`/api/threads/${encodeURIComponent(threadId)}/fid/photo-corrections/${encodeURIComponent(correctionId)}`;
          const previewUrl=`${prefix}/preview`;
          const canonicalPane=el("article","thread-fid-photo");
          canonicalPane.append(
            imageButton({url:`${prefix}/canonical`},"Canonical portrait","thread-fid-photo-preview"),
            el("strong",null,"Canonical identity (source)"),
          );
          const candidatePane=el("article","thread-fid-photo");
          candidatePane.append(
            imageButton({url:previewUrl},"Corrected Official ID photograph","thread-fid-photo-preview"),
            el("strong",null,"Proposed replacement photograph"),
          );
          const approve=el("button","primary thread-repair-button","Approve photo & reissue card");
          approve.type="button";
          const discard=el("button","secondary thread-repair-button","Discard candidate");
          discard.type="button";
          discard.addEventListener("click",()=>{
            review.replaceChildren();
            pendingCorrectionId=null;
            actionStatus.textContent="Candidate discarded. Existing FID Card remains unchanged.";
            correction.disabled=false;
          });
          approve.addEventListener("click",()=>{
            openThreadActionDialog({
              threadId,threadName:threadName(identity),
              label:"Approve photo & reissue card",
              eyebrow:"Fibre Identity Card",
              description:"Approve the displayed photograph as Vítor's corrected FID image and replace his card. The FIN, canonical identity and previous card history remain unchanged.",
              run:async()=>{
                await fidPhotoCorrectionRequest(threadId,correctionId,"POST","/approve");
                let result=await reissueFidCard(threadId,{idempotencyKey:correctionId});
                if(result.state==="derivation_requested")result=await resumeFidReissue(threadId,{
                  idempotencyKey:correctionId,initialResult:result,
                });
                if(result.state!=="active")throw new Error(`FID correction did not activate: ${result.state}`);
                actionStatus.textContent=`Corrected FID Card · revision ${result.credential?.revision??"?"}`;
                review.replaceChildren();
                pendingCorrectionId=null;
                window.dispatchEvent(new CustomEvent("fibre:fid-card-reissued",{
                  detail:{threadId,result,identity:identityWithFidPublication(identity,result)},
                }));
              },
            });
          });
          review.replaceChildren(canonicalPane,candidatePane,approve,discard);
        }).catch(error=>{
          actionStatus.textContent=`Photo correction: ${error.message}`;
          correction.disabled=false;
        });
      },
    });
  });
  actions.append(correction);
  wrap.append(actions, actionStatus, review);

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

function appearanceGroupTitle(value) {
  return ({
    "face and midface":"Face & midface",
    "Eye and orbital anatomy":"Eyes & orbit",
    "Nasal and perioral anatomy":"Nose & mouth",
    "body structure":"Body structure",
    "surface phenotype — pigmentation and hair":"Pigmentation & hair",
    "Reference grooming":"Grooming",
    "Reference state":"Reference state",
    "Additional precision":"Additional precision",
  })[value] ?? value;
}

function appearanceLayer(titleText,layer,{open=false}={}) {
  const details=el("details","thread-appearance-layer");
  details.open=open;
  const summary=el("summary","thread-appearance-layer-summary");
  summary.append(
    el("strong",null,titleText),
    el("span",null,layer.groups.reduce((count,group)=>count+group.rows.length,0)+" traits"),
  );
  details.append(summary);

  const body=el("div","thread-appearance-layer-body");
  for(const group of layer.groups){
    const block=el("section","thread-appearance-trait-group");
    block.append(el("h4",null,appearanceGroupTitle(group.title)));
    const rows=el("div","thread-appearance-trait-rows");
    for(const row of group.rows){
      const item=el("div","thread-appearance-trait-row");
      item.append(
        el("span","thread-appearance-trait-key",humanAppearanceKey(row.key)),
        el("strong","thread-appearance-trait-value",row.value??"—"),
      );
      if(row.coordinate){
        const coordinate=el("span","thread-appearance-coordinate mono",row.coordinate.value);
        if(row.coordinate.meaning)coordinate.title=row.coordinate.meaning;
        item.append(coordinate);
      }else{
        item.append(el("span","thread-appearance-coordinate muted",""));
      }
      rows.append(item);
    }
    block.append(rows);
    body.append(block);
  }
  for(const note of layer.notes){
    body.append(el("p","thread-appearance-guidance",note+"."));
  }
  details.append(body);
  return details;
}

function appearanceSection(identity) {
  const description = phenotype(identity);
  const rule = appearanceRule(identity);
  const sex = threadSex(identity);
  if (!description && !rule && !sex) return null;

  const parsed=parseCanonicalAppearancePresentation(description);
  const subtitle=parsed
    ? human(parsed.sex)+" · "+parsed.version
    : null;
  const wrap = section("Appearance",subtitle);

  const grid = el("div", "thread-person-facts");
  grid.append(
    fact("Sex", sex ? human(sex) : "—"),
    fact("Renderer", identity.world?.thread?.identity?.canonicalVisualIdentity?.specification?.model ?? "—"),
  );
  wrap.append(grid);

  if(parsed){
    const layers=el("div","thread-appearance-layers");
    layers.append(
      appearanceLayer("Structural morphology",parsed.structural,{open:true}),
      appearanceLayer("Reference geometry",parsed.referenceGeometry),
      appearanceLayer("Surface phenotype",parsed.surface),
      appearanceLayer("Reference surface",parsed.referenceSurface),
    );
    wrap.append(layers);
  }else if(description){
    wrap.append(el("p", "thread-appearance-prose", description));
  }

  if (rule) wrap.append(disclosure("Renderer / identity continuity guidance", rule, { prose:true }));
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

export async function fetchThreadObservatory(threadId,{currentOnly=false}={}) {
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
  let encounterStories = [];
  let livedNow = null;
  let encounterError = null;
  let experienceJournalEntries = [];
  let socialInteractions = [];
  let experienceConsolidation = Object.freeze({ queued:Object.freeze([]), consolidations:Object.freeze([]) });
  let contactOutreach = Object.freeze({ attempts:Object.freeze([]), sent:Object.freeze([]) });
  let semanticStates = [];
  let lifeRelations = [];
  let journal = null;
  let journalError = null;
  let deepWorld = null;
  try {
    const response = await fetch(`/api/threads/${encodeURIComponent(threadId)}/observatory${currentOnly?"?view=current":""}`, { headers:{ Accept:"application/json" }, cache:"no-store" });
    const observatoryPayload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(observatoryPayload?.detail ?? observatoryPayload?.error?.detail ?? observatoryPayload?.error?.code ?? observatoryPayload?.error ?? `HTTP ${response.status}`);
    const observatory = observatoryPayload?.observatory ?? null;
    if (!observatory || observatory.threadId !== threadId) throw new Error("World Observatory returned mismatched Thread");
    memories = Array.isArray(observatory.memories) ? observatory.memories : [];
    encounterStories = Array.isArray(observatory.encounterStories) ? observatory.encounterStories : [];
    livedNow = observatory.livedNow??null;
    socialInteractions = Array.isArray(observatory.socialInteractions) ? observatory.socialInteractions : [];
    experienceJournalEntries = Array.isArray(observatory.experienceJournalEntries)
      ? observatory.experienceJournalEntries
      : [];
    experienceConsolidation = observatory.experienceConsolidation
      && typeof observatory.experienceConsolidation === "object"
      ? structuredClone(observatory.experienceConsolidation)
      : { queued:[], consolidations:[] };
    contactOutreach = observatory.contactOutreach
      && typeof observatory.contactOutreach === "object"
      ? structuredClone(observatory.contactOutreach)
      : { attempts:[], sent:[] };
    semanticStates = Array.isArray(observatory.semanticStates) ? observatory.semanticStates : [];
    lifeRelations = Array.isArray(observatory.lifeRelations) ? observatory.lifeRelations : [];
    deepWorld = {
      thread:observatory.thread ?? null,
      civilRegistration:observatory.civilRegistration ?? null,
      embodiments:Array.isArray(observatory.embodiments) ? observatory.embodiments : [],
      symbolicGenomes:Array.isArray(observatory.symbolicGenomes) ? observatory.symbolicGenomes : [],
    };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    memoryError = detail;
    encounterError = detail;
  }
  if(!currentOnly)try {
    const response = await fetch(`/api/threads/${encodeURIComponent(threadId)}/journal`, { headers:{ Accept:"application/json" }, cache:"no-store" });
    const journalPayload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(journalPayload?.detail ?? journalPayload?.error ?? `HTTP ${response.status}`);
    journal = journalPayload?.journal ?? null;
  } catch (error) {
    journalError = error instanceof Error ? error.message : String(error);
  }

  const identity = mergeObservatoryWorldIdentity(payload.identity ?? {}, deepWorld);
  return Object.freeze({
    ...payload,
    identity,
    memories:Object.freeze(memories),
    memoryError,
    encounterStories:Object.freeze(encounterStories),
    livedNow,
    socialInteractions:Object.freeze(socialInteractions),
    encounterError,
    experienceJournalEntries:Object.freeze(experienceJournalEntries),
    experienceConsolidation:Object.freeze({
      queued:Object.freeze([...(experienceConsolidation.queued??[])]),
      consolidations:Object.freeze([...(experienceConsolidation.consolidations??[])]),
    }),
    contactOutreach:Object.freeze({
      attempts:Object.freeze([...(contactOutreach.attempts??[])]),
      sent:Object.freeze([...(contactOutreach.sent??[])]),
    }),
    semanticStates:Object.freeze([...semanticStates]),
    lifeRelations:Object.freeze([...lifeRelations]),
    journal,
    journalError,
  });
}

export function renderThreadObservatory({
  identity,
  threadId,
  memories = [],
  memoryError = null,
  encounterStories = [],
  livedNow = null,
  socialInteractions = [],
  encounterError = null,
  experienceJournalEntries = [],
  experienceConsolidation = null,
  contactOutreach = null,
  semanticStates = [],
  lifeRelations = [],
  journal = null,
  journalError = null,
  deferredHistory = false,
} = {}) {
  const view = el("div", "thread-person-view");
  view.append(
    observatoryCopyAction({
      identity,threadId,memories,memoryError,livedNow,encounterStories,
      encounterError,experienceConsolidation,experienceJournalEntries,semanticStates,lifeRelations,
    }),
    hero(identity,threadId),
    lifeRecordLinks(),
    identitySection(identity,threadId,livedNow),
    renderFidSection(identity,threadId),
    nowSection(identity,livedNow),
  );
  let deferredPlaceholder=null;
  if(deferredHistory){
    const placeholder=section("Lived history","On demand");
    placeholder.dataset.observatoryHistory="deferred";
    const load=el("button","secondary","Load life history");
    load.type="button";
    load.dataset.loadHistory="true";
    placeholder.append(el("p","thread-empty-note",
      "Memories, encounters, relationship history and DNA are loaded only when needed."),load);
    deferredPlaceholder=placeholder;
  }else{
    view.append(
      journalSection(
        journal,journalError,
        [...experienceJournalEntries,
          ...((experienceConsolidation?.consolidations??[])
            .map(item=>item.journal).filter(Boolean))],
      ),
      worldEventsSection({livedNow,encounterStories,encounterError}),
      encounterEpisodeSection({
        identity,threadId,encounterStories,encounterError,livedNow,
        experienceConsolidation,experienceJournalEntries,memories,
        semanticStates,lifeRelations,
      }),
      socialAnalyticsSection({
        threadId,encounterStories,socialInteractions,experienceConsolidation,
        experienceJournalEntries,memories,semanticStates,lifeRelations,
      }),
      laterContactSection(contactOutreach),
      memoriesSection(memories,firstText(identity.birthDate,identity.world?.thread?.identity?.birthDate),memoryError),
    );
  }
  const who = whoSection(identity); if (who) view.append(who);
  const appearance = appearanceSection(identity); if (appearance) view.append(appearance);
  const media = mediaSection(identity); if (media) view.append(media);
  if(!deferredHistory){const dna = dnaSection(identity); if (dna) view.append(dna);}

  const records = el("section", "thread-records"); records.append(el("h3", null, "Records"));
  if (identity.world?.civilRegistration) records.append(disclosure("Civil identity & World registration", identity.world.civilRegistration));
  if ((identity.world?.embodiments ?? []).length) records.append(disclosure("Current embodiments", identity.world.embodiments));
  if (identity.world?.thread?.provenance) records.append(disclosure("Technical provenance", { threadId:identity.world.thread.threadId, status:identity.world.thread.status, version:identity.world.thread.version, provenance:identity.world.thread.provenance }));
  if (identity.presentation) records.append(disclosure("Current public Presentation", identity.presentation));
  view.append(records);
  if(deferredPlaceholder!==null)view.append(deferredPlaceholder);
  return view;
}
