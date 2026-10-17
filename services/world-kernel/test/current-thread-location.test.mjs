import test from "node:test";
import assert from "node:assert/strict";

import { genesisContextLocations,isModernGenesisWorldPlace,projectCurrentThreadLocation,projectOperatorCurrentPlace } from "../src/current-thread-location.mjs";

const entry = Object.freeze({
  threadId:"thr_current_location",
  birthPlace:"Tbilisi, Georgia",
});

test("current World place, not birthplace, defines the Threads map position", () => {
  const placeEpisode = {
    episodeId:"pep_current_jerusalem",
    revision:1,
    threadId:entry.threadId,
    episodeKind:"formative_presence",
    place:{
      placeId:"place_current_jerusalem",
      displayName:"A neighborhood library in Jerusalem",
      countryCode:"IL",
      region:null,
      locality:"Jerusalem",
      precision:"locality",
    },
    startAt:"2026-09-25T10:00:00.000Z",
    endAt:null,
    sourceReferences:["evt_current_jerusalem"],
    visibility:"private",
    status:"current",
    provenance:"genesis_created",
    recordedAt:"2026-09-25T10:00:00.000Z",
  };
  const location = projectCurrentThreadLocation({
    entry,
    currentSituation:{
      establishedAt:"2026-09-25T18:00:00.000Z",
      location:{ kind:"place", placeRef:"per:pep_current_jerusalem:1" },
    },
    placeEpisodes:[placeEpisode],
  });

  assert.equal(location.current, true);
  assert.equal(location.displayName, "A neighborhood library in Jerusalem");
  assert.equal(location.locality, "Jerusalem");
  assert.equal(location.country, "Israel");
  assert.equal(location.countryCode, "IL");
  assert.equal(location.lat, 31.76904);
  assert.equal(location.long, 35.21633);
});

test("verified public venue supplies its own location, never birthplace geography", () => {
  const location = projectCurrentThreadLocation({
    entry,
    currentSituation:{
      establishedAt:"2026-09-25T18:00:00.000Z",
      location:{ kind:"place", placeRef:"wpl_library" },
    },
    worldPlaces:[{
      ref:"wpl_library",
      displayName:"Neighborhood public library",
      locality:"Tbilisi",country:"Georgia",countryCode:"GE",
      lat:41.7151,long:44.8271,
    }],
  });

  assert.equal(location.current, true);
  assert.equal(location.displayName, "Neighborhood public library");
  assert.equal(location.locality, "Tbilisi");
  assert.equal(location.countryCode, "GE");
  assert.equal(location.authority, "live_world_place");
  assert.equal(location.lat,41.7151);
  assert.equal(location.long,44.8271);
});

test("unlocated historical World context cannot masquerade as present geography",()=>{
  const location=projectCurrentThreadLocation({
    entry,
    currentSituation:{
      establishedAt:"2026-09-25T18:00:00.000Z",
      location:{kind:"place",placeRef:"wpl_context_only"},
    },
    worldPlaces:[{ref:"wpl_context_only",displayName:"Studying at home"}],
  });
  assert.equal(location,null,
    "World context inherited birth coordinates without an identified venue");
});



test("authoritative situated place prose resolves a uniquely named locality", () => {
  const location = projectCurrentThreadLocation({
    entry:{ threadId:"thr_legacy_situated", birthPlace:null, birthLocation:null },
    currentSituation:{
      establishedAt:"2026-09-25T18:00:00.000Z",
      location:{ kind:"place", placeRef:"per:plce_tbilisi_home:1" },
    },
    placeEpisodes:[{
      episodeId:"plce_tbilisi_home",
      revision:1,
      threadId:"thr_legacy_situated",
      episodeKind:"formative_presence",
      place:{
        placeId:"place_home",
        displayName:"A mid-rise apartment building in Tbilisi's Saburtalo district near shops and bus routes.",
        countryCode:null,
        region:null,
        locality:null,
        precision:"unspecified",
      },
      startAt:"2026-09-25T10:00:00.000Z",
      endAt:null,
      sourceReferences:["evt_tbilisi_home"],
      visibility:"private",
      status:"current",
      provenance:"genesis_created",
      recordedAt:"2026-09-25T10:00:00.000Z",
    }],
  });

  assert.equal(location?.locality, "Tbilisi", "situated Thread stayed unmapped despite explicit locality evidence");
  assert.equal(location?.country, "Georgia");
  assert.equal(location?.countryCode, "GE");
  assert.equal(location?.current, true);
});

