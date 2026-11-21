// Which models each cognitive job may think with (accepted by Guy, November
// 21, 2026): a certification per prompt version and model, written by
// model:quality from the accepted absolute bars, and committed beside the
// validation docs. Measured summaries only; never Thread content. A job routed
// to a model of its own in a deployment manifest needs a passed certification
// for its current prompt version; a port's default model is exempt until it
// is certified. Pure: callers read and write the file.

export const CERTIFICATIONS_PATH = "docs/validation/model-certifications.json";
export const EMPTY_CERTIFICATIONS = Object.freeze({ version: 1, certifications: [] });

const same = (a, b) => a.prompt === b.prompt && a.promptVersion === b.promptVersion
  && a.provider === b.provider && a.model === b.model;

// The record with these runs' certifications in place of earlier ones for the
// same prompt version and model, in a stable order.
export function recordCertifications(record, entries) {
  const kept = (record?.certifications ?? []).filter((item) => !entries.some((entry) => same(item, entry)));
  const certifications = [...kept, ...entries].sort((a, b) => a.prompt.localeCompare(b.prompt)
    || b.promptVersion - a.promptVersion || a.provider.localeCompare(b.provider) || a.model.localeCompare(b.model));
  return { version: 1, certifications };
}

export function certificationOf(record, { prompt, promptVersion, provider, model }) {
  return (record?.certifications ?? []).find((item) => same(item, { prompt, promptVersion, provider, model })) ?? null;
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
      const wanted = { prompt: job, promptVersion: version, provider: integration.provider, model: integration.config?.model };
      if (certificationOf(record, wanted)?.verdict !== "pass") found.push({ service, ...wanted });
    }
  }
  return found;
}
