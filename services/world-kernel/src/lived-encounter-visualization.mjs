import {
  assertId,
  assertNonEmpty,
  sha256,
} from "./persistence-common.mjs";

function unique(values) {
  return [...new Set(values)];
}

export function createEncounterVisualization({
  occurredAt,
  story,
  scene,
  sourceReferences = [],
  depictedThreadRefs = [],
}) {
  assertNonEmpty("encounter visualization occurredAt", occurredAt);
  assertNonEmpty("encounter visualization scene", scene);
  if (!story || typeof story !== "object" || !Array.isArray(story.beats) || story.beats.length < 1) {
    throw new TypeError("encounter visualization requires story beats");
  }
  for (const ref of sourceReferences) assertId("encounter visualization sourceReference", ref);
  for (const ref of depictedThreadRefs) assertId("encounter visualization depictedThreadRef", ref);

  const progression = story.beats
    .map((beat, index) => `${index + 1}. ${beat.text}`)
    .join(" ");

  const prompt = [
    "Generated objective reconstruction of a Fibre Encounter Story.",
    `Scene: ${scene}`,
    `Encounter time: ${occurredAt}.`,
    `Observable progression: ${progression}`,
    "Compose a visually rich, natural scene using only these admitted observable facts.",
    "The same prompt must be suitable as grounding for either a representative still image or a short temporal video reconstruction.",
    depictedThreadRefs.length === 0
      ? "No canonical Thread visual identity is bound to this reconstruction; do not invent an identifiable face or body for a Thread. Frame the observable occurrence itself or keep any person non-identifying."
      : `Depicted Thread identity references are bound separately for: ${depictedThreadRefs.join(", ")}.`,
    "Do not depict private thoughts, feelings, motives, memories, relationship meaning, unseen participants, or details not supported by the Encounter Story.",
    "Do not turn uncertainty or omitted detail into a precise visual claim.",
    "This is generated reconstruction, not documentary evidence or an authentic capture.",
    "Avoid text overlays, labels, signatures, watermarks, or claims of authenticity.",
  ].join(" ");

  const visualizationSourceReferences = unique(sourceReferences);
  const depicted = unique(depictedThreadRefs);
  return Object.freeze({
    visualizationPrompt:prompt,
    visualizationPromptDigest:`sha256:${sha256(prompt)}`,
    visualizationSourceReferences:Object.freeze(visualizationSourceReferences),
    depictedThreadRefs:Object.freeze(depicted),
  });
}
