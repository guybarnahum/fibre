// How a Thread holds its own present in mind for a judgment about it: where it
// is, what it is doing and why, and whether it is awake. World identifiers,
// provenance and evidence references are for authority, not for thought.
export function situationInMind(situation,{placeName=null}={}){
  if(situation===null||situation===undefined)return null;
  return {
    since:situation.establishedAt??null,
    place:placeName??situation.mediatedContext??null,
    activity:situation.activity??null,
    outwardActivity:situation.outwardActivity??null,
    purpose:situation.reason??null,
    wakefulness:situation.wakefulness??null,
  };
}
