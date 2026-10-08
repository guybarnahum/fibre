import baseWorker, { FibreWorldDurableObject as BaseWorldDurableObject } from "./worker.mjs";
import { createCloudflareActivityRecorder } from "../../cloudflare-activity.mjs";
import cloudflareDeploymentYaml from "../../environments/cloudflare.yaml";
import { parseDeploymentManifest, resolveServiceDeployment } from "../../manifest.mjs";
import { selectReasoningIntegration } from "../../integration-selection.mjs";
import { createLivedEncounterWriteApi } from "#services/world-kernel/src/lived-encounter-write-api.mjs";
import { createEnvironmentalEncounterService } from "#services/world-kernel/src/lived-environmental-encounter.mjs";
import { createWorldEnvironmentEvolution } from "#services/world-kernel/src/world-environment-evolution.mjs";
import {
  combineWorldEnvironmentProcesses,
  createWorldEnvironmentOpportunity,
} from "#services/world-kernel/src/world-environment-opportunity.mjs";
import { createEnvironmentalEncounterWriteApi } from "#services/world-kernel/src/lived-environmental-encounter-write-api.mjs";
import { createSocialMeetingService } from "#services/world-kernel/src/lived-social-meeting.mjs";
import { createSocialMeetingWriteApi } from "#services/world-kernel/src/lived-social-meeting-write-api.mjs";
import { createLivedCommonsService } from "#services/world-kernel/src/lived-commons.mjs";
import { createLivedCommonsWriteApi } from "#services/world-kernel/src/lived-commons-write-api.mjs";
import { createThreadJournalBook } from "#services/world-kernel/src/thread-journal-book.mjs";
import { createThreadJournalReadApi } from "#services/world-kernel/src/thread-journal-read-api.mjs";
import { createLivedNowPublicationService } from "#services/world-kernel/src/lived-now-publication-service.mjs";
import { createLivedNowService } from "#services/world-kernel/src/lived-now-service.mjs";
import {
  nextLivedBoundary,
  createLivedBoundaryProcess,
} from "#services/world-kernel/src/lived-now-boundary.mjs";
import { createLivedNowWriteApi } from "#services/world-kernel/src/lived-now-write-api.mjs";
import { createInsideFibreAvailabilityService } from "#services/world-kernel/src/inside-fibre-availability.mjs";
import { createInsideFibreWorkService } from "#services/world-kernel/src/inside-fibre-work.mjs";
import { createInsideFibreWorkWriteApi } from "#services/world-kernel/src/inside-fibre-work-write-api.mjs";
import { openInsideFibreWorkStore } from "#services/world-kernel/src/inside-fibre-work-store.mjs";
import { openFibreCreditStore } from "#services/world-kernel/src/fibre-credit-store.mjs";
import { createInsideFibreVisitorMeetingService } from "#services/world-kernel/src/inside-fibre-visitor-meeting.mjs";
import { createInsideFibreVisitorMeetingWriteApi } from "#services/world-kernel/src/inside-fibre-visitor-meeting-write-api.mjs";
import { createPublicVisitorEncounterService } from "#services/world-kernel/src/public-visitor-encounter.mjs";
import { createPublicVisitorEncounterWriteApi } from "#services/world-kernel/src/public-visitor-encounter-write-api.mjs";
import { createExperienceConsolidationProcess } from "#services/world-kernel/src/lived-experience-consolidation.mjs";
import { createExperienceConsolidationWakeScheduler } from "#services/world-kernel/src/lived-experience-consolidation-scheduler.mjs";
import { createLiveEncounterRegistry } from "#services/world-kernel/src/live-encounter-registry.mjs";
import { openContactStore } from "#services/world-kernel/src/contact-store.mjs";
import { createContactWriteApi } from "#services/world-kernel/src/contact-write-api.mjs";
import { createThreadContactProcess } from "#services/world-kernel/src/thread-contact-process.mjs";
import { openLivedNowStore } from "#services/world-kernel/src/lived-now-store.mjs";
import { createWorldVenueWriteApi } from "#services/world-kernel/src/live-world-venue-write-api.mjs";
import { openIdentityStore } from "#services/world-kernel/src/identity-store.mjs";
import { openSemanticStateStore } from "#services/world-kernel/src/semantic-state-store.mjs";
import { openLivedExperienceStore } from "#services/world-kernel/src/lived-experience-store.mjs";
import { openAutobiographicalMemoryStore } from "#services/world-kernel/src/autobiographical-memory-store.mjs";
import { openSituatedLifeStore } from "#services/world-kernel/src/situated-life-store.mjs";
import { createThreadPresentationPublisher } from "../service-boundaries.mjs";

