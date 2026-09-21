import baseWorker, { FibreWorldDurableObject as BaseWorldDurableObject } from "./worker.mjs";
import { createCloudflareActivityRecorder } from "../../cloudflare-activity.mjs";
import cloudflareDeploymentYaml from "../../environments/cloudflare.yaml";
import { parseDeploymentManifest, resolveServiceDeployment } from "../../manifest.mjs";
import { selectReasoningIntegration } from "../../integration-selection.mjs";
import { createLivedEncounterWriteApi } from "#services/world-kernel/src/lived-encounter-write-api.mjs";
import { createSocialMeetingService } from "#services/world-kernel/src/lived-social-meeting.mjs";
import { createSocialMeetingWriteApi } from "#services/world-kernel/src/lived-social-meeting-write-api.mjs";
import { createThreadJournalBook } from "#services/world-kernel/src/thread-journal-book.mjs";
import { createThreadJournalReadApi } from "#services/world-kernel/src/thread-journal-read-api.mjs";
import { createLivedNowPublicationService } from "#services/world-kernel/src/lived-now-publication-service.mjs";
import { createLivedNowService } from "#services/world-kernel/src/lived-now-service.mjs";
import { createLivedNowWriteApi } from "#services/world-kernel/src/lived-now-write-api.mjs";
import { openLivedNowStore } from "#services/world-kernel/src/lived-now-store.mjs";
import { openSemanticStateStore } from "#services/world-kernel/src/semantic-state-store.mjs";
import { openLivedExperienceStore } from "#services/world-kernel/src/lived-experience-store.mjs";
import { openAutobiographicalMemoryStore } from "#services/world-kernel/src/autobiographical-memory-store.mjs";
import { openSituatedLifeStore } from "#services/world-kernel/src/situated-life-store.mjs";
import { createThreadPresentationPublisher } from "../service-boundaries.mjs";

const DEPLOYMENT = parseDeploymentManifest(cloudflareDeploymentYaml);
const LIVED_ENCOUNTER_ROUTE = "/internal/lived-encounter";
const LIVED_NOW_ROUTE = "/internal/lived-now/ensure";
const SOCIAL_MEETING_ROUTE = "/internal/social-meeting";
const THREAD_JOURNAL_ROUTE = /^\/internal\/threads\/[^/]+\/journal$/u;

function bindingFetch(binding) {
  return (input, init) => binding.fetch(input instanceof Request ? input : new Request(input, init));
}

function threadObjectStore(bucket) {
  if (!bucket || typeof bucket.get !== "function" || typeof bucket.put !== "function") {
    throw new TypeError("THREAD_OBJECTS R2 binding is required");
  }
  return Object.freeze({
    async read(key) {
      const object = await bucket.get(key);
      return object === null ? null : object.text();
    },
    async write(key, text, metadata = {}) {
      await bucket.put(key, text, {
        httpMetadata:{ contentType:metadata.contentType ?? "application/octet-stream" },
        customMetadata:{
          ...(metadata.threadId ? { threadId:metadata.threadId } : {}),
          ...(metadata.presentationStyle ? { presentationStyle:metadata.presentationStyle } : {}),
        },
      });
    },
  });
}

