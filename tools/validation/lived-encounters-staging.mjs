import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath, pathToFileURL } from "node:url";

import { threadJournalPresentationModel } from "../../apps/admin-dashboard/thread-journal-presentation.mjs";
import { planEncounterPresentationAssetSlot } from "../../services/world-kernel/src/encounter-presentation-asset-planner.mjs";
import { reconcilePresentationAssets } from "../../services/world-kernel/src/presentation-asset-demand.mjs";
import { placeEpisodeRevisionRef } from "../../services/world-kernel/src/situated-life-evidence.mjs";

const REPO_ROOT = fileURLToPath(new URL("../../", import.meta.url));
const REQUEST_TIMEOUT_MS = 120_000;
const MAX_REFRESHED_THREADS = 18;
const MAX_SOCIAL_INITIATORS = 18;
const RENDER_WAIT_MS = 600_000;
const RENDER_POLL_MS = 5_000;
const GIT_SHA = /^[0-9a-f]{40}$/u;

function nonEmpty(name, value) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${name} is required`);
  return value.trim();
}

function sha256(value) {
  return createHash("sha256").update(String(value)).digest("hex");
}

function jsonFile(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function sourceGitSha() {
  const value = execFileSync("git", ["rev-parse", "HEAD"], { cwd:REPO_ROOT, encoding:"utf8" }).trim().toLowerCase();
  if (!GIT_SHA.test(value)) throw new Error("lived-encounters staging acceptance requires an exact Git SHA");
  return value;
}

function deploymentByService(record, serviceId) {
  const matches = (record.deployments ?? []).filter((entry) => entry?.serviceId === serviceId);
  if (matches.length !== 1) throw new Error(`deployment evidence must contain exactly one ${serviceId}`);
  return matches[0];
}

function remoteBase(name, value) {
  const url = new URL(nonEmpty(name, value));
  if (url.protocol !== "https:" || ["localhost","127.0.0.1","::1"].includes(url.hostname) || url.hostname.endsWith(".local")) {
    throw new Error(`${name} must be a remote HTTPS staging endpoint`);
  }
  return url.toString().replace(/\/$/u, "");
}

function endpoint(baseUrl, pathname) {
  const url = new URL(baseUrl);
  url.pathname = pathname;
  url.search = "";
  url.hash = "";
  return url;
}

async function responseJson(response, label) {
  const payload = await response.json().catch(() => null);
  if (payload === null) throw new Error(`${label} returned non-JSON HTTP ${response.status}`);
  return payload;
}

async function privatePost(baseUrl, pathname, privateToken, body, label = pathname) {
  const response = await fetch(endpoint(baseUrl, pathname), {
    method:"POST",
    headers:{
      Accept:"application/json",
      "content-type":"application/json",
      "x-fibre-private-token":privateToken,
    },
    body:JSON.stringify(body),
    signal:AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const payload = await responseJson(response, label);
  if (!response.ok || payload?.ok !== true) {
    const error = new Error(`${label} failed HTTP ${response.status}: ${payload?.error ?? "unknown"} ${payload?.detail ?? ""}`.trim());
    error.status = response.status;
    error.payload = payload;
    throw error;
  }
  return payload.result;
}

async function privateGet(baseUrl, pathname, privateToken, label = pathname) {
  const response = await fetch(endpoint(baseUrl, pathname), {
    headers:{ Accept:"application/json", "x-fibre-private-token":privateToken },
    signal:AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const payload = await responseJson(response, label);
  if (!response.ok) throw new Error(`${label} failed HTTP ${response.status}: ${payload?.error?.code ?? payload?.error ?? "unknown"}`);
  return payload;
}

async function publicGet(baseUrl, pathname, viewerOrigin, label = pathname) {
  const response = await fetch(endpoint(baseUrl, pathname), {
    headers:{ Accept:"application/json", Origin:viewerOrigin },
    signal:AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const payload = await responseJson(response, label);
  if (!response.ok) throw new Error(`${label} failed HTTP ${response.status}: ${payload?.error ?? "unknown"}`);
  return payload;
}

async function publicThreads(presentationBaseUrl, viewerOrigin) {
  const url = endpoint(presentationBaseUrl, "/api/threads");
  url.searchParams.set("limit", "200");
  const response = await fetch(url, {
    headers:{ Accept:"application/json", Origin:viewerOrigin },
    signal:AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const payload = await responseJson(response, "Thread discovery");
  if (!response.ok || !Array.isArray(payload?.threads)) {
    throw new Error(`Thread discovery failed HTTP ${response.status}`);
  }
  return payload.threads;
}

function worldPresenceKeys(observatory) {
  const livedNow = observatory?.livedNow;
  const situation = livedNow?.currentSituation;
  if (!situation) return Object.freeze([]);

  const keys = [];
  if (typeof situation.mediatedContext === "string" && situation.mediatedContext.trim() !== "") {
    keys.push(`mediated:${situation.mediatedContext.trim()}`);
  }
  if (situation.location?.kind === "place") {
    const episode = (livedNow.placeEpisodes ?? []).find(
      (candidate) => placeEpisodeRevisionRef(candidate) === situation.location.placeRef,
    );
    if (
      episode?.provenance === "world_recorded"
      && typeof episode?.place?.placeId === "string"
      && episode.place.placeId.trim() !== ""
    ) {
      keys.push(`place:${episode.place.placeId.trim()}`);
    }
  }
  return Object.freeze(keys);
}

function sharesPresence(left, right) {
  const rightKeys = new Set(right.presenceKeys);
  return left.presenceKeys.some((key) => rightKeys.has(key));
}

function establishedAt(thread) {
  const value = thread?.currentPresent?.payload?.establishedAt;
  const parsed = Date.parse(value ?? "");
  return Number.isFinite(parsed) ? parsed : 0;
}

async function refreshStagingThreads({ worldBaseUrl, presentationBaseUrl, viewerOrigin, privateToken, emit }) {
  const discovered = await publicThreads(presentationBaseUrl, viewerOrigin);
  const ordered = [...discovered]
    .filter((thread) => !["genesis_candidate","retired"].includes(thread?.lifecycleStatus))
    .sort((left, right) => establishedAt(right) - establishedAt(left));
  const refreshed = [];
  for (const thread of ordered.slice(0, MAX_REFRESHED_THREADS)) {
    try {
      const result = await privatePost(
        worldBaseUrl,
        "/internal/lived-now/ensure",
        privateToken,
        { threadId:thread.threadId },
        `LivedNow ${thread.threadId}`,
      );
      const observatoryPayload = await privateGet(
        worldBaseUrl,
        `/internal/threads/${encodeURIComponent(thread.threadId)}/observatory`,
        privateToken,
        `World Observatory ${thread.threadId}`,
      );
      const observatory = observatoryPayload?.observatory;
      const currentSituation = observatory?.livedNow?.currentSituation;
      if (!currentSituation || currentSituation.situationId !== result.situationId) {
        throw new Error(`World Observatory current situation disagrees with LivedNow for ${thread.threadId}`);
      }
      const presenceKeys = worldPresenceKeys(observatory);
      process.stderr.write(`DEBUG interior-context ${JSON.stringify({
        threadId:thread.threadId,
        name:thread.displayName ?? observatory?.thread?.identity?.name ?? null,
        currentActivity:currentSituation.activity,
        currentReason:currentSituation.reason,
        genomeLoci:(observatory?.symbolicGenomes ?? [])
          .flatMap((bundle) => bundle?.loci ?? [])
          .sort((left, right) => (left.ordinal ?? 0) - (right.ordinal ?? 0))
          .slice(0, 12)
          .map((locus) => locus.value),
        identityAssertions:(observatory?.identityView?.assertions ?? [])
          .filter((assertion) => assertion?.isCurrentRevision !== false)
          .slice(0, 12)
          .map((assertion) => ({
            domain:assertion.domain,
            kind:assertion.kind,
            meaning:assertion.meaning,
            behavioralStatus:assertion.behavioralStatus,
          })),
        semanticStates:(observatory?.semanticStates ?? []).slice(0, 12).map((state) => ({
          domain:state.domain,
          dimension:state.dimension,
          state:state.state,
          target:state.target?.displayName ?? null,
        })),
        memories:(observatory?.memories ?? []).slice(0, 6).map((memory) => ({
          rememberedContent:memory.rememberedContent ?? null,
          rememberedMeaning:memory.rememberedMeaning ?? null,
          salience:memory.salience ?? null,
          accessibility:memory.accessibility ?? null,
        })),
        lifeRelations:(observatory?.lifeRelations ?? []).slice(0, 12).map((relation) => ({
          displayName:relation.relatedParty?.displayName ?? null,
          relationKind:relation.relationKind,
          relationshipFacts:relation.relationshipFacts ?? [],
        })),
      })}\n`);
      refreshed.push(Object.freeze({
        threadId:thread.threadId,
        displayName:thread.displayName ?? null,
        situationId:result.situationId,
        present:result.present,
        presenceKeys,
      }));
      emit({
        event:"lived-encounters-thread-current",
        threadId:thread.threadId,
        physicalState:currentSituation.location?.kind ?? null,
        sharedPresenceModes:presenceKeys.map((key) => key.startsWith("mediated:") ? "mediated" : "physical"),
      });
    } catch (error) {
      emit({ event:"lived-encounters-thread-skipped", threadId:thread.threadId, reason:error.message.slice(0, 240) });
    }
  }
  if (refreshed.length < 3) throw new Error("lived-encounters staging acceptance needs at least three live public Threads with current LivedNow");
  return refreshed;
}

function orderedSocialInitiators(refreshed) {
  return [...refreshed].sort((left, right) => {
    const leftPeers = refreshed.filter((candidate) => candidate !== left && sharesPresence(left, candidate)).length;
    const rightPeers = refreshed.filter((candidate) => candidate !== right && sharesPresence(right, candidate)).length;
    return rightPeers - leftPeers || left.threadId.localeCompare(right.threadId);
  });
}

function socialPrivateSummary(attempt, participantIds) {
  const aftermath = attempt?.aftermath ?? {};
  const journals = participantIds
    .map((threadId) => ({ threadId, entry:aftermath[threadId]?.journalEntry?.entryText ?? null }))
    .filter((entry) => typeof entry.entry === "string" && entry.entry.trim() !== "");
  const memories = participantIds.map((threadId) => ({
    threadId,
    outcome:aftermath[threadId]?.memory?.outcome ?? "none",
  }));
  const experiences = participantIds.filter((threadId) =>
    typeof aftermath[threadId]?.experienceRecord?.experienceId === "string");
  return Object.freeze({
    participantIds:Object.freeze([...participantIds]),
    experienceThreads:Object.freeze(experiences),
    journalCount:journals.length,
    distinctJournalCount:new Set(journals.map((entry) => sha256(entry.entry))).size,
    journalThreads:Object.freeze(journals.map((entry) => entry.threadId)),
    memoryOutcomes:Object.freeze(memories),
    asymmetricMemory:new Set(memories.map((entry) => entry.outcome)
      .filter((outcome) => ["retained","not_remembered"].includes(outcome))).size > 1,
    journalBookThreads:Object.freeze(participantIds.filter((threadId) =>
      aftermath[threadId]?.journalBookRecord?.objectKey)),
  });
}

async function threadSnapshot(presentationBaseUrl, viewerOrigin, threadId) {
  return publicGet(
    presentationBaseUrl,
    `/api/threads/${encodeURIComponent(threadId)}/snapshot`,
    viewerOrigin,
    `Presentation snapshot ${threadId}`,
  );
}

async function renderPlans({ encounterStory, presentationBaseUrl, viewerOrigin }) {
  const depicted = encounterStory?.visualization?.depictedThreadRefs ?? [];
  if (!Array.isArray(depicted) || depicted.length === 0) return null;
  const visualIdentities = [];
  for (const threadId of depicted) {
    const snapshot = await threadSnapshot(presentationBaseUrl, viewerOrigin, threadId);
    const presentation = snapshot?.snapshot?.presentation;
    const visualIdentity = presentation?.visualIdentity ?? null;
    if (visualIdentity === null) return null;
    visualIdentities.push({
      threadId,
      birthDate:presentation.subject?.birthDate ?? null,
      visualIdentity,
    });
  }
  const suffix = sha256(encounterStory.encounterId).slice(0, 16);
  const image = planEncounterPresentationAssetSlot({
    encounterStory,
    visualIdentities,
    mediaId:`media_lived_encounter_${suffix}`,
    assetKind:"image",
  });
  const video = planEncounterPresentationAssetSlot({
    encounterStory,
    visualIdentities,
    mediaId:`video_lived_encounter_${suffix}`,
    assetKind:"video",
  });
  if (image.status !== "missing" || video.status !== "missing") return null;
  if (!video.brief.description.startsWith(encounterStory.visualization.visualizationPrompt)) {
    throw new Error("lived-encounters video plan does not preserve the admitted objective visualization prompt");
  }
  return Object.freeze({ image, video, visualIdentities:Object.freeze(visualIdentities) });
}

async function findSocialProofs({
  worldBaseUrl,
  presentationBaseUrl,
  viewerOrigin,
  privateToken,
  refreshed,
  emit,
}) {
  let refusal = null;
  let accepted = null;
  let initiatorsConsidered = 0;
  let opportunityCount = 0;
  let backgroundCount = 0;
  let salientCount = 0;
  let acceptedStories = 0;
  let multiEncounterScenes = 0;
  const discoveredActors = new Set();

  const initiators = orderedSocialInitiators(refreshed).slice(0, MAX_SOCIAL_INITIATORS);
  for (const initiator of initiators) {
    let result;
    try {
      result = await privatePost(
        worldBaseUrl,
        "/internal/social-meeting",
        privateToken,
        { initiatorThreadId:initiator.threadId },
        `natural social scene ${initiator.threadId}`,
      );
    } catch (error) {
      emit({
        event:"lived-encounters-social-scene-error",
        threadId:initiator.threadId,
        message:error.message.slice(0, 240),
      });
      continue;
    }

    initiatorsConsidered += 1;
    const discoveredThreadIds = Array.isArray(result?.discoveredThreadIds)
      ? result.discoveredThreadIds
      : [];
    for (const threadId of discoveredThreadIds) discoveredActors.add(threadId);
    if ((result?.encounterCount ?? 0) > 1) multiEncounterScenes += 1;

    emit({
      event:"lived-encounters-scene-discovered",
      threadId:initiator.threadId,
      discoveredThreadCount:discoveredThreadIds.length,
      discoveredThreadIds,
      encounterCount:result?.encounterCount ?? 0,
    });

    for (const attempt of result?.attempts ?? []) {
      opportunityCount += 1;
      discoveredActors.add(attempt.counterpartyThreadId);
      const salienceOutcome = attempt?.salience?.outcome ?? null;
      if (salienceOutcome === "background") backgroundCount += 1;
      if (salienceOutcome === "salient") salientCount += 1;

      emit({
        event:"lived-encounters-actor-opportunity",
        initiatorThreadId:initiator.threadId,
        actorThreadId:attempt.counterpartyThreadId,
        outcome:attempt.outcome,
        salience:salienceOutcome,
        salienceAnchors:attempt?.salience?.anchors ?? [],
        initiationDecision:attempt?.initiation?.decision ?? null,
        responseDecision:attempt?.stance?.decision ?? null,
        cognitionProfile:attempt?.initiation?.cognition?.implementationProfile?.id ?? null,
      });

      if (refusal === null && attempt.outcome === "not_initiated"
        && attempt?.initiation?.decision === "not_initiate") {
        refusal = Object.freeze({
          initiatorThreadId:initiator.threadId,
          counterpartyThreadId:attempt.counterpartyThreadId,
          decision:"not_initiate",
        });
        emit({ event:"lived-encounters-voluntary-refusal-proven", decision:"not_initiate" });
      }
      if (refusal === null && attempt.outcome === "not_met"
        && ["decline","defer"].includes(attempt?.stance?.decision)) {
        refusal = Object.freeze({
          initiatorThreadId:initiator.threadId,
          counterpartyThreadId:attempt.counterpartyThreadId,
          decision:attempt.stance.decision,
        });
        emit({ event:"lived-encounters-voluntary-refusal-proven", decision:attempt.stance.decision });
      }

      if (attempt.outcome !== "met" || !attempt.encounterStory) continue;

      acceptedStories += 1;
      const participantIds = Object.freeze([
        initiator.threadId,
        attempt.counterpartyThreadId,
      ]);
      const presence = new Set(
        (attempt.encounterStory.threadPresence ?? []).map((entry) => entry.threadId),
      );
      const privateSummary = socialPrivateSummary(attempt, participantIds);
      const plans = await renderPlans({
        encounterStory:attempt.encounterStory,
        presentationBaseUrl,
        viewerOrigin,
      }).catch(() => null);

      const qualifies = participantIds.every((threadId) => presence.has(threadId))
        && privateSummary.experienceThreads.length === participantIds.length
        && privateSummary.distinctJournalCount >= 2
        && privateSummary.asymmetricMemory
        && privateSummary.journalBookThreads.length >= 1
        && plans !== null;

      emit({
        event:"lived-encounters-social-met",
        encounterId:attempt.encounterStory.encounterId,
        initiatorThreadId:initiator.threadId,
        counterpartyThreadId:attempt.counterpartyThreadId,
        distinctJournalCount:privateSummary.distinctJournalCount,
        asymmetricMemory:privateSummary.asymmetricMemory,
        renderable:plans !== null,
      });

      if (accepted === null && qualifies) {
        accepted = Object.freeze({
          result:attempt,
          initiatorThreadId:initiator.threadId,
          counterpartyThreadId:attempt.counterpartyThreadId,
          participantIds,
          privateSummary,
          plans,
        });
      }
    }

    if (refusal !== null && accepted !== null && (backgroundCount > 0 || opportunityCount > 1)) break;
  }

  if (opportunityCount === 0) {
    throw new Error(
      `lived-encounters acceptance inspected ${initiatorsConsidered} initiator scene(s) but World discovered no actor opportunities`,
    );
  }
  if (salientCount === 0) {
    throw new Error(
      `lived-encounters acceptance observed ${opportunityCount} natural actor opportunity/opportunities but none became salient`,
    );
  }
  if (backgroundCount === 0 && refusal === null) {
    throw new Error(
      "lived-encounters acceptance observed no background opportunity or voluntary refusal; selective attention/agency remains unproven",
    );
  }
  if (refusal === null) {
    throw new Error(
      `lived-encounters acceptance observed ${salientCount} salient natural opportunity/opportunities but none naturally chose not to initiate, declined, or deferred`,
    );
  }
  if (accepted === null) {
    throw new Error(
      `lived-encounters acceptance observed ${acceptedStories} accepted natural story/stories but none simultaneously proved distinct participant journals, asymmetric retained/not_remembered memory, and renderable canonical identity`,
    );
  }

  return Object.freeze({
    refusal,
    accepted,
    initiatorsConsidered,
    discoveredActorCount:discoveredActors.size,
    opportunityCount,
    backgroundCount,
    salientCount,
    acceptedStories,
    multiEncounterScenes,
  });
}

async function environmentalProof({ worldBaseUrl, privateToken, candidate, runId }) {
  const result = await privatePost(
    worldBaseUrl,
    "/internal/environmental-encounter",
    privateToken,
    {
      threadId:candidate.threadId,
      occurrence:{
        occurrenceRef:`occ_lived_encounter_${Date.now().toString(36)}`,
        description:"A sudden sharp clatter sounds nearby, followed by a brief pause before ordinary activity resumes.",
      },
    },
    "environmental encounter",
  );
  if (!result?.encounterStory?.encounterId || !["noticed","not_noticed"].includes(result?.attention?.outcome)) {
    throw new Error("lived-encounters environmental encounter did not produce durable Encounter Story attention");
  }
  const observatory = await privateGet(
    worldBaseUrl,
    `/internal/threads/${encodeURIComponent(candidate.threadId)}/observatory`,
    privateToken,
    "environmental observatory",
  );
  const story = (observatory?.observatory?.encounterStories ?? []).find((entry) => entry.encounterId === result.encounterStory.encounterId);
  if (!story || story.attention?.outcome !== result.attention.outcome) {
    throw new Error("lived-encounters environmental Encounter Story was not durably inspectable with the same attention outcome");
  }
  return Object.freeze({
    threadId:candidate.threadId,
    encounterId:result.encounterStory.encounterId,
    attention:result.attention.outcome,
    journalOutcome:result.aftermath?.journalEntry ? "written" : "none",
    memoryOutcome:result.aftermath?.memory?.outcome ?? "none",
  });
}

async function durableSocialProof({ worldBaseUrl, privateToken, accepted }) {
  const story = accepted.result.encounterStory;
  const durable = [];
  const interactionIds = new Set();

  for (const threadId of accepted.participantIds) {
    const payload = await privateGet(
      worldBaseUrl,
      `/internal/threads/${encodeURIComponent(threadId)}/observatory`,
      privateToken,
      `observatory ${threadId}`,
    );
    const observatory = payload.observatory;
    const encounter = (observatory?.encounterStories ?? [])
      .find((entry) => entry.encounterId === story.encounterId);
    if (!encounter) {
      throw new Error(`Encounter Story ${story.encounterId} is missing from ${threadId} observatory`);
    }

    const interaction = (observatory?.socialInteractions ?? []).find((entry) =>
      entry.initiatorThreadId === accepted.initiatorThreadId
      && entry.recipientThreadId === accepted.counterpartyThreadId
      && entry.requestText === accepted.result.request.text
      && entry.responseDecision === accepted.result.stance.decision);
    if (!interaction) {
      throw new Error(`Thread ${threadId} observatory is missing the accepted reciprocal social interaction`);
    }
    interactionIds.add(interaction.interactionId);

    const aftermath = accepted.result.aftermath?.[threadId] ?? null;
    const expectedExperience = aftermath?.experienceRecord?.experienceId ?? null;
    if (expectedExperience === null
      || encounter.attention?.experience?.experienceId !== expectedExperience) {
      throw new Error(`Thread ${threadId} durable attention disagrees with accepted social experience`);
    }
    const journalDurable = (observatory.experienceJournalEntries ?? [])
      .some((entry) => entry.aboutExperienceRef === expectedExperience);
    const expectedMemory = aftermath?.memory?.outcome ?? "none";
    const hasMemory = (observatory.memories ?? []).some((memory) =>
      memory?.subject?.originEventRef === expectedExperience
      || (memory.eventRefs ?? []).includes(expectedExperience)
      || (memory.supportingEvidenceRefs ?? []).includes(expectedExperience));
    if (expectedMemory === "retained" && !hasMemory) {
      throw new Error(`Thread ${threadId} retained memory is not durable`);
    }
    if (expectedMemory === "not_remembered" && hasMemory) {
      throw new Error(`Thread ${threadId} not_remembered outcome leaked into autobiographical memory`);
    }
    durable.push(Object.freeze({
      threadId,
      attention:encounter.attention?.outcome ?? null,
      journalDurable,
      memoryOutcome:expectedMemory,
      socialInteractionId:interaction.interactionId,
    }));
  }

  if (interactionIds.size !== 1) {
    throw new Error("accepted social interaction did not resolve to one shared reciprocal-history record");
  }
  return Object.freeze(durable);
}

async function journalAndAdminProof({ worldBaseUrl, privateToken, accepted, sourceSha, appsEvidence, emit }) {
  const aftermath = accepted.result.aftermath;
  const owner = accepted.privateSummary.journalBookThreads.find((threadId) => aftermath?.[threadId]?.journalEntry?.entryText);
  if (!owner) throw new Error("lived-encounters accepted social story has no durable journal-book owner");
  const journalEntry = aftermath[owner].journalEntry;
  const firstPayload = await privateGet(
    worldBaseUrl,
    `/internal/threads/${encodeURIComponent(owner)}/journal`,
    privateToken,
    "Thread journal",
  );
  const secondPayload = await privateGet(
    worldBaseUrl,
    `/internal/threads/${encodeURIComponent(owner)}/journal`,
    privateToken,
    "Thread journal replay",
  );
  const first = firstPayload.journal;
  const second = secondPayload.journal;
  if (!first?.profile || !second?.profile || JSON.stringify(first.profile) !== JSON.stringify(second.profile)) {
    throw new Error("lived-encounters journal profile is not stable across staging reads");
  }
  const observatoryPayload = await privateGet(
    worldBaseUrl,
    `/internal/threads/${encodeURIComponent(owner)}/observatory`,
    privateToken,
    "journal observatory",
  );
  const model = threadJournalPresentationModel(first, observatoryPayload.observatory?.experienceJournalEntries ?? []);
  if (!model.profile?.title || !model.profile?.aestheticNote || model.entries.length === 0 || model.authorityCount === 0) {
    throw new Error("lived-encounters live journal data does not satisfy Admin journal presentation model");
  }
  if (!model.entries.some((entry) => entry.lines.join("\n").includes(journalEntry.entryText))) {
    throw new Error("lived-encounters Admin journal presentation model does not contain the accepted story journal entry");
  }

  if (appsEvidence?.sourceGitSha !== sourceSha || appsEvidence?.sourceTreeClean !== true) {
    throw new Error("lived-encounters Admin deployment evidence is not bound to the exact staging source SHA");
  }
  const admin = (appsEvidence.deployments ?? []).find((entry) => entry.appId === "admin-dashboard");
  if (!admin?.domain) throw new Error("lived-encounters staging app evidence lacks Admin deployment");
  const response = await fetch(`https://${admin.domain}/healthz`, {
    headers:{ Accept:"application/json" },
    signal:AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const health = await responseJson(response, "Admin health");
  if (!response.ok || health?.ok !== true || health?.service !== "admin-dashboard") {
    throw new Error("lived-encounters deployed Admin health check failed");
  }
  emit({ event:"lived-encounters-admin-journal-proven", threadId:owner, entryCount:model.entries.length });
  return Object.freeze({
    threadId:owner,
    profileStable:true,
    titlePresent:true,
    aestheticPresent:true,
    entryCount:model.entries.length,
    worldAuthorityCount:model.authorityCount,
    deployedAdminHealthy:true,
  });
}

