import {assertPlainObject,assertNonEmpty} from "./persistence-common.mjs";

export const GUY_DISCOVERY_VERSION="guy-social-discovery-v1";
const MAX_QUESTION=500;
const MAX_RESULTS=8;

// A question is the asker's expressed interest, not authority to author
// another person's motives, whereabouts, consent, or social availability.
export function understandGuyQuestion({question,asker="human",location=null}={}){
  assertNonEmpty("Guy question",question);
  if(question.length>MAX_QUESTION)throw new TypeError("Guy question is too long");
  if(!["human","thread"].includes(asker))throw new TypeError("Guy asker must be human or thread");
  if(location!==null){
    assertPlainObject("Guy question location",location);
    if(Object.keys(location).some(key=>!["locality","countryCode"].includes(key))){
      throw new TypeError("Guy question location has unsupported fields");
    }
  }
  // Recognize an explicitly mentioned city as a search clue, not a
  // verified location of the asker. The eventual World source resolves it.
  const mentioned=question.match(/\b(?:in|near|around)\s+([\p{Lu}][\p{L}'-]*(?:\s+[\p{Lu}][\p{L}'-]*){0,3})/u)?.[1]??null;
  const locality=location?.locality??mentioned;
  if(locality!==null)assertNonEmpty("Guy locality",locality);
  const countryCode=location?.countryCode??null;
  if(countryCode!==null){
    if(typeof countryCode!=="string"||!/^[A-Z]{2}$/u.test(countryCode)){
      throw new TypeError("Guy countryCode must be a two-letter uppercase code");
    }
    if(locality===null)throw new TypeError("Guy countryCode requires a locality");
  }
  const mentionsThread=/\bthreads?\b/iu.test(question);
  const mentionsHuman=/\bhumans?\b|\bpeople\b|\bpersons?\b/iu.test(question);
  const seeking=mentionsThread?(mentionsHuman?"either":"thread"):"either";
  const mode=/\b(?:online|virtual|digitally|digital|remotely)\b/iu.test(question)
    ?"mediated":/\b(?:in.person|physically|face.to.face)\b/iu.test(question)
      ?"physical":"either";
  return Object.freeze({
    question:question.trim(),asker,seeking,mode,
    location:locality===null?null:Object.freeze({
      locality:locality.trim(),countryCode,
    }),
  });
}

function publicLead(place){
  // Project only the independently admitted PUBLIC venue. No plans,
  // current visitors, residences or private Thread state are read.
  if(place?.authority!=="world-public-place-v1"
    ||place.placeKind!=="public_venue"
    ||typeof place.ref!=="string"||typeof place.evidenceRef!=="string"){
    throw new TypeError("Guy may only present admitted public World places");
  }
  return Object.freeze({
    kind:"public_place",worldPlaceRef:place.ref,
    name:place.displayName,locality:place.locality,country:place.country,
    countryCode:place.countryCode,address:place.streetAddress,
    activities:Object.freeze([...place.affordances]),
    participation:"physical_place",
    attendance:"not_verified",
    threadMeeting:"not_verified",
    source:Object.freeze({
      directory:"fibre_places",kind:"world_admitted_place",
      evidenceRef:place.evidenceRef,
    }),
  });
}

export function createGuySocialDiscovery({listPublicPlaces}={}){
  if(typeof listPublicPlaces!=="function"){
    throw new TypeError("Guy requires bounded public place discovery");
  }
  return Object.freeze({
    ask(input){
      const understood=understandGuyQuestion(input);
      const {question,asker,seeking,mode,location}=understood;
      let places=[];
      let status="needs_location";
      let answer="Which city should I search? I can suggest possible social places, not promise company.";
      if(location!==null){
        const found=listPublicPlaces({
          locality:location.locality,countryCode:location.countryCode,limit:MAX_RESULTS,
        });
        if(!Array.isArray(found)||found.length>MAX_RESULTS){
          throw new TypeError("Guy's place source must return a bounded list");
        }
        const countries=[...new Set(found.map(p=>p.countryCode))];
        if(location.countryCode===null&&countries.length>1){
          status="needs_country";
          answer=`There is more than one listed country for ${location.locality}. Which country do you mean?`;
        }else{
          // A physical library does not establish a digital meeting channel.
          // Its presence in a directory is not Thread or human attendance.
          places=mode==="mediated"?[]:found.map(publicLead);
          status=places.length?"place_opportunities":"no_verified_options";
          const where=location.locality;
          if(mode==="mediated"){
            answer=`I have no verified digital meeting opportunities in ${where} from Fibre Places. Physical venue listings are not digital meeting channels.`;
          }else if(seeking==="thread"){
            answer=places.length
              ?`I found public places in ${where}, but none verifies that a Thread can be met there. A place listing is not attendance or a meeting invitation.`
              :`I have no verified Thread meeting opportunities in ${where} from Fibre Places. Other public directories are not yet connected.`;
          }else{
            answer=places.length
              ?`These are possible places to visit in ${where}. They may be empty; no one's attendance or willingness to talk is verified.`
              :`I have no listed public social places in ${where} from Fibre Places. That does not mean none exist; other directories are not yet connected.`;
          }
        }
      }
      return Object.freeze({
        version:GUY_DISCOVERY_VERSION,oracle:"Guy",
        question,asker,seeking,mode,location,status,answer,
        coverage:"fibre_places_only",
        places:Object.freeze(places),
      });
    },
  });
}
