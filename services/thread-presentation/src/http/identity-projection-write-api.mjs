import {
  FIBRE_IDENTITY_CARD_CURRENT_VERSION,
  normalizeThreadPresentationBundle,
} from "#services/thread-presentation/src/index.mjs";
import { canonicalJson, sha256 } from "#services/world-kernel/src/persistence-common.mjs";
import { threadPresentationChannelId } from "../public-asset-resolver.mjs";

const ROUTE = /^\/internal\/threads\/([A-Za-z0-9][A-Za-z0-9._:-]{0,255})\/identity-projection$/u;
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/u;

function nonEmpty(name, value) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${name} is required`);
  return value.trim();
}

function optionalDate(name, value) {
  if (value === null) return null;
  const text = nonEmpty(name, value);
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(text) || !Number.isFinite(Date.parse(`${text}T00:00:00Z`))) {
    throw new TypeError(`${name} must use YYYY-MM-DD`);
  }
  return text;
}

function strings(name, value) {
  if (!Array.isArray(value)) throw new TypeError(`${name} must be an array`);
  const result = value.map((item, index) => nonEmpty(`${name}[${index}]`, item));
  if (new Set(result).size !== result.length) throw new TypeError(`${name} must be unique`);
  return result;
}

function refs(name, value) {
  const result = strings(name, value);
  for (const [index, ref] of result.entries()) {
    if (!ID_PATTERN.test(ref)) throw new TypeError(`${name}[${index}] must be a Fibre identifier`);
  }
  if (result.length === 0) throw new TypeError(`${name} must not be empty`);
  return result;
}

function iso(name, value) {
  const text = nonEmpty(name, value);
  if (!Number.isFinite(Date.parse(text))) throw new TypeError(`${name} must be an ISO timestamp`);
  return new Date(text).toISOString();
}

function authorized(request, privateToken) {
  return typeof privateToken === "string"
    && privateToken.length > 0
    && request.headers.get("x-fibre-private-token") === privateToken;
}

async function jsonBody(request) {
  try {
    const value = await request.json();
    if (value === null || typeof value !== "object" || Array.isArray(value)) throw new TypeError();
    return value;
  } catch {
    throw new TypeError("request body must be a JSON object");
  }
}

function projection(value, threadId) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError("identity projection is required");
  if (value.threadId !== threadId) throw new TypeError("identity projection Thread does not match route");
  const worldVersion = Number(value.worldVersion);
  if (!Number.isSafeInteger(worldVersion) || worldVersion < 1) throw new TypeError("identity projection worldVersion is invalid");
  return Object.freeze({
    threadId,
    displayName: nonEmpty("identity projection displayName", value.displayName),
    birthDate: optionalDate("identity projection birthDate", value.birthDate ?? null),
    languages: Object.freeze(strings("identity projection languages", value.languages ?? [])),
    lifecycleStatus: nonEmpty("identity projection lifecycleStatus", value.lifecycleStatus),
    fibreIdentityNumber: nonEmpty("identity projection fibreIdentityNumber", value.fibreIdentityNumber),
    worldVersion,
    sourceReferences: Object.freeze(refs("identity projection sourceReferences", value.sourceReferences)),
  });
}

function sameSubject(subject, projected) {
  return subject?.displayName === projected.displayName
    && (subject?.birthDate ?? null) === projected.birthDate
    && JSON.stringify(subject?.languages ?? []) === JSON.stringify(projected.languages);
}

function legacyCardReissue(card, civilIdentity, projected, projectedAt, digest) {
  if (card === null || card.credentialVersion === FIBRE_IDENTITY_CARD_CURRENT_VERSION) return { card, provenance:null };
  const dateField = card.dateField?.kind === "birth_date"
    ? (projected.birthDate === null
      ? { kind:"entry_date", value:civilIdentity.registeredAt.slice(0, 10) }
      : { kind:"birth_date", value:projected.birthDate })
    : card.dateField;
  if (card.displayName === projected.displayName
    && JSON.stringify(card.dateField ?? null) === JSON.stringify(dateField ?? null)) {
    return { card, provenance:null };
  }

  const revision = card.revision + 1;
  const provenanceRef = `prov_world_identity_card_${digest.slice(0, 32)}`;
  const credentialId = `fic_world_identity_${digest.slice(0, 32)}`;
  const sourceReferences = [...new Set([...card.sourceReferences, ...projected.sourceReferences])];
  return {
    card:{
      ...card,
      credentialId,
      cardSerial:`FIC-${digest.slice(0, 16).toUpperCase()}`,
      revision,
      supersedesCredentialId:card.credentialId,
      displayName:projected.displayName,
      dateField,
      issuedAt:projectedAt,
      machineReadableCredentialRef:null,
      sourceReferences,
      provenanceRef,
    },
    provenance:{
      provenanceId:provenanceRef,
      kind:"fibre_projection",
      sourceReferences,
      note:"Legacy presentation identity card reissued because authoritative World identity changed. Civil identity and visual identity remain unchanged.",
    },
  };
}

export function createIdentityProjectionWriteApi({ presentationServer, privateToken } = {}) {
  if (!presentationServer || typeof presentationServer.getSnapshot !== "function"
    || typeof presentationServer.publishSnapshot !== "function") {
    throw new TypeError("identity projection write API requires a presentation server");
  }

  return Object.freeze({
    async fetch(request) {
      const url = new URL(request.url);
      const match = ROUTE.exec(url.pathname);
      if (match === null) return null;
      if (url.search !== "") return Response.json({ error:"query_not_supported" }, { status:400 });
      if (request.method !== "POST") {
        return Response.json({ error:"method_not_allowed" }, { status:405, headers:{ Allow:"POST" } });
      }
      if (!authorized(request, privateToken)) return Response.json({ error:"private_token_required" }, { status:403 });

      try {
        const threadId = decodeURIComponent(match[1]);
        const body = await jsonBody(request);
        const projectedAt = iso("projectedAt", body.projectedAt);
        const projected = projection(body.projection, threadId);
        const channelId = threadPresentationChannelId(threadId);
        const current = await presentationServer.getSnapshot(channelId);
        if (current === null) {
          return Response.json({ error:"presentation_missing", threadId }, { status:409 });
        }
        if (current.pointer.threadId !== threadId || current.snapshot.presentation.manifest.threadId !== threadId) {
          return Response.json({ error:"presentation_thread_conflict", threadId }, { status:409 });
        }

        const currentBundle = normalizeThreadPresentationBundle({
          presentation:current.snapshot.presentation,
          media:current.snapshot.media,
          provenance:current.snapshot.provenance,
        });
        const civil = currentBundle.presentation.civilIdentity;
        if (civil === null) return Response.json({ error:"presentation_civil_identity_missing", threadId }, { status:409 });
        if (civil.fibreIdentityNumber !== projected.fibreIdentityNumber) {
          return Response.json({ error:"presentation_civil_identity_conflict", threadId }, { status:409 });
        }
        if (Date.parse(projectedAt) < Date.parse(currentBundle.presentation.manifest.generatedAt)) {
          throw new TypeError("identity projection cannot predate the current Presentation");
        }

        const subjectCurrent = sameSubject(currentBundle.presentation.subject, projected);
        const lifecycleCurrent = currentBundle.presentation.manifest.lifecycleStatus === projected.lifecycleStatus;
        if (subjectCurrent && lifecycleCurrent) {
          return Response.json({
            ok:true,
            changed:false,
            threadId,
            channelId,
            snapshotVersion:current.pointer.snapshotVersion,
            snapshotDigest:current.pointer.snapshotDigest,
          });
        }

        const identityDigest = sha256(canonicalJson({
          priorSnapshotDigest:current.pointer.snapshotDigest,
          projection:projected,
        }));
        const provenanceRef = `prov_world_identity_${identityDigest.slice(0, 32)}`;
        const cardResult = legacyCardReissue(
          currentBundle.presentation.identityCard,
          civil,
          projected,
          projectedAt,
          identityDigest,
        );
        const next = normalizeThreadPresentationBundle({
          presentation:{
            ...currentBundle.presentation,
            manifest:{
              ...currentBundle.presentation.manifest,
              lifecycleStatus:projected.lifecycleStatus,
              generatedAt:projectedAt,
            },
            subject:{
              ...currentBundle.presentation.subject,
              displayName:projected.displayName,
              birthDate:projected.birthDate,
              languages:[...projected.languages],
              provenanceRef,
            },
            identityCard:cardResult.card,
          },
          media:{ ...currentBundle.media, generatedAt:projectedAt },
          provenance:{
            ...currentBundle.provenance,
            generatedAt:projectedAt,
            entries:[
              ...currentBundle.provenance.entries,
              {
                provenanceId:provenanceRef,
                kind:"authoritative_fact",
                sourceReferences:[...projected.sourceReferences],
                note:"Current public identity projected from authoritative World Thread state.",
              },
              ...(cardResult.provenance === null ? [] : [cardResult.provenance]),
            ],
          },
        });
        const expectedSequence = current.pointer.sequence ?? current.snapshot.cursor;
        const result = await presentationServer.publishSnapshot({
          channelId,
          objectRef:`snapshot_world_identity_${identityDigest}`,
          snapshotVersion:`world-identity-${identityDigest.slice(0, 24)}`,
          bundle:next,
          expectedSequence,
          catalog:{
            publiclyVisible:true,
            projectionKind:"world_identity_reconciliation",
            worldIdentityVersion:projected.worldVersion,
          },
        });
        return Response.json({
          ok:true,
          changed:true,
          threadId,
          channelId,
          snapshotVersion:result.pointer.snapshotVersion,
          snapshotDigest:result.pointer.snapshotDigest,
        }, { status:201 });
      } catch (error) {
        return Response.json({ error:"invalid_identity_projection", detail:error.message }, { status:400 });
      }
    },
  });
}