async function renderStill({ assetBaseUrl, privateToken, accepted, emit }) {
  const image = accepted.plans.image;
  const video = accepted.plans.video;
  if (image.context.visualizationPromptDigest !== video.context.visualizationPromptDigest) {
    throw new Error("lived-encounters image/video plans do not share the same objective visualization lineage");
  }
  const reconciliation = reconcilePresentationAssets({
    slots:[image],
    requestedAt:new Date().toISOString(),
    providerProfile:"bfl-flux-2-pro-v1",
  });
  if (reconciliation.jobs.length !== 1) throw new Error("lived-encounters still did not become exactly one generated-asset job");
  const [job] = reconciliation.jobs;
  const deadline = Date.now() + RENDER_WAIT_MS;
  let state = null;
  while (Date.now() < deadline) {
    state = await privatePost(
      assetBaseUrl,
      "/internal/generation/reconcile",
      privateToken,
      { job },
      "encounter still generation",
    );
    if (state.state === "ready") break;
    emit({ event:"lived-encounters-render-pending", jobId:job.jobId, workflowStatus:state.workflowStatus ?? null });
    await delay(RENDER_POLL_MS);
  }
  if (state?.state !== "ready") throw new Error(`lived-encounters encounter still did not complete within ${RENDER_WAIT_MS}ms`);
  const receipt = state.proof?.receipt;
  if (!receipt?.objectRef || receipt.context?.eventRef !== accepted.result.encounterStory.encounterId) {
    throw new Error("lived-encounters generated still receipt is not bound to the accepted Encounter Story");
  }
  emit({ event:"lived-encounters-render-ready", jobId:job.jobId, objectRef:receipt.objectRef });
  return Object.freeze({
    jobId:job.jobId,
    objectRef:receipt.objectRef,
    receiptObjectRef:job.receiptObjectRef,
    assetDigest:receipt.sha256,
    visualizationPromptDigest:image.context.visualizationPromptDigest,
    videoSemanticPlan:true,
    referenceCount:image.referenceObjectRefs.length,
  });
}

