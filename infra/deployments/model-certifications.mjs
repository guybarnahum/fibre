// Which models each cognitive job may think with (accepted by Guy, November
// 21, 2026): a certification per prompt version and model, written by
// model:quality from the accepted absolute bars, and committed beside the
// validation docs. Measured summaries only; never Thread content. A job routed
// to a model of its own in a deployment manifest needs a passed certification
// for its current prompt version, at the settings it runs with; a port's
// default model is exempt until it is certified. Pure: callers read and write
// the file.

export const CERTIFICATIONS_PATH = "docs/validation/model-certifications.json";
export const EMPTY_CERTIFICATIONS = Object.freeze({ version: 1, certifications: [] });

// The settings that change how a model thinks, and so its answers and its
// cost: a certification holds for a model at these settings only. Limits,
// timeouts and retries are left out; they change whether an answer arrives,
// which a run's failures already show.
export const COGNITION_SETTINGS = Object.freeze(["reasoningEffort", "thinkingLevel", "thinkingBudget", "thinking", "temperature", "topP"]);
export function cognitionSettings(config = {}) {
  return Object.fromEntries(COGNITION_SETTINGS.filter((key) => config?.[key] !== undefined && config?.[key] !== null)
    .map((key) => [key, config[key]]));
}
const settingsKey = (settings) => JSON.stringify(Object.entries(cognitionSettings(settings ?? {})).sort(([a], [b]) => a.localeCompare(b)));

// A candidate as an operator names it: provider:model, with settings after +,
// for example google:gemini-3.6-flash+thinkingLevel=low. Numbers stay numbers.
export function parseModelSpec(spec) {
  const [head, ...pairs] = String(spec).split("+");
  const [provider, model] = head.includes(":") ? head.split(/:(.*)/su).filter(Boolean) : ["openai", head];
  const settings = Object.fromEntries(pairs.map((pair) => {
    const [key, value] = pair.split("=", 2);
    if (!COGNITION_SETTINGS.includes(key) || value === undefined) throw new TypeError(`unknown model setting ${pair}`);
    return [key, Number.isFinite(Number(value)) && value.trim() !== "" ? Number(value) : value];
  }));
  return Object.freeze({ provider, model, settings: Object.freeze(settings), label: String(spec).replace(/^openai:/u, "") });
}

const same = (a, b) => a.prompt === b.prompt && a.promptVersion === b.promptVersion
  && a.provider === b.provider && a.model === b.model && settingsKey(a.settings) === settingsKey(b.settings);

// The record with these runs' certifications in place of earlier ones for the
// same prompt version and model, in a stable order.
export function recordCertifications(record, entries) {
  const kept = (record?.certifications ?? []).filter((item) => !entries.some((entry) => same(item, entry)));
  const certifications = [...kept, ...entries].sort((a, b) => a.prompt.localeCompare(b.prompt)
    || b.promptVersion - a.promptVersion || a.provider.localeCompare(b.provider) || a.model.localeCompare(b.model));
  return { version: 1, certifications };
}

export function certificationOf(record, { prompt, promptVersion, provider, model, settings = {} }) {
  return (record?.certifications ?? []).find((item) => same(item, { prompt, promptVersion, provider, model, settings })) ?? null;
}

// Jobs a manifest routes to a model of their own without a passed
// certification for the job's current prompt version.
export function uncertifiedRoutes({ services, record, promptVersion }) {
  const found = [];
  for (const [service, integrations] of Object.entries(services)) {
    for (const [job, integration] of Object.entries(integrations ?? {})) {
      if (integration?.kind !== "ai.reasoning") continue;
      const version = promptVersion(job);
      if (version === null) continue; // a port, not a job
      const wanted = { prompt: job, promptVersion: version, provider: integration.provider, model: integration.config?.model,
        settings: cognitionSettings(integration.config) };
      if (certificationOf(record, wanted)?.verdict !== "pass") found.push({ service, ...wanted });
    }
  }
  return found;
}
