// Disclosure: one process for every piece of information a Thread holds
// (ADR-0040). Nothing is labelled sensitive and no item kind has a decision
// path of its own. Kinds differ only in World facts: the versions of the
// truth that exist, from least to most, and how much an institution such as
// the public registry will ever publish. Who knows what is recorded fact:
// each telling has an audience, an extent (full, partial, none) and a form
// (transparent: it says something is withheld; opaque: by omission).
import { assertId, assertIsoTimestamp, canonicalJson, sha256 } from "./persistence-common.mjs";

export const PUBLIC_AUDIENCE = "public";
export const DISCLOSURE_EXTENTS = Object.freeze(["full", "partial", "none"]);
export const DISCLOSURE_FORMS = Object.freeze(["transparent", "opaque"]);
export const DISCLOSURE_CHANNELS = Object.freeze(["registry", "spoken", "message"]);

// Versions run from least to most. The registry never publishes beyond its cap.
export const INFORMATION_ITEM_KINDS = Object.freeze({
  "whereabouts.home": Object.freeze({ versions: Object.freeze(["country", "city", "area", "exact"]), registryCap: "city" }),
  "whereabouts.now": Object.freeze({ versions: Object.freeze(["city", "venue"]), registryCap: "venue" }),
});

// What the registry records for the public at birth, on the child's behalf.
// It stands until the Thread itself decides otherwise.
export const BIRTH_REGISTRATION = Object.freeze({ "whereabouts.home": "city", "whereabouts.now": "venue" });

const kindOf = (itemKind) => {
  const kind = INFORMATION_ITEM_KINDS[itemKind];
  if (!kind) throw new TypeError(`unknown information item kind ${itemKind}`);
  return kind;
};
const rank = (itemKind, version) => version === null ? -1 : kindOf(itemKind).versions.indexOf(version);
const capped = (itemKind, version, audience) => {
  const { versions, registryCap } = kindOf(itemKind);
  return audience === PUBLIC_AUDIENCE && rank(itemKind, version) > versions.indexOf(registryCap) ? registryCap : version;
};

function text(name, value, maximum) {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string" || !value.trim() || value.trim().length > maximum) {
    throw new TypeError(`${name} must be 1-${maximum} characters`);
  }
  return value.trim();
}

// A telling as World records it. Only the Thread the item is about decides;
// the registry's birth registration is the absence of any decision.
export function normalizeDisclosure(value) {
  const { aboutThreadId, itemKind, audience, extent, version = null, form = null, channel, decidedBy,
    occurredAt, reason = null, provenanceRefs = [] } = value ?? {};
  assertId("disclosure Thread", aboutThreadId);
  const { versions, registryCap } = kindOf(itemKind);
  if (audience !== PUBLIC_AUDIENCE) assertId("disclosure audience", audience);
  if (audience === aboutThreadId) throw new TypeError("a Thread does not tell itself");
  if (!DISCLOSURE_EXTENTS.includes(extent)) throw new TypeError("disclosure extent is invalid");
  if (!DISCLOSURE_CHANNELS.includes(channel)) throw new TypeError("disclosure channel is invalid");
  if ((channel === "registry") !== (audience === PUBLIC_AUDIENCE)) {
    throw new TypeError("the public is told through the registry, and only the public");
  }
  if (decidedBy !== aboutThreadId) throw new TypeError("only the Thread an item is about decides its disclosure");
  assertIsoTimestamp("disclosure time", occurredAt);
  if (extent === "partial" ? !versions.slice(0, -1).includes(version) : version !== null) {
    throw new TypeError("a partial disclosure names one of the item's lesser versions; full and none name none");
  }
  if (extent === "full" ? form !== null : !DISCLOSURE_FORMS.includes(form)) {
    throw new TypeError("a partial or withheld disclosure is transparent or opaque; a full one has no form");
  }
  // A full public disclosure is published at the registry's cap; a partial one may not exceed it.
  if (channel === "registry" && extent === "partial" && rank(itemKind, version) > versions.indexOf(registryCap)) {
    throw new TypeError(`the registry publishes ${itemKind} at most to ${registryCap}`);
  }
  if (!Array.isArray(provenanceRefs)) throw new TypeError("disclosure provenance must be a list");
  provenanceRefs.forEach((ref) => assertId("disclosure provenance", ref));
  const record = { aboutThreadId, itemKind, audience, extent, version, form, channel, decidedBy, occurredAt,
    reason: text("disclosure reason", reason, 500), provenanceRefs: [...new Set(provenanceRefs)] };
  return Object.freeze({ disclosureId: `discl_${sha256(canonicalJson(record))}`, ...record });
}

// The version an audience may know from one telling.
function levelOf(disclosure) {
  const { itemKind, extent, version, audience } = disclosure;
  if (extent === "none") return null;
  return capped(itemKind, extent === "full" ? kindOf(itemKind).versions.at(-1) : version, audience);
}

// What one audience knows of one item. The public's knowledge is the
// registry's standing telling: the latest decision holds, and may be lower
// than before. A person once told stays told: the fullest telling holds.
export function knowledgeOf(itemKind, audience, disclosures) {
  kindOf(itemKind);
  const told = disclosures.filter((item) => item.itemKind === itemKind && item.audience === audience)
    .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt) || a.disclosureId.localeCompare(b.disclosureId));
  if (audience === PUBLIC_AUDIENCE) {
    const latest = told.at(-1);
    return latest === undefined
      ? Object.freeze({ level: BIRTH_REGISTRATION[itemKind], form: null, since: null, disclosureId: null })
      : Object.freeze({ level: levelOf(latest), form: latest.form, since: latest.occurredAt, disclosureId: latest.disclosureId });
  }
  const fullest = told.reduce((best, item) => rank(itemKind, levelOf(item)) > rank(itemKind, best?.level ?? null)
    ? { level: levelOf(item), form: item.form, since: item.occurredAt, disclosureId: item.disclosureId } : best, null);
  const refusal = told.filter((item) => item.extent === "none").at(-1);
  return Object.freeze(fullest ?? { level: null, form: refusal?.form ?? null, since: refusal?.occurredAt ?? null,
    disclosureId: refusal?.disclosureId ?? null });
}

// The public's knowledge of where a Thread lives and where it is now.
export function publicWhereaboutsOf(disclosures) {
  return Object.freeze({
    home: knowledgeOf("whereabouts.home", PUBLIC_AUDIENCE, disclosures),
    now: knowledgeOf("whereabouts.now", PUBLIC_AUDIENCE, disclosures),
  });
}
