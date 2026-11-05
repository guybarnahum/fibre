import { PROMPTS } from "./generated/prompts.mjs";

// One fixed system prompt per cognitive job, authored in ../prompts/<id>.md.
export function promptFor(id) {
  const prompt = PROMPTS[id];
  if (prompt === undefined) throw new TypeError(`unknown cognition prompt ${id}`);
  return prompt;
}

// What a model request carries from its prompt: the text, a versioned reference
// for provenance and cost logs, the provider cache scope, and how long the
// answer may take (live, or minutes: a provider may then serve it more cheaply).
export function promptRequest(id, { threadId = null } = {}) {
  const prompt = promptFor(id);
  if (prompt.cache === "thread" && typeof threadId !== "string") {
    throw new TypeError(`cognition prompt ${id} is cached per Thread and needs a threadId`);
  }
  return Object.freeze({
    systemPrompt:prompt.text,
    promptRef:`${prompt.id}@${prompt.version}`,
    cacheKey:prompt.cache === "thread" ? `${prompt.id}:${threadId}` : prompt.id,
    latency:prompt.latency,
  });
}
