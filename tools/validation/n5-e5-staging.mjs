import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath, pathToFileURL } from "node:url";

import { threadJournalPresentationModel } from "../../apps/admin-dashboard/thread-journal-presentation.mjs";
import { planEncounterPresentationAssetSlot } from "../../services/world-kernel/src/encounter-presentation-asset-planner.mjs";
import { reconcilePresentationAssets } from "../../services/world-kernel/src/presentation-asset-demand.mjs";

const REPO_ROOT = fileURLToPath(new URL("../../", import.meta.url));
const REQUEST_TIMEOUT_MS = 120_000;
const MAX_REFRESHED_THREADS = 18;
const MAX_SOCIAL_ATTEMPTS = 18;
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
  if (!GIT_SHA.test(value)) throw new Error("N5 E5 staging acceptance requires an exact Git SHA");
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

function presentKey(present) {
  if (typeof present?.mediatedContext === "string" && present.mediatedContext.trim() !== "") {
    return `mediated:${present.mediatedContext.trim().toLowerCase()}`;
  }
  if (present?.location?.kind !== "place") return null;
  const place = present.location.place;
  if (!place?.displayName) return null;
  return `place:${String(place.displayName).trim().toLowerCase()}|${String(place.region ?? "").trim().toLowerCase()}`;
}

function establishedAt(thread) {
  const value = thread?.currentPresent?.payload?.establishedAt;
  const parsed = Date.parse(value ?? "");
  return Number.isFinite(parsed) ? parsed : 0;
}

async function refreshStagingThreads({ worldBaseUrl, presentationBaseUrl, viewerOrigin, privateToken, emit }) {
  const discovered = await publicThreads(presentationBaseUrl, viewerOrigin);
  const ordered = [...discovered]
    .filter((thread) => thread?.lifecycleStatus === "active")
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
      refreshed.push(Object.freeze({
        threadId:thread.threadId,
        displayName:thread.displayName ?? null,
        situationId:result.situationId,
        present:result.present,
        key:presentKey(result.present),
      }));
      emit({ event:"n5-e5-thread-current", threadId:thread.threadId, presenceKey:presentKey(result.present) });
    } catch (error) {
      emit({ event:"n5-e5-thread-skipped", threadId:thread.threadId, reason:error.message.slice(0, 240) });
    }
  }
  if (refreshed.length < 3) throw new Error("N5 E5 staging acceptance needs at least three live public Threads with current LivedNow");
  return refreshed;
}

function groupedCandidates(refreshed) {
  const groups = new Map();
  for (const candidate of refreshed) {
    if (candidate.key === null) continue;
    const group = groups.get(candidate.key) ?? [];
    group.push(candidate);
    groups.set(candidate.key, group);
  }
  return [...groups.values()].filter((group) => group.length >= 3).sort((a,b) => b.length - a.length);
}

function triples(values) {
  const result = [];
  for (let i = 0; i < values.length; i += 1) {
    for (let j = i + 1; j < values.length; j += 1) {
      for (let k = j + 1; k < values.length; k += 1) {
        result.push([values[i], values[j], values[k]]);
      }
    }
  }
  return result;
}

function socialAttempts(refreshed) {
  const ordered = [];
  const seen = new Set();
  const add = (a,b,c) => {
    const key = `${a.threadId}|${b.threadId}|${c.threadId}`;
    if (seen.has(key)) return;
    seen.add(key);
    ordered.push(Object.freeze({
      participants:Object.freeze([a,b]),
      witness:c,
    }));
  };
  for (const group of groupedCandidates(refreshed)) {
    for (const [a,b,c] of triples(group)) {
      add(a,b,c);
      add(a,c,b);
      add(b,c,a);
      if (ordered.length >= MAX_SOCIAL_ATTEMPTS) return ordered;
    }
  }
  if (ordered.length < MAX_SOCIAL_ATTEMPTS) {
    for (const [a,b,c] of triples(refreshed)) {
      add(a,b,c);
      add(a,c,b);
      add(b,c,a);
      if (ordered.length >= MAX_SOCIAL_ATTEMPTS) break;
    }
  }
  return ordered;
}

function nonAcceptingStances(result) {
  return Object.entries(result?.stances ?? {})
    .filter(([,stance]) => stance?.decision === "decline" || stance?.decision === "defer")
    .map(([threadId,stance]) => Object.freeze({ threadId, decision:stance.decision }));
}

