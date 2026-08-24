const LOCATIVE_CUES = Object.freeze([
  { kinds: ["home"], pattern: /\b(?:at|inside|outside|in) (?:the |their |his |her )?(?:home|house|apartment|flat|kitchen|bedroom|living room)\b/iu },
  {
    kinds: ["school"],
    pattern: /(?:\b(?:at|inside|outside|in) (?:(?:the|a) )?(?:school|classroom|schoolyard)\b|\bon (?:the )?campus\b)/iu,
  },
  { kinds: ["transit"], pattern: /\b(?:at|inside|outside|in|on) (?:the |a )?(?:bus|tram|train|station|bus stop|tram stop|platform)\b/iu },
  { kinds: ["library_or_learning"], pattern: /\b(?:at|inside|outside|in) (?:the |a )?(?:library|reading room|study room|learning center|learning centre)\b/iu },
  { kinds: ["market_or_commerce"], pattern: /\b(?:at|inside|outside|in) (?:the |a )?(?:market|shop|store|stall|supermarket|grocery)\b/iu },
  { kinds: ["park_or_outdoors", "outdoors"], pattern: /\b(?:at|inside|outside|in) (?:the |a )?(?:park|playground|garden|sports field|field)\b/iu },
  { kinds: ["waterfront", "beach_or_waterfront", "outdoors"], pattern: /\b(?:at|on|along|beside|near) (?:the |a )?(?:beach|shore|seafront|ocean|riverbank|waterfront|harbor|harbour)\b/iu },
  { kinds: ["health_or_clinic"], pattern: /\b(?:at|inside|outside|in) (?:the |a )?(?:clinic|hospital|doctor's office|health center|health centre)\b/iu },
  { kinds: ["work_or_workplace"], pattern: /\b(?:at|inside|outside|in) (?:the |a )?(?:office|workplace|workshop|job site)\b/iu },
  { kinds: ["religious_or_cultural"], pattern: /\b(?:at|inside|outside|in) (?:the |a )?(?:church|mosque|synagogue|temple|museum|gallery|theater|theatre)\b/iu },
]);

function fail(ErrorType, message) { throw new ErrorType(message); }

function sceneSettingClause(observableAction) {
  // B7 protects the authoritative physical scene, not every place mentioned in
  // dialogue, memory, destination, web content, or explanation later in the
  // episode. Genesis prose normally establishes the scene in its opening clause.
  // Inspect that clause only so "On a bus ..., they say a classmate ignored them
  // at school" remains a transit episode while "At the beach, ..." cannot publish
  // against a library placeRef.
  const firstClause = observableAction.split(/[,;.!?]/u, 1)[0].trim();
  return firstClause.slice(0, 240);
}

export function assertGenesisEpisodePlaceConsistency({ episode, envelope, ErrorType = TypeError } = {}) {
  if (!episode || typeof episode.observableAction !== "string") fail(ErrorType, "Genesis place consistency requires episode observableAction");
  if (!envelope || typeof envelope.placeRef !== "string" || typeof envelope.placeKind !== "string") {
    fail(ErrorType, "Genesis place consistency requires authoritative envelope placeRef/placeKind");
  }
  if (episode.placeRef !== envelope.placeRef) {
    fail(ErrorType, `episode ${episode.episodeId} placeRef does not match its authoritative historical envelope`);
  }
  const sceneSetting = sceneSettingClause(episode.observableAction);
  for (const cue of LOCATIVE_CUES) {
    if (!cue.pattern.test(sceneSetting)) continue;
    if (!cue.kinds.includes(envelope.placeKind)) {
      fail(
        ErrorType,
        `episode ${episode.episodeId} observableAction narrates an explicit scene setting incompatible with authoritative placeRef ${episode.placeRef} (${envelope.placeKind})`,
      );
    }
  }
  return true;
}

export function assertGenesisCandidatePlaceConsistency({ candidate, slotPlan, ErrorType = TypeError } = {}) {
  const episodes = candidate?.episodes;
  const envelopes = slotPlan?.envelopePlan?.envelopes;
  if (!Array.isArray(episodes) || !Array.isArray(envelopes) || episodes.length !== envelopes.length) {
    fail(ErrorType, "Genesis candidate place consistency requires aligned episodes and historical envelopes");
  }
  episodes.forEach((episode, index) => assertGenesisEpisodePlaceConsistency({
    episode,
    envelope: envelopes[index],
    ErrorType,
  }));
  return true;
}
