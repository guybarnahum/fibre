import assert from "node:assert/strict";
import test from "node:test";

import {
  genesisEpisodePlaceName,genesisPlaceLabel,
} from "../src/genesis-place-presentation.mjs";

test("Genesis setting labels preserve independent place identity and never erase World meaning",()=>{
  const authored="Neighbors gather after school for tutoring and shared reading. "+
    "Parents, teachers and older students come and go throughout the week. ".repeat(8);
  const home="place_ethiopia_addis-ababa_5aa977ea14eb_home";
  const learning="place_ethiopia_addis-ababa_5aa977ea14eb_learning";
  assert.equal(genesisPlaceLabel(home),"Home");
  assert.equal(genesisPlaceLabel(learning),"Learning place");
  assert.notEqual(home,learning,"distinct settings lost their physical identity");
  assert.equal(genesisEpisodePlaceName({placeId:home,description:authored}),"Home");
  assert.equal(genesisEpisodePlaceName({placeId:learning,description:authored}),"Learning place");
  assert.equal(genesisPlaceLabel("place_modern_97e4cb643db2_home"),"Home",
    "existing operator births lost their Genesis kind");
  const historical=genesisEpisodePlaceName({
    placeId:"place_rg1_05_library",description:authored,
  });
  assert.ok(historical.startsWith("Neighbors gather after school"),
    "unknown historical place descriptions became opaque references");
  assert.ok(Buffer.byteLength(historical,"utf8")<=160,
    "place episode bypassed its real historical display bound");
  assert.equal(genesisPlaceLabel("venue_british_library"),null,
    "derived Genesis names displaced a verified real venue");
});
