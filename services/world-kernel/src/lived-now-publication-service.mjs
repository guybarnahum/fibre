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

  return Object.freeze({
    async enactCurrentSituation(input) {
      // World commits first. Presentation is a lossy projection of that committed
      // reality; a failed handoff never rolls reality back. Repeating this call is
      // safe because LivedNow enactment and present stream publication are idempotent.
      const situation = livedNowStore.enactCurrentSituation(input);
      const present = projectCurrentSituationPresent({
        currentSituation: situation,
        placeEpisodes: situatedLifeStore.listCurrentPlaceEpisodes(situation.threadId),
        lifeRelations: situatedLifeStore.listCurrentLifeRelations(situation.threadId),
      });
      const publication = await presentationPublisher.publishCurrentPresent({
        threadId: situation.threadId,
        present,
      });
      return Object.freeze({ situation, present, publication });
    },
  });
}
