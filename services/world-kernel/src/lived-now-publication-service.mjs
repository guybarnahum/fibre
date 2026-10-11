import { projectCurrentSituationPresent } from "fibre/thread-presentation/current-present";

function requireMethod(owner, name) {
  if (!owner || typeof owner[name] !== "function") {
    throw new TypeError(`${name} is required for lived-now publication`);
  }
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
    const present = projectCurrentSituationPresent({
      currentSituation: situation,
      placeEpisodes: situatedLifeStore.listCurrentPlaceEpisodes(situation.threadId),
      lifeRelations: situatedLifeStore.listCurrentLifeRelations(situation.threadId),
    });
    const publication = await presentationPublisher.publishCurrentPresent({
      threadId: situation.threadId,
      present,
    });
    // The World context supplies civil time for the enacted place. Transit
    // cannot be assigned a local zone without a grounded current location.
    const context = situation.phase === "at_place"
      ? livedNowStore.getWorldContext?.(situation.threadId, { required:false })
      : null;
    let localTimeZone = context?.timeZone ?? null;
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
