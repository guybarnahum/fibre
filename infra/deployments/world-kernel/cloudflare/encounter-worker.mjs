import baseWorker, { FibreWorldDurableObject as BaseWorldDurableObject } from "./worker.mjs";
import { createCloudflareActivityRecorder } from "../../cloudflare-activity.mjs";
import cloudflareDeploymentYaml from "../../environments/cloudflare.yaml";
import { parseDeploymentManifest, resolveServiceDeployment } from "../../manifest.mjs";
import { selectReasoningIntegration } from "../../integration-selection.mjs";
import { createLivedEncounterWriteApi } from "#services/world-kernel/src/lived-encounter-write-api.mjs";
import { openLivedNowStore } from "#services/world-kernel/src/lived-now-store.mjs";
import { openSemanticStateStore } from "#services/world-kernel/src/semantic-state-store.mjs";
import { openLivedExperienceStore } from "#services/world-kernel/src/lived-experience-store.mjs";
import { openAutobiographicalMemoryStore } from "#services/world-kernel/src/autobiographical-memory-store.mjs";

const DEPLOYMENT = parseDeploymentManifest(cloudflareDeploymentYaml);

export class FibreWorldDurableObject extends BaseWorldDurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.livedEncounterApi = null;
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
        privateToken: this.env.FIBRE_PRIVATE_TOKEN,
      });
    }
    return this.livedEncounterApi;
  }

  async fetch(request) {
    const response = await this.encounterApiForRequest().fetch(request);
    return response ?? super.fetch(request);
  }

  async alarm(alarmInfo) {
    return super.alarm(alarmInfo);
  }
}

export default baseWorker;