test("missing LivedNow never plots birthplace as current presence", () => {
  const location = projectCurrentThreadLocation({
    entry,
    currentSituation:null,
  });

  assert.equal(location, null, "Threads-now map must not substitute birthplace for current World presence");
});


test("unresolved current place never falls back to birthplace", () => {
  const location = projectCurrentThreadLocation({
    entry,
    currentSituation:{
      establishedAt:"2026-09-25T18:00:00.000Z",
      location:{ kind:"place", placeRef:"per:missing_current_place:1" },
    },
  });

  assert.equal(location, null, "unresolved current place was plotted as birthplace");
});

test("operator-attested private locality maps at city precision, never a home address",()=>{
  const location=projectCurrentThreadLocation({
    currentSituation:{
      establishedAt:"2026-10-17T01:00:00.000Z",
      location:{kind:"place",placeRef:"per:plce_home:1"},
    },
    privatePlace:{
      placeRef:"per:plce_home:1",
      threadId:"thr_person",specificPlace:"Private residence at 12 Example Street",
      streetAddress:"12 Example Street",lat:38.732,long:-9.12,
      locality:"Lisbon",country:"Portugal",countryCode:"PT",
      publicGranularity:"city",
    },
  });
  assert.equal(location?.locality,"Lisbon","operator place did not establish current city");
  assert.equal(location?.lat,38.72509,"map location used precise residence coordinates");
  assert.equal(location?.long,-9.1498,"map location used precise residence coordinates");
  assert.equal(location?.authority,"world_private_place_locality");
  assert.equal(JSON.stringify(location).includes("Example Street"),false,
    "private street address leaked into the Thread location projection");
  assert.equal(projectCurrentThreadLocation({currentSituation:null,privatePlace:{
    placeRef:"per:plce_home:1",locality:"Lisbon",country:"Portugal",
    countryCode:"PT",publicGranularity:"city",
  }}),null,"private location created a current life that did not exist");
});

test("an attested modern Genesis transit anchors its distinct home in the same city",()=>{
  const place=(threadId,seed,kind)=>({
    episodeId:`plce_${kind}_${threadId}`,revision:1,threadId,
    episodeKind:"formative_presence",provenance:"genesis_created",
    place:{placeId:`place_modern_${seed}_${kind}`,
      displayName:"An ordinary "+kind+" place",countryCode:null,
      region:null,locality:null,precision:"unspecified"},
    startAt:"2026-01-01T10:00:00.000Z",endAt:null,
    sourceReferences:["evt_modern_birth"],
    visibility:"private",recordedAt:"2026-10-17T03:38:00.000Z",
  });
  const threadId="thr_omar_london",source=place(threadId,"4572b13ec97a","transit");
  const home=place(threadId,"4572b13ec97a","home");
  const locatedContexts=[{
    placeEpisode:source,
    privatePlace:{
      threadId,placeRef:`per:${source.episodeId}:1`,
      locality:"London",country:"United Kingdom",countryCode:"GB",
      streetAddress:null,publicGranularity:"city",
    },
  }];
  const contextLocations=genesisContextLocations([home],locatedContexts);
  assert.equal(contextLocations.length,1,
    "a known Genesis home remained unmapped after its sibling transit was located");
  const result=projectCurrentThreadLocation({
    currentSituation:{
      threadId,establishedAt:"2026-10-17T04:15:00.002Z",
      location:{kind:"place",placeRef:`per:${home.episodeId}:1`},
    },
    placeEpisodes:[home],contextLocations,
  });
  assert.equal(result.locality,"London");
  assert.equal(result.countryCode,"GB");
  assert.equal(result.authority,"genesis_context_locality");
  assert.equal(result.displayName,"London, United Kingdom");
  assert.equal(JSON.stringify(result).includes("streetAddress"),false,
    "a private address escaped through inferred city-level context");
  assert.deepEqual(genesisContextLocations([place(threadId,"999999999999","home")],
    locatedContexts),[],"unrelated Genesis contexts inherited a previous residence");
  assert.deepEqual(genesisContextLocations([place("thr_other","4572b13ec97a","home")],
    locatedContexts),[],"one Thread inherited another's private locality");
  assert.deepEqual(genesisContextLocations([{
    ...home,provenance:"thread_history",
  }],locatedContexts),[],"a later lived place was treated as a Genesis sibling");
});

