// Verification of an enacted, located present—not of a birth profile.
export function newbornLocationStatus(observatory){
  const lived=observatory?.livedNow;
  const situation=lived?.currentSituation;
  if(!situation)return {state:"awaiting_first_life",location:null};
  if(situation.location?.kind!=="place")return {state:"not_at_place",location:null};
  const placeRef=situation.location.placeRef;
  const located=[lived.privatelyKnownCurrentPlace,lived.currentLocation]
    .find(place=>place?.placeRef===placeRef
      &&typeof place.locality==="string"&&place.locality.trim()
      &&typeof place.countryCode==="string"&&place.countryCode.trim());
  return located?{state:"located",location:{
    locality:located.locality,countryCode:located.countryCode,
  }}:{state:"missing_current_location",location:null};
}