function socialPrivateSummary(result, participants, witness) {
  const ids = [...participants.map((item) => item.threadId), witness.threadId];
  const aftermath = result?.aftermath ?? {};
  const journals = ids
    .map((threadId) => ({ threadId, entry:aftermath[threadId]?.journalEntry?.entryText ?? null }))
    .filter((entry) => typeof entry.entry === "string" && entry.entry.trim() !== "");
  const memories = ids.map((threadId) => ({
    threadId,
    outcome:aftermath[threadId]?.memory?.outcome ?? "none",
  }));
  return Object.freeze({
    ids:Object.freeze(ids),
    journalCount:journals.length,
    distinctJournalCount:new Set(journals.map((entry) => sha256(entry.entry))).size,
    journalThreads:Object.freeze(journals.map((entry) => entry.threadId)),
    memoryOutcomes:Object.freeze(memories),
    asymmetricMemory:new Set(memories.map((entry) => entry.outcome).filter((outcome) => ["retained","not_remembered"].includes(outcome))).size > 1,
    witnessExperienced:Boolean(aftermath[witness.threadId]?.experienceRecord?.experienceId),
    journalBookThreads:Object.freeze(ids.filter((threadId) => aftermath[threadId]?.journalBookRecord?.objectKey)),
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
    mediaId:`media_e5_encounter_${suffix}`,
    assetKind:"image",
  });
  const video = planEncounterPresentationAssetSlot({
    encounterStory,
    visualIdentities,
    mediaId:`video_e5_encounter_${suffix}`,
    assetKind:"video",
  });
  if (image.status !== "missing" || video.status !== "missing") return null;
  if (!video.brief.description.startsWith(encounterStory.visualization.visualizationPrompt)) {
    throw new Error("E5 video plan does not preserve the admitted objective visualization prompt");
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
  let decline = null;
  let accepted = null;
  let compatibleAttempts = 0;
  let acceptedStories = 0;

  for (const attempt of socialAttempts(refreshed)) {
    let result;
    try {
      result = await privatePost(
        worldBaseUrl,
        "/internal/social-meeting",
        privateToken,
        {
          initiatorThreadId:attempt.participants[0].threadId,
          participantThreadIds:attempt.participants.map((item) => item.threadId),
          witnessThreadIds:[attempt.witness.threadId],
        },
        "social meeting",
      );
    } catch (error) {
      emit({ event:"n5-e5-social-attempt-error", message:error.message.slice(0, 240) });
      continue;
    }

    if (result.compatible !== true) continue;
    compatibleAttempts += 1;
    const nonAccepting = nonAcceptingStances(result);
    if (decline === null && result.outcome === "not_met" && nonAccepting.length > 0 && result.encounterStory === null) {
      decline = Object.freeze({
        participants:Object.freeze(attempt.participants.map((item) => item.threadId)),
        decisions:Object.freeze(nonAccepting),
      });
      emit({ event:"n5-e5-voluntary-refusal-proven", decisions:nonAccepting.map((entry) => entry.decision) });
    }

    if (result.outcome !== "met" || !result.encounterStory) {
      if (decline !== null && accepted !== null) break;
      continue;
    }

    acceptedStories += 1;
    const witnessId = attempt.witness.threadId;
    const participantIds = attempt.participants.map((item) => item.threadId);
    const presence = new Set((result.encounterStory.threadPresence ?? []).map((entry) => entry.threadId));
    const witnessHasStance = Object.hasOwn(result.stances ?? {}, witnessId);
    const witnessSpoke = (result.encounterStory.story?.beats ?? []).some((beat) => beat.actorThreadId === witnessId);
    const privateSummary = socialPrivateSummary(result, attempt.participants, attempt.witness);
    const plans = await renderPlans({
      encounterStory:result.encounterStory,
      presentationBaseUrl,
      viewerOrigin,
    }).catch(() => null);

    const qualifies = participantIds.every((threadId) => presence.has(threadId))
      && presence.has(witnessId)
      && !witnessHasStance
      && !witnessSpoke
      && privateSummary.witnessExperienced
      && privateSummary.distinctJournalCount >= 2
      && privateSummary.asymmetricMemory
      && privateSummary.journalBookThreads.length >= 1
      && plans !== null;

    emit({
      event:"n5-e5-social-met",
      encounterId:result.encounterStory.encounterId,
      witnessExperienced:privateSummary.witnessExperienced,
      distinctJournalCount:privateSummary.distinctJournalCount,
      asymmetricMemory:privateSummary.asymmetricMemory,
      renderable:plans !== null,
    });

    if (accepted === null && qualifies) {
      accepted = Object.freeze({
        result,
        participantIds:Object.freeze(participantIds),
        witnessId,
        privateSummary,
        plans,
      });
    }
    if (decline !== null && accepted !== null) break;
  }

  if (decline === null) {
    throw new Error(`E5 observed ${compatibleAttempts} compatible staging meeting attempt(s) but none naturally declined or deferred; Fibre cannot claim voluntary-meeting staging acceptance`);
  }
  if (accepted === null) {
    throw new Error(`E5 observed ${acceptedStories} accepted staging story/stories but none simultaneously proved silent-witness experience, distinct journals, asymmetric retained/not_remembered memory, and renderable canonical identity`);
  }
  return Object.freeze({ decline, accepted, compatibleAttempts, acceptedStories });
}

async function environmentalProof({ worldBaseUrl, privateToken, candidate, runId }) {
  const result = await privatePost(
    worldBaseUrl,
    "/internal/environmental-encounter",
    privateToken,
    {
      threadId:candidate.threadId,
      occurrence:{
        occurrenceRef:`occ_e5_${runId}`,
        description:"A sudden sharp clatter sounds nearby, followed by a brief pause before ordinary activity resumes.",
      },
    },
    "environmental encounter",
  );
  if (!result?.encounterStory?.encounterId || !["noticed","not_noticed"].includes(result?.attention?.outcome)) {
    throw new Error("E5 environmental encounter did not produce durable Encounter Story attention");
  }
  const observatory = await privateGet(
    worldBaseUrl,
    `/internal/threads/${encodeURIComponent(candidate.threadId)}/observatory`,
    privateToken,
    "environmental observatory",
  );
  const story = (observatory?.observatory?.encounterStories ?? []).find((entry) => entry.encounterId === result.encounterStory.encounterId);
  if (!story || story.attention?.outcome !== result.attention.outcome) {
    throw new Error("E5 environmental Encounter Story was not durably inspectable with the same attention outcome");
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
  const ids = [...accepted.participantIds, accepted.witnessId];
  const durable = [];
  for (const threadId of ids) {
    const payload = await privateGet(
      worldBaseUrl,
      `/internal/threads/${encodeURIComponent(threadId)}/observatory`,
      privateToken,
      `observatory ${threadId}`,
    );
    const observatory = payload.observatory;
    const encounter = (observatory?.encounterStories ?? []).find((entry) => entry.encounterId === story.encounterId);
    if (!encounter) throw new Error(`Encounter Story ${story.encounterId} is missing from ${threadId} observatory`);
    const aftermath = accepted.result.aftermath?.[threadId] ?? null;
    const expectedExperience = aftermath?.experienceRecord?.experienceId ?? null;
    if (expectedExperience !== null && encounter.attention?.experience?.experienceId !== expectedExperience) {
      throw new Error(`Thread ${threadId} durable attention disagrees with accepted social experience`);
    }
    const journalDurable = expectedExperience === null
      ? false
      : (observatory.experienceJournalEntries ?? []).some((entry) => entry.aboutExperienceRef === expectedExperience);
    const expectedMemory = aftermath?.memory?.outcome ?? "none";
    const hasMemory = (observatory.memories ?? []).some((memory) => (memory.eventRefs ?? []).includes(story.encounterId));
    if (expectedMemory === "retained" && !hasMemory) throw new Error(`Thread ${threadId} retained memory is not durable`);
    if (expectedMemory === "not_remembered" && hasMemory) throw new Error(`Thread ${threadId} not_remembered outcome leaked into autobiographical memory`);
    durable.push(Object.freeze({
      threadId,
      attention:encounter.attention?.outcome ?? null,
      journalDurable,
      memoryOutcome:expectedMemory,
    }));
  }
  const witness = durable.find((entry) => entry.threadId === accepted.witnessId);
  if (witness?.attention !== "noticed") throw new Error("E5 silent witness did not durably notice the accepted story");
  return Object.freeze(durable);
}

async function journalAndAdminProof({ worldBaseUrl, privateToken, accepted, sourceSha, appsEvidence, emit }) {
  const aftermath = accepted.result.aftermath;
  const owner = accepted.privateSummary.journalBookThreads.find((threadId) => aftermath?.[threadId]?.journalEntry?.entryText);
  if (!owner) throw new Error("E5 accepted social story has no durable journal-book owner");
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
    throw new Error("E5 journal profile is not stable across staging reads");
  }
  const observatoryPayload = await privateGet(
    worldBaseUrl,
    `/internal/threads/${encodeURIComponent(owner)}/observatory`,
    privateToken,
    "journal observatory",
  );
  const model = threadJournalPresentationModel(first, observatoryPayload.observatory?.experienceJournalEntries ?? []);
  if (!model.profile?.title || !model.profile?.aestheticNote || model.entries.length === 0 || model.authorityCount === 0) {
    throw new Error("E5 live journal data does not satisfy Admin journal presentation model");
  }
  if (!model.entries.some((entry) => entry.lines.join("\n").includes(journalEntry.entryText))) {
    throw new Error("E5 Admin journal presentation model does not contain the accepted story journal entry");
  }

  if (appsEvidence?.sourceGitSha !== sourceSha || appsEvidence?.sourceTreeClean !== true) {
    throw new Error("E5 Admin deployment evidence is not bound to the exact staging source SHA");
  }
  const admin = (appsEvidence.deployments ?? []).find((entry) => entry.appId === "admin-dashboard");
  if (!admin?.domain) throw new Error("E5 staging app evidence lacks Admin deployment");
  const response = await fetch(`https://${admin.domain}/healthz`, {
    headers:{ Accept:"application/json" },
    signal:AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const health = await responseJson(response, "Admin health");
  if (!response.ok || health?.ok !== true || health?.service !== "admin-dashboard") {
    throw new Error("E5 deployed Admin health check failed");
  }
  emit({ event:"n5-e5-admin-journal-proven", threadId:owner, entryCount:model.entries.length });
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
    throw new Error("E5 image/video plans do not share the same objective visualization lineage");
  }
  const reconciliation = reconcilePresentationAssets({
    slots:[image],
    requestedAt:new Date().toISOString(),
    providerProfile:"bfl-flux-2-pro-v1",
  });
  if (reconciliation.jobs.length !== 1) throw new Error("E5 still did not become exactly one generated-asset job");
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
    emit({ event:"n5-e5-render-pending", jobId:job.jobId, workflowStatus:state.workflowStatus ?? null });
    await delay(RENDER_POLL_MS);
  }
  if (state?.state !== "ready") throw new Error(`E5 encounter still did not complete within ${RENDER_WAIT_MS}ms`);
  const receipt = state.proof?.receipt;
  if (!receipt?.objectRef || receipt.context?.eventRef !== accepted.result.encounterStory.encounterId) {
    throw new Error("E5 generated still receipt is not bound to the accepted Encounter Story");
  }
  emit({ event:"n5-e5-render-ready", jobId:job.jobId, objectRef:receipt.objectRef });
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
  const path = resolve(REPO_ROOT, ".fibre", "n5", "e5", runId, "evidence.json");
  mkdirSync(dirname(path), { recursive:true, mode:0o700 });
  writeFileSync(path, `${JSON.stringify(evidence, null, 2)}\n`, { mode:0o600 });
  return path;
}

export async function runN5E5Staging({
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
    throw new Error("N5 E5 requires staging runtime deployment evidence for the exact clean checkout SHA");
  }

  const worldBaseUrl = remoteBase("staging World", deploymentByService(deployment, "world-kernel").baseUrl);
  const presentationBaseUrl = remoteBase("staging Thread Presentation", deploymentByService(deployment, "thread-presentation").baseUrl);
  const assetBaseUrl = remoteBase("staging Asset Generator", deploymentByService(deployment, "asset-generator").baseUrl);
  const viewerOrigin = remoteBase("staging Viewer", deployment.externalViewerOrigin);
  const runId = `n5-e5-${Date.now().toString(36)}`;

  emit({ event:"n5-e5-staging-start", runId, sourceGitSha:sourceSha });
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
  emit({ event:"n5-e5-environmental-proven", ...environmental });

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
    contract:"fibre-n5-e5-staging-acceptance-v0.1",
    environment:"staging",
    runId,
    sourceGitSha:sourceSha,
    completedAt:new Date().toISOString(),
    environmental,
    voluntaryMeeting:Object.freeze({
      participantThreadIds:social.decline.participants,
      decisions:social.decline.decisions,
      encounterStoryCreated:false,
    }),
    acceptedSocial:Object.freeze({
      encounterId:acceptedStory.encounterId,
      participantThreadIds:social.accepted.participantIds,
      witnessThreadId:social.accepted.witnessId,
      threadPresence:(acceptedStory.threadPresence ?? []).map((entry) => entry.threadId),
      witnessAuthoredBeat:false,
      witnessReceivedStance:false,
      witnessExperienced:true,
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
      compatibleMeetingAttempts:social.compatibleAttempts,
      acceptedStoriesExamined:social.acceptedStories,
    }),
  });
  const evidencePath = writeEvidence(runId, evidence);
  emit({
    event:"n5-e5-staging-complete",
    runId,
    sourceGitSha:sourceSha,
    environmentalEncounterId:environmental.encounterId,
    socialEncounterId:acceptedStory.encounterId,
    witnessThreadId:social.accepted.witnessId,
    distinctJournalCount:social.accepted.privateSummary.distinctJournalCount,
    memoryOutcomes:social.accepted.privateSummary.memoryOutcomes.map((entry) => entry.outcome),
    renderObjectRef:render.objectRef,
    evidencePath,
  });
  return Object.freeze({ evidence, evidencePath });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  runN5E5Staging().catch((error) => {
    process.stderr.write(`${JSON.stringify({
      event:"n5-e5-staging-failed",
      errorName:error?.constructor?.name ?? "Error",
      message:String(error?.message ?? error).slice(0, 1200),
    })}\n`);
    process.exitCode = 1;
  });
}