test("conflicting source attestations do not manufacture a current city",()=>{
  const mk=(episodeId,kind)=>({
    episodeId,revision:1,threadId:"thr_conflict",
    episodeKind:"formative_presence",provenance:"genesis_created",
    place:{placeId:`place_modern_97e4cb643db2_${kind}`,
      displayName:"Ordinary "+kind,countryCode:null,
      region:null,locality:null,precision:"unspecified"},
    startAt:"2026-01-01T10:00:00.000Z",endAt:null,
    sourceReferences:["evt_modern_birth"],visibility:"private",
    recordedAt:"2026-10-17T03:38:00.000Z",
  });
  const home=mk("plce_home","home");
  const locatedContexts=["Fes","London"].map((city,index)=>{
    const episode=mk(`plce_source_${index}`,index===0?"transit":"commerce");
    return {placeEpisode:episode,privatePlace:{
      threadId:"thr_conflict",placeRef:`per:${episode.episodeId}:1`,
      locality:city,country:index===0?"Morocco":"United Kingdom",
      countryCode:index===0?"MA":"GB",publicGranularity:"city",
    }};
  });
  assert.deepEqual(genesisContextLocations([home],locatedContexts),[],
    "contradictory situated localities were silently reconciled");
});

test("explicit current-place locality and private disclosure outrank sibling hints",()=>{
  const currentSituation={
    establishedAt:"2026-10-17T04:15:00.002Z",
    location:{kind:"place",placeRef:"per:pep_paris:1"},
  };
  const placeEpisodes=[{
    episodeId:"pep_paris",revision:1,threadId:"thr_person",
    episodeKind:"residence",provenance:"genesis_created",
    place:{placeId:"place_modern_4572b13ec97a_home",
      displayName:"Home in Paris",locality:"Paris",countryCode:"FR",
      region:null,precision:"locality"},
    startAt:"2026-01-01T00:00:00.000Z",endAt:null,
    sourceReferences:["evt_origin"],visibility:"private",
    recordedAt:"2026-10-17T03:38:00.000Z",
  }];
  const contextLocations=[{placeRef:"per:pep_paris:1",geography:{
    city:"London",country:"United Kingdom",countryCode:"GB",
    lat:51.50853,long:-0.12574,
  }}];
  // This may legitimately be a different locality than the originating
  // context, and must not be overwritten by the sibling's locality.
  // Check against a resolver-supported explicit city (London here),
  // keeping the same-location test independent of unknown gazetteer entries.
  const explicit={...placeEpisodes[0],place:{
    ...placeEpisodes[0].place,displayName:"Home in Fes",locality:"Fes",countryCode:"MA",
  }};
  const located=projectCurrentThreadLocation({
    currentSituation,placeEpisodes:[explicit],contextLocations,
  });
  assert.equal(located.locality,"Fes","Genesis context overrode explicit current locality");
  const hidden=projectCurrentThreadLocation({
    currentSituation,placeEpisodes:[explicit],contextLocations,
    privatePlace:{placeRef:"per:pep_paris:1",publicGranularity:"hidden"},
  });
  assert.equal(hidden,null,"hidden private geography was exposed by a sibling");
});

test("God-view preserves a hidden home's attested current city without inventing address or attendance",()=>{
  const currentSituation={
    establishedAt:"2026-10-17T05:00:00.000Z",
    location:{kind:"place",placeRef:"per:tbilisi-home:1"},
  };
  const privatePlace={
    placeRef:"per:tbilisi-home:1",threadId:"thr_tbilisi",
    specificPlace:"A family apartment in Saburtalo",
    streetAddress:null,lat:null,long:null,
    locality:"Tbilisi",country:"Georgia",countryCode:"GE",
    publicGranularity:"hidden",
  };
  const operator=projectOperatorCurrentPlace({currentSituation,privatePlace});
  assert.equal(operator?.specificPlace,"A family apartment in Saburtalo");
  assert.equal(operator?.locality,"Tbilisi");
  assert.equal(operator?.mapPrecision,"city");
  assert.equal(operator?.streetAddress,null);
  assert.ok(Number.isFinite(operator?.lat)&&Number.isFinite(operator?.long),
    "God-view cannot plot an attested current city");
  assert.equal(projectCurrentThreadLocation({currentSituation,privatePlace}),null,
    "public disclosure was widened by an operator-only map position");
  assert.equal(projectOperatorCurrentPlace({
    currentSituation:{...currentSituation,location:{kind:"place",placeRef:"per:different-home:1"}},
    privatePlace,
  }),null,"an earlier home masqueraded as the actual current home");
  assert.equal(projectOperatorCurrentPlace({
    currentSituation:{...currentSituation,location:{kind:"transit",
      fromPlaceRef:"per:tbilisi-home:1",toPlaceRef:"per:elsewhere:1"}},
    privatePlace,
  }),null,"a journey was falsely fixed at its point of departure");
});

