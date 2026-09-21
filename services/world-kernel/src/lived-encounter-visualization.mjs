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
    "OBJECTIVE FIBRE ENCOUNTER RECONSTRUCTION",
    "",
    "Scene",
    scene,
    `Encounter time: ${occurredAt}.`,
    "",
    "Observable progression",
    progression,
    "",
    "Visual direction",
    "Create a visually rich, natural reconstruction using only the admitted observable facts above.",
    "For a still image, choose a representative moment directly supported by the story.",
    "For video, preserve the observable beat order without adding intermediate actions or dialogue as facts.",
    "",
    "Identity / unspecified detail",
    depictedThreadRefs.length === 0
      ? "No canonical Thread visual identity is bound to this reconstruction. Do not invent an identifiable face or body for a Thread; frame the observable occurrence itself or keep any person non-identifying."
      : `Depicted Thread identity references are bound separately for: ${depictedThreadRefs.join(", ")}.`,
    "Anything not established by the Encounter Story or its bound evidence must remain visually noncommittal rather than being made precise.",
    "",
    "Constraints",
    "Do not depict private thoughts, feelings, motives, memories, relationship meaning, unseen participants, or later facts.",
    "Do not turn omitted or uncertain detail into a precise visual claim.",
    "This is generated reconstruction, not documentary evidence or an authentic capture.",
    "Avoid text overlays, labels, signatures, watermarks, or claims of authenticity.",
  ].join("\n");

  const visualizationSourceReferences = unique(sourceReferences);
  const depicted = unique(depictedThreadRefs);
  return Object.freeze({
    visualizationPrompt:prompt,
    visualizationPromptDigest:`sha256:${sha256(prompt)}`,
    visualizationSourceReferences:Object.freeze(visualizationSourceReferences),
    depictedThreadRefs:Object.freeze(depicted),
  });
}
