import {sha256} from "./state-codec.mjs";
import {normalizeGenesisWorldSelector,composeGenesisWorldSelection} from "./genesis-world-selection.mjs";
import {selectBirthChronology} from "./birth-material.mjs";
import {composeGenesisBirthRequest} from "./genesis-birth-authoring.mjs";
import {composeParentage,requiredNamingOrigins} from "./birth-parentage.mjs";
import {chooseChildTradition} from "./place-population.mjs";
import {preflightGenesisAdmission} from "./birth-lifecycle.mjs";

// No model invocation, no World service calls, no development and no name
// reservation. Every database operation below is an indexed SELECT.
export function rehearseStoredBirth({store,place="United States/Hilo"}={}){
  if(!store?.storedBirthPreflightPlaces||!store?.storedBirthPreflightNames)
    throw new TypeError("Birth preflight requires a read-only lifecycle store");
  const selector=normalizeGenesisWorldSelector(place);
  for(const ref of store.storedBirthPreflightPlaces(selector.key)){
    const record=store.place(ref.placeKey,ref.version);
    if(!record?.authored?.originGroups)continue;
    const decade=Number(ref.placeKey.split(":").at(-1));
    if(!Number.isSafeInteger(decade)||decade%10!==0)continue;
    const traditionMap=store.storedBirthPreflightNames(ref.placeKey,String(decade));
    const origins=new Map(record.authored.originGroups.map(group=>[group.originId,group]));
    // Select a plausible existing pairing. Births already authored from this
    // Place prove the naming pools exist; do not author new pools during deploy.
    for(const couple of record.authored.couples){
      if(!traditionMap.has(couple.motherOriginId)||!traditionMap.has(couple.fatherOriginId))
        continue;
      for(let ordinal=0;ordinal<32;ordinal++){
        const requestId="birth-preflight-"+sha256(ref.placeKey+":"+ref.version+":"+ordinal).slice(0,24);
        const childOriginId=chooseChildTradition({couple,place:record.authored,requestId});
        if(!traditionMap.has(childOriginId))continue;
        const selected={couple,childOriginId,mother:origins.get(couple.motherOriginId),
          father:origins.get(couple.fatherOriginId)};
        if(!selected.mother||!selected.father)continue;
        const traditions=Object.fromEntries(requiredNamingOrigins(selected)
          .map(id=>[id,traditionMap.get(id)]));
        const requestedAt=new Date(Date.UTC(decade+23,6,1)).toISOString();
        const chronology=selectBirthChronology({requestId,requestedAt});
        const parentage=composeParentage({requestId,chronology,selector,
          place:record.authored,selected,traditions,sex:"female"});
        const selection=composeGenesisWorldSelection({
          selector,heritage:null,authored:record.authored,requestId,
          ...chronology,createdAt:record.createdAt,
          familyOverride:parentage.family,
          householdOverride:{...parentage.household,participants:parentage.participants},
        });
        const request=composeGenesisBirthRequest({
          requestId,requestedAt,selection,sexSelection:"female",
          calibrationModel:null,parentage,
        });
        preflightGenesisAdmission(request);
        return {place:selector.display,placeVersion:record.version,requestId,
          issuedName:parentage.issuedName,
          couple:couple.motherOriginId+" / "+couple.fatherOriginId};
      }
    }
  }
  throw new Error("Birth preflight: "+selector.display+
    " has no authored Place with complete pinned naming traditions");
}