test("a hidden private sibling can inform its Thread without becoming public geography",()=>{
  const threadId="thr_private_context";
  const episode=(kind)=>({
    episodeId:"pep_"+kind,revision:1,threadId,
    episodeKind:"formative_presence",provenance:"genesis_created",
    place:{placeId:"place_modern_97e4cb643db2_"+kind,displayName:kind,
      locality:null,countryCode:null,region:null,precision:"unspecified"},
    startAt:"2026-01-01T00:00:00.000Z",endAt:null,
    sourceReferences:["evt_birth"],visibility:"private",
    recordedAt:"2026-10-17T03:38:00.000Z",
  });
  const home=episode("home"),source=episode("transit");
  const anchor=[{placeEpisode:source,privatePlace:{
    threadId,placeRef:"per:pep_transit:1",
    locality:"Fes",country:"Morocco",countryCode:"MA",
    publicGranularity:"hidden",
  }}];
  assert.deepEqual(genesisContextLocations([home],anchor),[],
    "private World city escaped through the normal public projection");
  const owned=genesisContextLocations([home],anchor,{privatePerspective:true});
  assert.equal(owned.length,1,
    "the Thread's own known locality disappeared with public disclosure");
  assert.equal(owned[0].geography.city,"Fes");
});

test("God-view follows a Thread to a different Genesis home without fabricating public location",()=>{
  const threadId="thr_kaohsiung";
  const episode=(kind)=>({
    episodeId:"pep_"+kind,revision:1,threadId,
    episodeKind:"formative_presence",provenance:"genesis_created",
    place:{placeId:"place_modern_eb39aeda7e03_"+kind,
      displayName:"place_modern_eb39aeda7e03_"+kind,
      locality:null,countryCode:null,region:null,precision:"unspecified"},
    startAt:"2026-01-01T00:00:00.000Z",endAt:null,
    sourceReferences:["evt_birth"],visibility:"private",
    recordedAt:"2026-10-17T03:38:00.000Z",
  });
  const transit=episode("transit"),home=episode("home");
  const source=[{placeEpisode:transit,privatePlace:{
    threadId,placeRef:"per:pep_transit:1",
    locality:"Kaohsiung",country:"Taiwan",countryCode:"TW",
    publicGranularity:"hidden",
  }}];
  const publicContext=genesisContextLocations([home],source);
  const ownedContext=genesisContextLocations(
    [home],source,{privatePerspective:true},
  );
  const situation={threadId,establishedAt:"2026-10-17T06:00:00.000Z",
    location:{kind:"place",placeRef:"per:pep_home:1"}};
  assert.equal(projectCurrentThreadLocation({
    currentSituation:situation,placeEpisodes:[home],
    contextLocations:publicContext,
  }),null,"private sibling locality escaped into public presence");
  const current=projectOperatorCurrentPlace({
    currentSituation:situation,placeEpisodes:[home],
    privateContextLocations:ownedContext,
  });
  assert.equal(current?.locality,"Kaohsiung",
    "God-view lost a current home in an attested Genesis city");
  assert.equal(current?.countryCode,"TW");
  assert.equal(current?.placeRef,"per:pep_home:1",
    "the previous transit was substituted for the current home");
  assert.equal(current?.mapPrecision,"city");
  assert.equal(current?.streetAddress,null,
    "Genesis inferred a nonexistent residence address");
  assert.equal(projectOperatorCurrentPlace({
    currentSituation:{...situation,location:{
      kind:"place",placeRef:"per:pep_unrelated:1",
    }},
    placeEpisodes:[home],privateContextLocations:ownedContext,
  }),null,"the Thread was located at an unrelated current place");
});