export class FibreWorldDurableObject extends BaseWorldDurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.livedEncounterApi = null;
    this.livedNowApi = null;
    this.socialMeetingApi = null;
    this.threadJournalApi = null;
    this.threadJournalBook = null;
  }

  journalBookForRequest() {
    if (this.threadJournalBook === null) {
      this.threadJournalBook = createThreadJournalBook({
        objectStore:threadObjectStore(this.env.THREAD_OBJECTS),
      });
    }
    return this.threadJournalBook;
  }

  encounterApiForRequest() {
    if (this.livedEncounterApi === null) {
      const runtime = this.runtimeForRequest();
      const deployment = resolveServiceDeployment(DEPLOYMENT, "world-kernel");
      this.livedEncounterApi = createLivedEncounterWriteApi({
        worldReader: runtime.worldStore,
        livedNowStore: openLivedNowStore(runtime.worldStorage),
        semanticStateStore: openSemanticStateStore(runtime.worldStorage),
        experienceStore: openLivedExperienceStore(runtime.worldStorage),
        memoryStore: openAutobiographicalMemoryStore(runtime.worldStorage),
        modelAdapter: selectReasoningIntegration(deployment.integrations.encounter, { environment: this.env }),
        activityRecorder: createCloudflareActivityRecorder({ env: this.env, service: "world-kernel" }),
        journalBook:this.journalBookForRequest(),
        privateToken: this.env.FIBRE_PRIVATE_TOKEN,
      });
    }
    return this.livedEncounterApi;
  }

  socialMeetingApiForRequest() {
    if (this.socialMeetingApi === null) {
      const runtime = this.runtimeForRequest();
      const deployment = resolveServiceDeployment(DEPLOYMENT, "world-kernel");
      const livedNowStore = openLivedNowStore(runtime.worldStorage);
      const situatedLifeStore = openSituatedLifeStore(runtime.worldStorage);
      const semanticStateStore = openSemanticStateStore(runtime.worldStorage);
      const memoryStore = openAutobiographicalMemoryStore(runtime.worldStorage);
      const experienceStore = openLivedExperienceStore(runtime.worldStorage);
      const livedNow = createLivedNowService({
        livedNowStore,
        worldStore:runtime.worldStore,
        situatedLifeStore,
        modelAdapter:selectReasoningIntegration(deployment.integrations.livedNow, { environment:this.env }),
      });
      const meetingService = createSocialMeetingService({
        worldReader:runtime.worldStore,
        livedNow,
        livedNowStore,
        situatedLifeStore,
        semanticStateStore,
        memoryStore,
        experienceStore,
        journalBook:this.journalBookForRequest(),
        modelAdapter:selectReasoningIntegration(deployment.integrations.encounter, { environment:this.env }),
        activityRecorder:createCloudflareActivityRecorder({ env:this.env, service:"world-kernel" }),
      });
      this.socialMeetingApi = createSocialMeetingWriteApi({
        meetingService,
        privateToken:this.env.FIBRE_PRIVATE_TOKEN,
      });
    }
    return this.socialMeetingApi;
  }

  journalApiForRequest() {
    if (this.threadJournalApi === null) {
      this.threadJournalApi = createThreadJournalReadApi({
        journalBook:this.journalBookForRequest(),
        privateToken:this.env.FIBRE_PRIVATE_TOKEN,
      });
    }
    return this.threadJournalApi;
  }

  livedNowApiForRequest() {
    if (this.livedNowApi === null) {
      const runtime = this.runtimeForRequest();
      const deployment = resolveServiceDeployment(DEPLOYMENT, "world-kernel");
      const livedNowStore = openLivedNowStore(runtime.worldStorage);
      const situatedLifeStore = openSituatedLifeStore(runtime.worldStorage);
      const livedNow = createLivedNowService({
        livedNowStore,
        worldStore: runtime.worldStore,
        situatedLifeStore,
        modelAdapter: selectReasoningIntegration(deployment.integrations.livedNow, { environment: this.env }),
      });
      const presentation = createLivedNowPublicationService({
        livedNowStore,
        situatedLifeStore,
        presentationPublisher: createThreadPresentationPublisher({
          baseUrl: "https://thread-presentation.internal",
          privateToken: this.env.FIBRE_PRIVATE_TOKEN,
          fetchImpl: bindingFetch(this.env.THREAD_PRESENTATION),
        }),
      });
      this.livedNowApi = createLivedNowWriteApi({
        livedNow,
        publication: presentation,
        privateToken: this.env.FIBRE_PRIVATE_TOKEN,
      });
    }
    return this.livedNowApi;
  }

  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname !== LIVED_ENCOUNTER_ROUTE
      && url.pathname !== LIVED_NOW_ROUTE
      && url.pathname !== SOCIAL_MEETING_ROUTE
      && !THREAD_JOURNAL_ROUTE.test(url.pathname)) {
      return super.fetch(request);
    }
    return this.withStateCost(
      { kind:"request", method:request.method, path:url.pathname },
      () => url.pathname === LIVED_NOW_ROUTE
        ? this.livedNowApiForRequest().fetch(request)
        : url.pathname === LIVED_ENCOUNTER_ROUTE
          ? this.encounterApiForRequest().fetch(request)
          : url.pathname === SOCIAL_MEETING_ROUTE
            ? this.socialMeetingApiForRequest().fetch(request)
            : this.journalApiForRequest().fetch(request),
    );
  }

  async alarm(alarmInfo) {
    return super.alarm(alarmInfo);
  }
}

export default baseWorker;
