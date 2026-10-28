import test from "node:test";
import assert from "node:assert/strict";

import {selectSymbolicBirthLoci,SYMBOLIC_BIRTH_LOCUS_LIBRARY} from "./symbolic-locus-library.mjs";
import {selectBirthChronology} from "./birth-material.mjs";

test("newborn symbolic origin is repeatable, broad, ordinal and independent of fixture slots",()=>{
  assert.deepEqual(SYMBOLIC_BIRTH_LOCUS_LIBRARY.map(variants=>variants.length),
    [16,16,16,16,16,16]);
  const sample=selectSymbolicBirthLoci("birth-individual-1");
  assert.deepEqual(sample,selectSymbolicBirthLoci("birth-individual-1"),
    "resuming birth changed the selected dispositions");
  const births=Array.from({length:8},(_,index)=>
    selectSymbolicBirthLoci(`birth-individual-${index+1}`));
  assert.equal(new Set(births.map(b=>b.values.join("|"))).size,8,
    "eight newborns reused a whole symbolic genome");
  for(let ordinal=0;ordinal<6;ordinal++){
    assert.ok(new Set(births.map(b=>b.values[ordinal])).size>1,
      "ordinal has no individual temperamental variation");
    assert.equal(SYMBOLIC_BIRTH_LOCUS_LIBRARY[ordinal].includes(sample.values[ordinal]),true);
  }
});

test("newborn request chooses a unique 22-year chronology inside its birth window",()=>{
  const requestedAt="2026-10-28T06:30:00.000Z";
  const ids=["birth-individual-1","birth-individual-2","birth-individual-3"];
  const times=ids.map(requestId=>selectBirthChronology({requestId,requestedAt}));
  assert.deepEqual(times[0],selectBirthChronology({requestId:ids[0],requestedAt}),
    "resuming birth changed the birthday");
  assert.ok(new Set(times.map(t=>t.bornAt)).size>1,"births shared one fixed birthday");
  const lower=new Date(requestedAt),upper=new Date(requestedAt);
  lower.setUTCFullYear(lower.getUTCFullYear()-23);
  upper.setUTCFullYear(upper.getUTCFullYear()-22);
  for(const {bornAt,chronologyEndsAt} of times){
    assert.ok(Date.parse(bornAt)>=lower.getTime()&&Date.parse(bornAt)<upper.getTime(),
      "newborn birthdate escaped the 22-year entry window");
    const end=new Date(bornAt);
    end.setUTCFullYear(end.getUTCFullYear()+22);
    assert.equal(chronologyEndsAt,end.toISOString(),"Genesis did not end at age 22");
    assert.ok(Date.parse(chronologyEndsAt)<=Date.parse(requestedAt),
      "Genesis chronology extends into the future");
  }
});
