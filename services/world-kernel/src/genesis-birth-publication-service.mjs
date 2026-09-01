function assertAuthority(authority) {
  if (authority === null || typeof authority !== "object" || typeof authority.publishBirth !== "function") {
    throw new TypeError("Genesis birth publication authority must expose publishBirth(bundle)");
  }
  return authority;
}

function optionalRecordAuthority(name, authority, method) {
  if (authority === null || authority === undefined) return null;
  if (typeof authority !== "object" || Array.isArray(authority) || typeof authority[method] !== "function") {
    throw new TypeError(`${name} must expose ${method}()`);
  }
  return authority;
}

function optionalActivityRecorder(value) {
  if (value === null) return null;
  if (!value || typeof value.record !== "function" || typeof value.runStage !== "function") {
    throw new TypeError("Genesis birth publication activityRecorder must expose record() and runStage()");
  }
  return value;
}

async function runActivityStage(activity, metadata, operation) {
  if (activity === null) return operation();
  return activity.runStage(metadata, operation);
}

function sameJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function attachCivilRegistration(bundle) {
  if (bundle === null || typeof bundle !== "object" || Array.isArray(bundle)) {
    throw new TypeError("Genesis birth publication bundle must be an object");
  }
  const registration = bundle.civilRegistration;
  if (registration === undefined || registration === null) return bundle;
  if (bundle.manifest === null || typeof bundle.manifest !== "object" || Array.isArray(bundle.manifest)) {
    throw new TypeError("Genesis birth publication bundle manifest is required");
  }
  const publication = bundle.manifest.publication;
  if (publication === null || typeof publication !== "object" || Array.isArray(publication)) {
    throw new TypeError("Genesis birth publication manifest.publication is required");
  }
  const existing = publication.civilRegistration;
  if (existing !== undefined && !sameJson(existing, registration)) {
    throw new TypeError("Genesis birth publication carries conflicting civil registration records");
  }
  return {
    ...bundle,
    manifest: {
      ...bundle.manifest,
      publication: {
        ...publication,
        civilRegistration: structuredClone(registration),
      },
    },
  };
}

function prerequisiteGenomes(bundle) {
  if (bundle.symbolicGenomes === undefined) return [];
  if (!Array.isArray(bundle.symbolicGenomes)) {
    throw new TypeError("Genesis birth symbolicGenomes must be an array");
  }
  return bundle.symbolicGenomes;
}

function activityIdentity(bundle, supplied = {}) {
  const manifest = bundle?.manifest ?? {};
  return Object.freeze({
    requestId: supplied.requestId ?? null,
    genesisId: supplied.genesisId ?? manifest.genesisId ?? null,
    threadId: supplied.threadId ?? manifest.threadId ?? null,
  });
}

export function createGenesisBirthPublicationService({
  authority,
  worldSpecAuthority = null,
  genomeAuthority = null,
  activityRecorder = null,
} = {}) {
  const target = assertAuthority(authority);
  const worlds = optionalRecordAuthority("Genesis WorldSpec authority", worldSpecAuthority, "recordWorldSpec");
  const genomes = optionalRecordAuthority("Genesis symbolic genome authority", genomeAuthority, "recordGenome");
  const activity = optionalActivityRecorder(activityRecorder);
  return Object.freeze({
    async publishBirth(bundle, { activityContext = {} } = {}) {
      if (bundle === null || typeof bundle !== "object" || Array.isArray(bundle)) {
        throw new TypeError("Genesis birth publication bundle must be an object");
      }
      const context = activityIdentity(bundle, activityContext);
      if (bundle.worldSpec !== undefined) {
        if (worlds === null) throw new TypeError("Genesis birth publication cannot admit worldSpec without a WorldSpec authority");
        await runActivityStage(activity, {
          ...context,
          stage: "world.worldspec.admission",
          attempt: 1,
          evidence: { worldSpecId: bundle.worldSpec.worldSpecId },
        }, async () => worlds.recordWorldSpec(bundle.worldSpec));
      }
      const symbolicGenomes = prerequisiteGenomes(bundle);
      if (symbolicGenomes.length > 0 && genomes === null) {
        throw new TypeError("Genesis birth publication cannot admit symbolicGenomes without a genome authority");
      }
      for (const genome of symbolicGenomes) {
        await runActivityStage(activity, {
          ...context,
          stage: "world.genome.admission",
          attempt: 1,
          evidence: { genomeId: genome.header?.genomeId ?? null },
        }, async () => genomes.recordGenome(genome));
      }
      return runActivityStage(activity, {
        ...context,
        stage: "world.thread.publication",
        attempt: 1,
      }, async () => target.publishBirth(attachCivilRegistration(bundle)));
    },
  });
}