const DEPLOYMENT = parseDeploymentManifest(cloudflareDeploymentYaml);
const LIVED_ENCOUNTER_ROUTE = "/internal/lived-encounter";
const ENVIRONMENTAL_ENCOUNTER_ROUTE = "/internal/environmental-encounter";
const LIVED_NOW_ROUTE = "/internal/lived-now/ensure";
const WORLD_VENUE_ROUTE = "/internal/world-venues/bind";
const SOCIAL_MEETING_ROUTE = "/internal/social-meeting";
const LIVED_COMMONS_ROUTE = "/internal/lived-commons";
const INSIDE_FIBRE_WORK_OFFER_ROUTE = "/internal/inside-fibre/work-offer";
const INSIDE_FIBRE_WORK_STATE_ROUTE = "/internal/inside-fibre/work-state";
const INSIDE_FIBRE_MEETING_ENTRY_ROUTE = "/internal/inside-fibre/meeting-entry";
const INSIDE_FIBRE_VISITOR_ENCOUNTER_ROUTE = "/internal/inside-fibre/visitor-encounter";
const PUBLIC_VISITOR_ENCOUNTER_ROUTE = "/internal/public-visitor-encounter";
const PERSON_CONTACT_CAPABILITY_ROUTE = "/internal/contact/person-capability";
const PERSON_CONTACT_REVOKE_ROUTE = "/internal/contact/person-capability/revoke";
const PERSON_CONTACT_INBOX_ROUTE = "/internal/contact/inbox";
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
    this.environmentalEncounterApi = null;
    this.worldEnvironmentEvolutionProcess = null;
    this.livedNowApi = null;
    this.socialMeetingApi = null;
    this.livedCommonsApi = null;
    this.insideFibreWorkApi = null;
    this.insideFibreMeetingApi = null;
    this.publicVisitorEncounterApi = null;
    this.contactApi = null;
    this.threadJournalApi = null;
    this.worldVenueApi = null;
    this.threadJournalBook = null;
    this.experienceConsolidationProcess = null;
    this.experienceConsolidationWakeScheduler = null;
    this.contactOutreachProcess = null;
    this.livedBoundaryProcess = null;
    this.liveEncounterRegistry = createLiveEncounterRegistry();
  }

  journalBookForRequest() {
    if (this.threadJournalBook === null) {
      this.threadJournalBook = createThreadJournalBook({
        objectStore:threadObjectStore(this.env.THREAD_OBJECTS),
      });
    }
    return this.threadJournalBook;
  }

  experienceConsolidationWakeSchedulerForRequest() {
    if(this.experienceConsolidationWakeScheduler===null){
      this.experienceConsolidationWakeScheduler=createExperienceConsolidationWakeScheduler({
        reconciliationRuntime:this.runtimeForRequest().reconciliationRuntime,
        onScheduled:({queued,wake})=>{
          console.log(JSON.stringify({
            event:"experience-consolidation-wake-requested",
            threadId:queued.threadId,
            experienceId:queued.experienceId,
            scheduledTimeMs:wake.scheduledTimeMs,
            reusedExistingAlarm:wake.existing===true,
          }));
        },
      });
    }
    return this.experienceConsolidationWakeScheduler;
  }

  experienceConsolidationProcessForRequest() {
    if(this.experienceConsolidationProcess===null){
      const runtime=this.runtimeForRequest();
      const deployment=resolveServiceDeployment(DEPLOYMENT,"world-kernel");
      this.experienceConsolidationProcess=createExperienceConsolidationProcess({
        worldReader:runtime.worldStore,
        livedNowStore:openLivedNowStore(runtime.worldStorage),
        semanticStateStore:openSemanticStateStore(runtime.worldStorage),
        memoryStore:openAutobiographicalMemoryStore(runtime.worldStorage),
        experienceStore:openLivedExperienceStore(runtime.worldStorage),
        modelAdapter:selectReasoningIntegration(
          deployment.integrations.encounter,
          {environment:this.env},
        ),
        onAfterthoughts:(event)=>this.liveEncounterRegistry.publishAfterthoughts(event),
      });
      runtime.reconciliationProcess.setExperienceConsolidationProcess(
        this.experienceConsolidationProcess,
      );
    }
    return this.experienceConsolidationProcess;
  }

  contactOutreachProcessForRequest() {
    if(this.contactOutreachProcess===null){
      const runtime=this.runtimeForRequest();
      const deployment=resolveServiceDeployment(DEPLOYMENT,"world-kernel");
      const livedNowStore=openLivedNowStore(runtime.worldStorage);
      const situatedLifeStore=openSituatedLifeStore(runtime.worldStorage);
      const semanticStateStore=openSemanticStateStore(runtime.worldStorage);
      const memoryStore=openAutobiographicalMemoryStore(runtime.worldStorage);
      const livedNow=createLivedNowService({
        onSituationEnacted:(situation)=>this.enqueueWorldOpportunity(situation),
        onSituationResolved:(situation)=>this.scheduleNextLivedBoundary(situation),
        livedNowStore,
        worldStore:runtime.worldStore,
        identityStore:openIdentityStore(runtime.worldStorage),
        semanticStateStore,
        memoryStore,
        situatedLifeStore,
        modelAdapter:selectReasoningIntegration(
          deployment.integrations.livedNow,
          {environment:this.env},
        ),
      });
      this.contactOutreachProcess=createThreadContactProcess({
        worldReader:runtime.worldStore,
        livedNow,
        situatedLifeStore,
        semanticStateStore,
        memoryStore,
        experienceStore:openLivedExperienceStore(runtime.worldStorage),
        contactStore:openContactStore(runtime.worldStorage),
        modelAdapter:selectReasoningIntegration(
          deployment.integrations.encounter,
          {environment:this.env},
        ),
      });
      runtime.reconciliationProcess.setContactOutreachProcess(
        this.contactOutreachProcess,
      );
    }
    return this.contactOutreachProcess;
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
        onExperienceQueued:this.experienceConsolidationWakeSchedulerForRequest(),
        privateToken: this.env.FIBRE_PRIVATE_TOKEN,
      });
    }
    return this.livedEncounterApi;
  }

  worldEnvironmentEvolutionProcessForRequest(){
    if(this.worldEnvironmentEvolutionProcess===null){
      const runtime=this.runtimeForRequest();
      const deployment=resolveServiceDeployment(DEPLOYMENT,"world-kernel");
      const shared={
        experienceStore:openLivedExperienceStore(runtime.worldStorage),
        livedNowStore:openLivedNowStore(runtime.worldStorage),
        worldReader:runtime.worldStore,
        semanticStateStore:openSemanticStateStore(runtime.worldStorage),
        memoryStore:openAutobiographicalMemoryStore(runtime.worldStorage),
        modelAdapter:selectReasoningIntegration(
          deployment.integrations.encounter,{environment:this.env},
        ),
        onExperienceQueued:this.experienceConsolidationWakeSchedulerForRequest(),
      };
      this.worldEnvironmentEvolutionProcess=combineWorldEnvironmentProcesses(
        createWorldEnvironmentOpportunity(shared),
        createWorldEnvironmentEvolution(shared),
      );
      runtime.reconciliationProcess.setEnvironmentEvolutionProcess(
        this.worldEnvironmentEvolutionProcess,
      );
    }
    return this.worldEnvironmentEvolutionProcess;
  }

  environmentalEncounterApiForRequest() {
    if (this.environmentalEncounterApi === null) {
      const runtime = this.runtimeForRequest();
      const deployment = resolveServiceDeployment(DEPLOYMENT, "world-kernel");
      const livedNowStore = openLivedNowStore(runtime.worldStorage);
      const situatedLifeStore = openSituatedLifeStore(runtime.worldStorage);
      const semanticStateStore = openSemanticStateStore(runtime.worldStorage);
      const memoryStore = openAutobiographicalMemoryStore(runtime.worldStorage);
      const experienceStore = openLivedExperienceStore(runtime.worldStorage);
      const livedNow = createLivedNowService({
        onSituationEnacted:(situation)=>this.enqueueWorldOpportunity(situation),
        onSituationResolved:(situation)=>this.scheduleNextLivedBoundary(situation),
        livedNowStore,
        worldStore:runtime.worldStore,
        identityStore:openIdentityStore(runtime.worldStorage),
        semanticStateStore,
        memoryStore,
        situatedLifeStore,
        modelAdapter:selectReasoningIntegration(deployment.integrations.livedNow, { environment:this.env }),
      });
      const encounterService = createEnvironmentalEncounterService({
        worldReader:runtime.worldStore,
        livedNow,
        livedNowStore,
        situatedLifeStore,
        semanticStateStore,
        memoryStore,
        experienceStore,
        modelAdapter:selectReasoningIntegration(deployment.integrations.encounter, { environment:this.env }),
        onExperienceQueued:this.experienceConsolidationWakeSchedulerForRequest(),
        onWorldFollowupQueued:({dueAt})=>{
          const delayMs=Math.max(0,Math.min(3_600_000,Date.parse(dueAt)-Date.now()));
          return runtime.reconciliationRuntime.requestWakeAfter(delayMs);
        },
      });
      this.environmentalEncounterApi = createEnvironmentalEncounterWriteApi({
        encounterService,
        privateToken:this.env.FIBRE_PRIVATE_TOKEN,
      });
    }
    return this.environmentalEncounterApi;
  }

  socialMeetingApiForRequest() {
    if (this.socialMeetingApi === null) {
      const runtime = this.runtimeForRequest();
      const deployment = resolveServiceDeployment(DEPLOYMENT, "world-kernel");
      const livedNowStore = openLivedNowStore(runtime.worldStorage);
      const identityStore = openIdentityStore(runtime.worldStorage);
      const situatedLifeStore = openSituatedLifeStore(runtime.worldStorage);
      const semanticStateStore = openSemanticStateStore(runtime.worldStorage);
      const memoryStore = openAutobiographicalMemoryStore(runtime.worldStorage);
      const experienceStore = openLivedExperienceStore(runtime.worldStorage);
      const livedNow = createLivedNowService({
        onSituationEnacted:(situation)=>this.enqueueWorldOpportunity(situation),
        onSituationResolved:(situation)=>this.scheduleNextLivedBoundary(situation),
        livedNowStore,
        worldStore:runtime.worldStore,
        identityStore,
        semanticStateStore,
        memoryStore,
        situatedLifeStore,
        modelAdapter:selectReasoningIntegration(deployment.integrations.livedNow, { environment:this.env }),
      });
      const meetingService = createSocialMeetingService({
        worldReader:runtime.worldStore,
        livedNow,
        livedNowStore,
        identityStore,
        situatedLifeStore,
        semanticStateStore,
        memoryStore,
        experienceStore,
        modelAdapter:selectReasoningIntegration(deployment.integrations.encounter, { environment:this.env }),
        liveEncounterRegistry:this.liveEncounterRegistry,
        onExperienceQueued:this.experienceConsolidationWakeSchedulerForRequest(),
      });
      this.socialMeetingApi = createSocialMeetingWriteApi({
        meetingService,
        privateToken:this.env.FIBRE_PRIVATE_TOKEN,
      });
    }
    return this.socialMeetingApi;
  }

  livedCommonsApiForRequest() {
    if (this.livedCommonsApi === null) {
      const runtime = this.runtimeForRequest();
      const deployment = resolveServiceDeployment(DEPLOYMENT, "world-kernel");
      const livedNowStore = openLivedNowStore(runtime.worldStorage);
      const identityStore = openIdentityStore(runtime.worldStorage);
      const semanticStateStore = openSemanticStateStore(runtime.worldStorage);
      const memoryStore = openAutobiographicalMemoryStore(runtime.worldStorage);
      const situatedLifeStore = openSituatedLifeStore(runtime.worldStorage);
      const livedNow = createLivedNowService({
        onSituationEnacted:(situation)=>this.enqueueWorldOpportunity(situation),
        onSituationResolved:(situation)=>this.scheduleNextLivedBoundary(situation),
        livedNowStore,
        worldStore:runtime.worldStore,
        identityStore,
        semanticStateStore,
        memoryStore,
        situatedLifeStore,
        modelAdapter:selectReasoningIntegration(deployment.integrations.livedNow, { environment:this.env }),
      });
      const commonsService = createLivedCommonsService({
        worldReader:runtime.worldStore,
        livedNow,
        livedNowStore,
        identityStore,
        semanticStateStore,
        memoryStore,
        situatedLifeStore,
        modelAdapter:selectReasoningIntegration(deployment.integrations.encounter, { environment:this.env }),
      });
      this.livedCommonsApi = createLivedCommonsWriteApi({
        commonsService,
        privateToken:this.env.FIBRE_PRIVATE_TOKEN,
      });
    }
    return this.livedCommonsApi;
  }

  insideFibreWorkApiForRequest() {
    if (this.insideFibreWorkApi === null) {
      const runtime = this.runtimeForRequest();
      const deployment = resolveServiceDeployment(DEPLOYMENT, "world-kernel");
      const livedNowStore = openLivedNowStore(runtime.worldStorage);
      const identityStore = openIdentityStore(runtime.worldStorage);
      const semanticStateStore = openSemanticStateStore(runtime.worldStorage);
      const memoryStore = openAutobiographicalMemoryStore(runtime.worldStorage);
      const situatedLifeStore = openSituatedLifeStore(runtime.worldStorage);
      const workStore = openInsideFibreWorkStore(runtime.worldStorage);
      const fibreCreditStore = openFibreCreditStore(runtime.worldStorage, {
        worldReader:runtime.worldStore,
      });
      const workService = createInsideFibreWorkService({
        worldReader:runtime.worldStore,
        livedNowStore,
        identityStore,
        semanticStateStore,
        memoryStore,
        situatedLifeStore,
        workStore,
        fibreCreditStore,
        modelAdapter:selectReasoningIntegration(deployment.integrations.livedNow, { environment:this.env }),
      });
      this.insideFibreWorkApi = createInsideFibreWorkWriteApi({
        workService,
        workStore,
        fibreCreditStore,
        privateToken:this.env.FIBRE_PRIVATE_TOKEN,
      });
    }
    return this.insideFibreWorkApi;
  }

  insideFibreMeetingApiForRequest() {
    if (this.insideFibreMeetingApi === null) {
      const runtime = this.runtimeForRequest();
      const deployment = resolveServiceDeployment(DEPLOYMENT, "world-kernel");
      const livedNowStore = openLivedNowStore(runtime.worldStorage);
      const identityStore = openIdentityStore(runtime.worldStorage);
      const semanticStateStore = openSemanticStateStore(runtime.worldStorage);
      const memoryStore = openAutobiographicalMemoryStore(runtime.worldStorage);
      const situatedLifeStore = openSituatedLifeStore(runtime.worldStorage);
      const experienceStore = openLivedExperienceStore(runtime.worldStorage);
      const workStore = openInsideFibreWorkStore(runtime.worldStorage);
      const fibreCreditStore = openFibreCreditStore(runtime.worldStorage, {
        worldReader:runtime.worldStore,
      });
      const livedNow = createLivedNowService({
        onSituationEnacted:(situation)=>this.enqueueWorldOpportunity(situation),
        onSituationResolved:(situation)=>this.scheduleNextLivedBoundary(situation),
        livedNowStore,
        worldStore:runtime.worldStore,
        identityStore,
        semanticStateStore,
        memoryStore,
        situatedLifeStore,
        modelAdapter:selectReasoningIntegration(deployment.integrations.livedNow, { environment:this.env }),
      });
      const availability = createInsideFibreAvailabilityService({
        livedNow,
        livedNowStore,
        workStore,
      });
      const meetingService = createInsideFibreVisitorMeetingService({
        availability,
        worldReader:runtime.worldStore,
        livedNowStore,
        semanticStateStore,
        memoryStore,
        experienceStore,
        workStore,
        fibreCreditStore,
        modelAdapter:selectReasoningIntegration(deployment.integrations.encounter, { environment:this.env }),
        onExperienceQueued:this.experienceConsolidationWakeSchedulerForRequest(),
      });
      const publication = createLivedNowPublicationService({
        livedNowStore,
        situatedLifeStore,
        presentationPublisher:createThreadPresentationPublisher({
          baseUrl:"https://thread-presentation.internal",
          privateToken:this.env.FIBRE_PRIVATE_TOKEN,
          fetchImpl:bindingFetch(this.env.THREAD_PRESENTATION),
        }),
      });
      this.insideFibreMeetingApi = createInsideFibreVisitorMeetingWriteApi({
        meetingService,
        publication,
        privateToken:this.env.FIBRE_PRIVATE_TOKEN,
      });
    }
    return this.insideFibreMeetingApi;
  }

  publicVisitorEncounterApiForRequest() {
    if (this.publicVisitorEncounterApi === null) {
      const runtime = this.runtimeForRequest();
      const deployment = resolveServiceDeployment(DEPLOYMENT, "world-kernel");
      const livedNowStore = openLivedNowStore(runtime.worldStorage);
      const identityStore = openIdentityStore(runtime.worldStorage);
      const semanticStateStore = openSemanticStateStore(runtime.worldStorage);
      const memoryStore = openAutobiographicalMemoryStore(runtime.worldStorage);
      const situatedLifeStore = openSituatedLifeStore(runtime.worldStorage);
      const experienceStore = openLivedExperienceStore(runtime.worldStorage);
      const modelAdapter = selectReasoningIntegration(deployment.integrations.encounter, { environment:this.env });
      const livedNow = createLivedNowService({
        onSituationEnacted:(situation)=>this.enqueueWorldOpportunity(situation),
        onSituationResolved:(situation)=>this.scheduleNextLivedBoundary(situation),
        livedNowStore,
        worldStore:runtime.worldStore,
        identityStore,
        semanticStateStore,
        memoryStore,
        situatedLifeStore,
        modelAdapter:selectReasoningIntegration(deployment.integrations.livedNow, { environment:this.env }),
      });
      const encounterService = createPublicVisitorEncounterService({
        worldReader:runtime.worldStore,
        livedNow,
        livedNowStore,
        identityStore,
        situatedLifeStore,
        semanticStateStore,
        memoryStore,
        experienceStore,
        modelAdapter,
        onExperienceQueued:this.experienceConsolidationWakeSchedulerForRequest(),
      });
      this.publicVisitorEncounterApi = createPublicVisitorEncounterWriteApi({
        encounterService,
        privateToken:this.env.FIBRE_PRIVATE_TOKEN,
      });
    }
    return this.publicVisitorEncounterApi;
  }

  contactApiForRequest() {
    if(this.contactApi===null){
      const runtime=this.runtimeForRequest();
      this.contactApi=createContactWriteApi({
        contactStore:openContactStore(runtime.worldStorage),
        privateToken:this.env.FIBRE_PRIVATE_TOKEN,
        onRouteChanged:()=>runtime.reconciliationRuntime.requestWake(),
      });
    }
    return this.contactApi;
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
        onSituationEnacted:(situation)=>this.enqueueWorldOpportunity(situation),
        onSituationResolved:(situation)=>this.scheduleNextLivedBoundary(situation),
        livedNowStore,
        worldStore: runtime.worldStore,
        identityStore: openIdentityStore(runtime.worldStorage),
        semanticStateStore: openSemanticStateStore(runtime.worldStorage),
        memoryStore: openAutobiographicalMemoryStore(runtime.worldStorage),
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

  async scheduleNextLivedBoundary(situation){
    const runtime=this.runtimeForRequest();
    const lived=openLivedNowStore(runtime.worldStorage);
    const dueAt=nextLivedBoundary(lived,situation);
    const result=lived.scheduleNextLivedBoundary({
      threadId:situation.threadId,situationId:situation.situationId,dueAt,
    });
    if(result.scheduled){
      await runtime.reconciliationRuntime.requestWakeAt(Date.parse(dueAt));
    }
  }

  livedBoundaryProcessForRequest(){
    if(this.livedBoundaryProcess===null){
      const runtime=this.runtimeForRequest();
      const deployment=resolveServiceDeployment(DEPLOYMENT,"world-kernel");
      const livedNowStore=openLivedNowStore(runtime.worldStorage);
      const livedNow=createLivedNowService({
        livedNowStore,worldStore:runtime.worldStore,
        identityStore:openIdentityStore(runtime.worldStorage),
        semanticStateStore:openSemanticStateStore(runtime.worldStorage),
        memoryStore:openAutobiographicalMemoryStore(runtime.worldStorage),
        situatedLifeStore:openSituatedLifeStore(runtime.worldStorage),
        modelAdapter:selectReasoningIntegration(
          deployment.integrations.livedNow,{environment:this.env},
        ),
        onSituationEnacted:(situation)=>this.enqueueWorldOpportunity(situation),
        onSituationResolved:(situation)=>this.scheduleNextLivedBoundary(situation),
      });
      this.livedBoundaryProcess=createLivedBoundaryProcess({
        livedNowStore,livedNow,
      });
      runtime.reconciliationProcess.setLivedBoundaryProcess(this.livedBoundaryProcess);
    }
    return this.livedBoundaryProcess;
  }

  async enqueueWorldOpportunity(situation){
    const store=openLivedExperienceStore(this.runtimeForRequest().worldStorage);
    const earned=store.enqueueEnvironmentalOpportunity({
      threadId:situation.threadId,situationId:situation.situationId,
      dueAt:new Date(Date.parse(situation.establishedAt)+60_000).toISOString(),
    });
    if(earned.inserted){
      await this.runtimeForRequest().reconciliationRuntime.requestWakeAfter(60_000);
    }
  }

  worldVenueApiForRequest(){
    if(this.worldVenueApi===null){
      this.worldVenueApi=createWorldVenueWriteApi({
        livedNowStore:openLivedNowStore(this.runtimeForRequest().worldStorage),
        privateToken:this.env.FIBRE_PRIVATE_TOKEN,
      });
    }
    return this.worldVenueApi;
  }

  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname !== LIVED_ENCOUNTER_ROUTE
      && url.pathname !== ENVIRONMENTAL_ENCOUNTER_ROUTE
      && url.pathname !== LIVED_NOW_ROUTE
      && url.pathname !== WORLD_VENUE_ROUTE
      && url.pathname !== SOCIAL_MEETING_ROUTE
      && url.pathname !== LIVED_COMMONS_ROUTE
      && url.pathname !== INSIDE_FIBRE_WORK_OFFER_ROUTE
      && url.pathname !== INSIDE_FIBRE_WORK_STATE_ROUTE
      && url.pathname !== INSIDE_FIBRE_MEETING_ENTRY_ROUTE
      && url.pathname !== INSIDE_FIBRE_VISITOR_ENCOUNTER_ROUTE
      && url.pathname !== PUBLIC_VISITOR_ENCOUNTER_ROUTE
      && url.pathname !== PERSON_CONTACT_CAPABILITY_ROUTE
      && url.pathname !== PERSON_CONTACT_REVOKE_ROUTE
      && url.pathname !== PERSON_CONTACT_INBOX_ROUTE
      && !THREAD_JOURNAL_ROUTE.test(url.pathname)) {
      return super.fetch(request);
    }
    return this.withStateCost(
      { kind:"request", method:request.method, path:url.pathname },
      () => url.pathname === WORLD_VENUE_ROUTE
        ? this.worldVenueApiForRequest().fetch(request)
        : url.pathname === LIVED_NOW_ROUTE
        ? this.livedNowApiForRequest().fetch(request)
        : url.pathname === LIVED_ENCOUNTER_ROUTE
          ? this.encounterApiForRequest().fetch(request)
          : url.pathname === ENVIRONMENTAL_ENCOUNTER_ROUTE
            ? this.environmentalEncounterApiForRequest().fetch(request)
            : url.pathname === SOCIAL_MEETING_ROUTE
              ? this.socialMeetingApiForRequest().fetch(request)
              : url.pathname === LIVED_COMMONS_ROUTE
                ? this.livedCommonsApiForRequest().fetch(request)
                : url.pathname === INSIDE_FIBRE_WORK_OFFER_ROUTE
                  || url.pathname === INSIDE_FIBRE_WORK_STATE_ROUTE
                  ? this.insideFibreWorkApiForRequest().fetch(request)
                  : url.pathname === INSIDE_FIBRE_MEETING_ENTRY_ROUTE
                  || url.pathname === INSIDE_FIBRE_VISITOR_ENCOUNTER_ROUTE
                  ? this.insideFibreMeetingApiForRequest().fetch(request)
                  : url.pathname === PUBLIC_VISITOR_ENCOUNTER_ROUTE
                    ? this.publicVisitorEncounterApiForRequest().fetch(request)
                    : url.pathname === PERSON_CONTACT_CAPABILITY_ROUTE
                      || url.pathname === PERSON_CONTACT_REVOKE_ROUTE
                      || url.pathname === PERSON_CONTACT_INBOX_ROUTE
                      ? this.contactApiForRequest().fetch(request)
                      : this.journalApiForRequest().fetch(request),
    );
  }

  async alarm(alarmInfo) {
    this.experienceConsolidationProcessForRequest();
    this.contactOutreachProcessForRequest();
    this.livedBoundaryProcessForRequest();
    this.worldEnvironmentEvolutionProcessForRequest();
    return super.alarm(alarmInfo);
  }
}

export default baseWorker;