function writeEvidence(runId, evidence) {
  const path = resolve(REPO_ROOT, ".fibre", "lived-encounters", "staging", runId, "evidence.json");
  mkdirSync(dirname(path), { recursive:true, mode:0o700 });
  writeFileSync(path, `${JSON.stringify(evidence, null, 2)}\n`, { mode:0o600 });
  return path;
}

export async function runLivedEncountersStagingAcceptance({
  environment = process.env,
  emit = (event) => process.stdout.write(`${JSON.stringify(event)}\n`),
} = {}) {
  const privateToken = nonEmpty("FIBRE_PRIVATE_TOKEN", environment.FIBRE_PRIVATE_TOKEN);
  const sourceSha = sourceGitSha();
  const deploymentPath = resolve(REPO_ROOT, ".fibre", "cloudflare", "staging", "deployment.json");
  const appsPath = resolve(REPO_ROOT, ".fibre", "cloudflare", "staging", "apps-deployment.json");
  const deployment = jsonFile(deploymentPath);
  const appsEvidence = jsonFile(appsPath);
  if (deployment.environment !== "staging" || deployment.sourceGitSha !== sourceSha || deployment.sourceTreeClean !== true) {
    throw new Error("lived-encounters acceptance requires staging runtime deployment evidence for the exact clean checkout SHA");
  }

  const worldBaseUrl = remoteBase("staging World", deploymentByService(deployment, "world-kernel").baseUrl);
  const presentationBaseUrl = remoteBase("staging Thread Presentation", deploymentByService(deployment, "thread-presentation").baseUrl);
  const assetBaseUrl = remoteBase("staging Asset Generator", deploymentByService(deployment, "asset-generator").baseUrl);
  const viewerOrigin = remoteBase("staging Viewer", deployment.externalViewerOrigin);
  const runId = `lived-encounters-${Date.now().toString(36)}`;

  emit({ event:"lived-encounters-staging-start", runId, sourceGitSha:sourceSha });
  const refreshed = await refreshStagingThreads({
    worldBaseUrl,
    presentationBaseUrl,
    viewerOrigin,
    privateToken,
    emit,
  });
  const environmental = await environmentalProof({
    worldBaseUrl,
    privateToken,
    candidate:refreshed[0],
    runId,
  });
  emit({ event:"lived-encounters-environmental-proven", ...environmental });

  const social = await findSocialProofs({
    worldBaseUrl,
    presentationBaseUrl,
    viewerOrigin,
    privateToken,
    refreshed,
    emit,
  });
  const durableSocial = await durableSocialProof({
    worldBaseUrl,
    privateToken,
    accepted:social.accepted,
  });
  const adminJournal = await journalAndAdminProof({
    worldBaseUrl,
    privateToken,
    accepted:social.accepted,
    sourceSha,
    appsEvidence,
    emit,
  });
  const render = await renderStill({
    assetBaseUrl,
    privateToken,
    accepted:social.accepted,
    emit,
  });

  const acceptedStory = social.accepted.result.encounterStory;
  const evidence = Object.freeze({
    contract:"fibre-lived-encounters-staging-acceptance-v0.2",
    environment:"staging",
    runId,
    sourceGitSha:sourceSha,
    completedAt:new Date().toISOString(),
    environmental,
    naturalScene:Object.freeze({
      initiatorsConsidered:social.initiatorsConsidered,
      discoveredActorCount:social.discoveredActorCount,
      opportunityCount:social.opportunityCount,
      backgroundCount:social.backgroundCount,
      salientCount:social.salientCount,
      multiEncounterScenes:social.multiEncounterScenes,
    }),
    voluntaryMeeting:Object.freeze({
      initiatorThreadId:social.refusal.initiatorThreadId,
      counterpartyThreadId:social.refusal.counterpartyThreadId,
      decision:social.refusal.decision,
      encounterStoryCreated:false,
    }),
    acceptedSocial:Object.freeze({
      encounterId:acceptedStory.encounterId,
      initiatorThreadId:social.accepted.initiatorThreadId,
      counterpartyThreadId:social.accepted.counterpartyThreadId,
      participantThreadIds:social.accepted.participantIds,
      threadPresence:(acceptedStory.threadPresence ?? []).map((entry) => entry.threadId),
      distinctJournalCount:social.accepted.privateSummary.distinctJournalCount,
      memoryOutcomes:social.accepted.privateSummary.memoryOutcomes,
      durableThreads:durableSocial,
    }),
    adminJournal,
    visualization:Object.freeze({
      promptDigest:acceptedStory.visualization.visualizationPromptDigest,
      sourceReferenceCount:acceptedStory.visualization.visualizationSourceReferences.length,
      depictedThreadRefs:acceptedStory.visualization.depictedThreadRefs,
      still:render,
    }),
    attemptSummary:Object.freeze({
      refreshedThreadCount:refreshed.length,
      initiatorsConsidered:social.initiatorsConsidered,
      naturalActorOpportunities:social.opportunityCount,
      salientActorOpportunities:social.salientCount,
      acceptedStoriesExamined:social.acceptedStories,
    }),
  });
  const evidencePath = writeEvidence(runId, evidence);
  emit({
    event:"lived-encounters-staging-complete",
    runId,
    sourceGitSha:sourceSha,
    environmentalEncounterId:environmental.encounterId,
    socialEncounterId:acceptedStory.encounterId,
    discoveredActorCount:social.discoveredActorCount,
    opportunityCount:social.opportunityCount,
    distinctJournalCount:social.accepted.privateSummary.distinctJournalCount,
    memoryOutcomes:social.accepted.privateSummary.memoryOutcomes.map((entry) => entry.outcome),
    renderObjectRef:render.objectRef,
    evidencePath,
  });
  return Object.freeze({ evidence, evidencePath });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  runLivedEncountersStagingAcceptance().catch((error) => {
    process.stderr.write(`${JSON.stringify({
      event:"lived-encounters-staging-failed",
      errorName:error?.constructor?.name ?? "Error",
      message:String(error?.message ?? error).slice(0, 1200),
    })}\n`);
    process.exitCode = 1;
  });
}