test("a Genesis learning place keeps its own identity and inherits only an attested local city",()=>{
  const threadId="thr_chen",seed="eb39aeda7e03";
  const transit={
    episodeId:"plce_transit",revision:1,threadId,
    episodeKind:"formative_presence",provenance:"genesis_created",
    place:{placeId:`place_modern_${seed}_transit`,
      displayName:"Local transit",locality:null,countryCode:null,
      region:null,precision:"unspecified"},
    startAt:"2026-01-01T10:00:00.000Z",endAt:null,
    sourceReferences:["evt_origin"],visibility:"private",
    recordedAt:"2026-10-17T03:38:00.000Z",
  };
  const attestation=[{
    placeEpisode:transit,privatePlace:{
      threadId,placeRef:"per:plce_transit:1",
      locality:"Kaohsiung",country:"Taiwan",countryCode:"TW",
      publicGranularity:"hidden",
    },
  }];
  const learning={
    ref:"wpl_genesis_learning",authority:"live-world-place-admission-v1",
    sourceWorldRef:"world_chen",sourcePlaceId:`place_modern_${seed}_learning`,
    placeKind:"library_or_learning",
    displayName:"A neighborhood learning setting",
  };
  assert.equal(isModernGenesisWorldPlace(learning),true);
  const privateContextLocations=genesisContextLocations([],
    attestation,{privatePerspective:true,worldPlaces:[learning],threadId});
  assert.equal(privateContextLocations.length,1,
    "a real Genesis learning context lost its geographic origin");
  const situation={
    threadId,establishedAt:"2026-10-17T06:00:00.002Z",
    location:{kind:"place",placeRef:learning.ref},
  };
  const current=projectOperatorCurrentPlace({
    currentSituation:situation,worldPlaces:[learning],privateContextLocations,
  });
  assert.equal(current?.placeRef,learning.ref,
    "God-view substituted the prior transit for the current learning place");
  assert.equal(current?.locality,"Kaohsiung");
  assert.equal(current?.countryCode,"TW");
  assert.equal(current?.mapPrecision,"city");
  assert.equal(current?.specificPlace,learning.displayName);
  assert.equal(current?.streetAddress,null,
    "a local learning context manufactured a street address");
  assert.equal(learning.physicalVenue,undefined,
    "a Genesis learning place was presented as an independently admitted venue");
  const independentlyBound={
    ...learning,physicalVenue:{ref:"venue_tbilisi_library",
      displayName:"Independent public library",locality:"Tbilisi",country:"Georgia"},
  };
  assert.equal(isModernGenesisWorldPlace(independentlyBound),false,
    "an externally admitted venue was treated as an unlocated Genesis context");
  const bound=projectCurrentThreadLocation({
    currentSituation:situation,worldPlaces:[independentlyBound],
    contextLocations:privateContextLocations,
  });
  assert.equal(bound?.locality,"Tbilisi",
    "Genesis locality overrode an independently attested venue");
  assert.equal(bound?.authority,"world_venue_locality");
  assert.equal(projectCurrentThreadLocation({
    currentSituation:situation,worldPlaces:[learning],
  }),null,"unlocated historical WorldSpec place acquired geography without evidence");
  assert.deepEqual(genesisContextLocations([],attestation,{
    privatePerspective:true,threadId,
    worldPlaces:[{...learning,sourcePlaceId:"place_modern_aabbccddeeff_learning"}],
  }),[],"unrelated WorldSpec places inherited another locality");
  assert.deepEqual(genesisContextLocations([],attestation,{
    privatePerspective:true,threadId:"thr_other",worldPlaces:[learning],
  }),[],"a Thread inherited someone else's admitted private locality");
  assert.deepEqual(genesisContextLocations([],attestation,{
    privatePerspective:true,threadId,
    worldPlaces:[{...learning,authority:"world-public-place-v1"}],
  }),[],"public venue identity was confused with an historical Genesis context");
});


test("a newly discovered city has map geography without becoming a public venue",()=>{
  const placeRef="wpl_thread_discovered_porto";
  const projection=projectOperatorCurrentPlace({
    currentSituation:{threadId:"thr_victor",establishedAt:"2026-10-17T15:00:00Z",
      location:{kind:"place",placeRef}},
    privatePlace:{threadId:"thr_victor",placeRef,specificPlace:"Porto, Portugal",
      streetAddress:null,lat:null,long:null,locality:"Porto",
      country:"Portugal",countryCode:"PT",publicGranularity:"hidden"},
    worldLocality:{locality:"Porto",country:"Portugal",countryCode:"PT",
      lat:41.1496,long:-8.6109,timeZone:"Europe/Lisbon",
      evidenceRef:"fixture:porto"},
  });
  assert.equal(projection?.locality,"Porto");
  assert.equal(projection?.mapPrecision,"city");
  assert.equal(projection?.lat,41.1496);
  assert.equal(projection?.streetAddress,null,
    "city grounding invented a private street address");
});
