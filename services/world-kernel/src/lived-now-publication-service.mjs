import { projectCurrentSituationPresent } from "fibre/thread-presentation/current-present";

function requireMethod(owner, name) {
  if (!owner || typeof owner[name] !== "function") {
    throw new TypeError(`${name} is required for lived-now publication`);
  }
}

// What anyone may see of a Thread's current situation, within what the public
// knows of its whereabouts by its own disclosure (ADR-0040). World may know the
// exact private home; the viewer sees only its independently grounded
// city/country, never an address or coordinates. A real public venue is
// named; nothing else that World knows of the place.
export function projectLivedPresent({ livedNowStore, situatedLifeStore, situation }) {
  const placeRef = situation.location?.kind === "place" ? situation.location.placeRef : null;
  return projectCurrentSituationPresent({
    currentSituation: situation,
    placeEpisodes: situatedLifeStore.listCurrentPlaceEpisodes(situation.threadId),
    lifeRelations: situatedLifeStore.listCurrentLifeRelations(situation.threadId),
    coarsePlace: placeRef === null ? undefined : livedNowStore.coarseCurrentPlace?.(situation.threadId, placeRef),
    publicVenue: placeRef === null ? null : livedNowStore.publicVenue?.(situation.threadId, placeRef) ?? null,
    publicWhereabouts: livedNowStore.publicWhereabouts?.(situation.threadId) ?? null,
  });
}

export function createLivedNowPublicationService({
  livedNowStore,
  situatedLifeStore,
  presentationPublisher,
} = {}) {
  requireMethod(livedNowStore, "enactCurrentSituation");
  requireMethod(situatedLifeStore, "listCurrentPlaceEpisodes");
  requireMethod(situatedLifeStore, "listCurrentLifeRelations");
  requireMethod(presentationPublisher, "publishCurrentPresent");

  async function publishCurrentSituation(situation) {
    const present = projectLivedPresent({ livedNowStore, situatedLifeStore, situation });
    const publication = await presentationPublisher.publishCurrentPresent({
      threadId: situation.threadId,
      present,
      publicWhereabouts: livedNowStore.publicWhereabouts?.(situation.threadId) ?? null,
    });
    // The World context supplies civil time for the enacted place. Transit
    // cannot be assigned a local zone without a grounded current location.
    const context = situation.phase === "at_place"
      ? livedNowStore.getWorldContext?.(situation.threadId, { required:false })
      : null;
    let localTimeZone=livedNowStore.currentLocationTimeZone?.(situation.threadId)
      ??context?.timeZone??null;
    if (localTimeZone !== null) {
      try { new Intl.DateTimeFormat("en", { timeZone:localTimeZone }); }
      catch { localTimeZone = null; }
    }
    return Object.freeze({ situation, present, publication, localTimeZone });
  }

  return Object.freeze({
    publishCurrentSituation,
    async enactCurrentSituation(input) {
      // World commits first. Presentation is a lossy projection of that committed
      // reality; a failed handoff never rolls reality back. Repeating this call is
      // safe because LivedNow enactment and present stream publication are idempotent.
      return publishCurrentSituation(livedNowStore.enactCurrentSituation(input));
    },
  });
}
