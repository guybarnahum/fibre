import {sha256} from "./state-codec.mjs";
import {GENESIS_DEVELOPMENT_REQUEST_VERSION} from "./genesis-development-plan.mjs";
import {canonicalJson} from "./genesis-development-contracts.mjs";
import {genesisSexForThread} from "./genesis-sex.mjs";
import {selectName,choosePlaceCouple,chooseChildTradition} from "./place-population.mjs";

function unit(seed){
  return Number.parseInt(sha256(seed).slice(0,12),16)/0x1000000000000;
}
function age(requestId,role){
  return 24+Math.floor(unit(requestId+":"+role+":parent-age")*15);
}
function fullName(given,surname,convention){
  return convention.nameOrder==="family_given"
    ? surname+" "+given : given+" "+surname;
}
function distinct(value){
  return [...new Set(value.map(text=>text.trim()).filter(Boolean))];
}

// The planned Thread ID depends only on requestId, not the child's chosen name.
export function birthSex(requestId,explicit=null){
  if(explicit!==null)return explicit;
  const digest=sha256(canonicalJson({
    policy:GENESIS_DEVELOPMENT_REQUEST_VERSION,kind:"thread",requestId,
  }));
  return genesisSexForThread({threadId:"thr_"+digest.slice(0,40)});
}

export function selectedOrigins({place,requestId,heritage=null}){
  const selected=choosePlaceCouple({place,requestId,heritage});
  const childOriginId=chooseChildTradition({couple:selected.couple,place,requestId});
  return Object.freeze({...selected,childOriginId});
}

export function requiredNamingOrigins(selected){
  return [...new Set([selected.mother.originId,selected.father.originId,selected.childOriginId])];
}

export function composeParentage({
  requestId,chronology,selector,place,selected,traditions,sex,redraw=0,
}){
  const mom=traditions[selected.mother.originId];
  const dad=traditions[selected.father.originId];
  const child=traditions[selected.childOriginId];
  if(!mom||!dad||!child)throw new TypeError("Parentage requires pinned naming traditions");
  const year=Number(chronology.bornAt.slice(0,4));
  const motherAge=age(requestId,"mother"),fatherAge=age(requestId,"father");
  const motherBorn=year-motherAge,fatherBorn=year-fatherAge;
  const motherDecade=Math.floor(motherBorn/10)*10;
  const fatherDecade=Math.floor(fatherBorn/10)*10;
  const motherNames=mom.parentNamesByDecade.find(group=>group.decade===motherDecade);
  const fatherNames=dad.parentNamesByDecade.find(group=>group.decade===fatherDecade);
  if(!motherNames||!fatherNames)
    throw new TypeError("Named parents lack their own birth-decade material");
  const motherGiven=selectName(motherNames.femaleGivenNames,requestId,"mother-given");
  const fatherGiven=selectName(fatherNames.maleGivenNames,requestId,"father-given");
  const motherFamily=selectName(mom.familyNames,requestId,"mother-family");
  const fatherFamily=selectName(dad.familyNames,requestId,"father-family");
  const motherName=fullName(motherGiven,motherFamily,mom);
  const fatherName=fullName(fatherGiven,fatherFamily,dad);
  const childFamilyFor=chosenSex=>{
    switch(child.transmission){
      case "mother":return motherFamily;
      case "father":return fatherFamily;
      case "mother+father":return motherFamily+child.joiner+fatherFamily;
      case "patronymic":return fatherGiven+
        (chosenSex==="female"?child.patronymicFemaleSuffix:child.patronymicMaleSuffix);
      default:throw new TypeError("Unsupported naming transmission");
    }
  };
  const femaleGiven=selectName(child.childFemaleGivenNames,requestId,"child-female",redraw);
  const maleGiven=selectName(child.childMaleGivenNames,requestId,"child-male",redraw);
  const femaleName=fullName(femaleGiven,childFamilyFor("female"),child);
  const maleName=fullName(maleGiven,childFamilyFor("male"),child);
  if(femaleName===maleName)throw new TypeError("Selected child sex names are identical");
  const origins=[selected.mother,selected.father];
  const raised=[];
  for(let i=0;i<2;i++){
    const origin=origins[i];
    if(unit(requestId+":"+i+":retention")<origin.householdRetentionRate){
      for(const language of origin.heritageLanguages){
        if(!raised.includes(language))raised.push(language);
      }
    }
  }
  if(raised.length===0)raised.push(place.schoolingLanguages[0]);
  const raisedLanguages=distinct(raised).slice(0,3);
  const languages=distinct([...raisedLanguages,...place.schoolingLanguages]).slice(0,3);
  const lineage={
    maternal:selected.mother.referencePopulations,
    paternal:selected.father.referencePopulations,
  };
  const family={
    id:selected.mother.originId+"_"+selected.father.originId,
    familyOriginContext:"Mother's resident family origin: "+selected.mother.label+
      ". Father's resident family origin: "+selected.father.label+".",
    physicalAncestry:lineage,languages,raisedLanguages,
    nameOrder:child.nameOrder,
    femaleGivenNames:[femaleGiven],maleGivenNames:[maleGiven],
    familyNames:[childFamilyFor(sex)],
  };
  const parents=[
    {
      participantId:"mother",factualRoles:["mother","caregiver","synthetic_genetic_ancestor"],
      relationshipFacts:[
        "The subject's mother is "+motherName+".",
        "She was born in approximately "+motherBorn+" and had the subject at age "+motherAge+".",
        "Maternal family roots: "+selected.mother.label+".",
      ],
    },
    {
      participantId:"father",factualRoles:["father","caregiver","synthetic_genetic_ancestor"],
      relationshipFacts:[
        "The subject's father is "+fatherName+".",
        "He was born in approximately "+fatherBorn+" and had the subject at age "+fatherAge+".",
        "Paternal family roots: "+selected.father.label+".",
      ],
    },
    {
      participantId:"sibling_1",factualRoles:["sibling"],
      relationshipFacts:["Lives with the subject and is two years older."],
    },
  ];
  return Object.freeze({
    selected,sex,redraw,
    femaleName,maleName,issuedName:sex==="female"?femaleName:maleName,
    mother:Object.freeze({name:motherName,originId:selected.mother.originId,birthDecade:Math.floor(motherBorn/10)*10}),
    father:Object.freeze({name:fatherName,originId:selected.father.originId,birthDecade:Math.floor(fatherBorn/10)*10}),
    family,participants:parents,
  });
}
