export function formatJson(value) {
  return JSON.stringify(value ?? null, null, 2);
}

export function initials(name = "Thread") {
  return String(name).split(/\s+/u).filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "T";
}

export function threadTitle(record) {
  return record?.name ?? record?.threadId ?? "Unknown Thread";
}

export function filterThreads(threads, query) {
  if (!Array.isArray(threads)) return [];
  const needle = String(query ?? "").trim().toLocaleLowerCase();
  if (needle === "") return [...threads];
  return threads.filter((thread) => [
    thread.threadId,
    thread.name,
    thread.originOrientation,
    thread.status,
    thread.fibreIdentityNumber,
  ].some((value) => typeof value === "string" && value.toLocaleLowerCase().includes(needle)));
}

export function inspectionCounts(inspection) {
  return Object.freeze({
    events: inspection?.events?.length ?? 0,
    memories: inspection?.autobiographicalMemories?.length ?? 0,
    relations: inspection?.situatedLife?.relations?.length ?? 0,
    places: inspection?.situatedLife?.places?.length ?? 0,
    genomes: inspection?.symbolicGenomes?.length ?? 0,
    embodiments: inspection?.embodiment?.current?.length ?? 0,
    identityClaims: inspection?.identity?.current?.claims?.length ?? 0,
    identityAssertions: inspection?.identity?.current?.assertions?.length ?? 0,
  });
}

export function currentIdentityName(inspection) {
  return inspection?.identity?.passport?.canonicalName
    ?? inspection?.thread?.identity?.name
    ?? inspection?.threadId
    ?? "Unknown Thread";
}

export function publicIdentityFacts(inspection) {
  const thread = inspection?.thread ?? {};
  const identity = thread.identity ?? {};
  const registration = inspection?.civilRegistration ?? null;
  return [
    ["Thread ID", thread.threadId ?? inspection?.threadId ?? null],
    ["Fibre Identity Number", registration?.fibreIdentityNumber ?? null],
    ["Origin", identity.originOrientation ?? null],
    ["Status", thread.status ?? null],
    ["Version", thread.version ?? null],
    ["Birth date", identity.birthDate ?? null],
    ["Languages", Array.isArray(identity.languages) ? identity.languages.join(", ") : null],
    ["Culture", Array.isArray(identity.culture) ? identity.culture.join(", ") : null],
  ].filter(([, value]) => value !== null && value !== undefined && value !== "");
}

export function memoryLabel(memory, index) {
  return memory?.title
    ?? memory?.summary
    ?? memory?.rememberedMeaning?.summary
    ?? memory?.memoryId
    ?? `Memory ${index + 1}`;
}

export function relationLabel(relation, index) {
  const party = relation?.relatedParty?.displayName ?? relation?.relatedParty?.partyId ?? "Related party";
  const kind = relation?.relationKind ?? "relationship";
  return `${party} · ${String(kind).replaceAll("_", " ")}` || `Relationship ${index + 1}`;
}

export function placeLabel(place, index) {
  return place?.place?.name
    ?? place?.place?.displayName
    ?? place?.place?.placeId
    ?? place?.episodeId
    ?? `Place ${index + 1}`;
}

export function genomeLabel(genome, index) {
  return genome?.header?.genomeId ?? genome?.genomeId ?? `Genome ${index + 1}`;
}

export function embodimentLabel(embodiment, index) {
  const kind = embodiment?.kind ?? embodiment?.representationKind ?? "embodiment";
  const status = embodiment?.status ?? embodiment?.visibility ?? "unknown";
  return `${String(kind).replaceAll("_", " ")} · ${status}` || `Embodiment ${index + 1}`;
}
