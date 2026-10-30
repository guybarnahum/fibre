import {sha256} from "./state-codec.mjs";
import {GENESIS_DEVELOPMENT_REQUEST_VERSION} from "./genesis-development-plan.mjs";
import {canonicalJson} from "./genesis-development-contracts.mjs";
import {genesisSexForThread} from "./genesis-sex.mjs";
import {selectName,choosePlaceCouple,chooseChildTradition,chooseHouseholdPattern} from "./place-population.mjs";

function unit(seed){
  return Number.parseInt(sha256(seed).slice(0,12),16)/0x1000000000000;
}
function age(requestId,role){
  return 24+Math.floor(unit(requestId+":"+role+":parent-age")*15);
}
export function parentAgesAtBirth(requestId){
  return Object.freeze({mother:age(requestId,"mother"),father:age(requestId,"father")});
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

export function drawBirthHousehold({place,requestId}){
  const pattern=chooseHouseholdPattern({place,requestId});
  const {mother,father}=parentAgesAtBirth(requestId);
  const oldestGap=Math.min(8,Math.min(mother,father)-18);
  const siblings=Array.from({length:pattern.siblings},(_,index)=>{
    const gap=1+Math.floor(unit(requestId+":sibling:"+index+":gap")*8);
    const older=unit(requestId+":sibling:"+index+":older")<0.5 && oldestGap>=1;
    return {
      sex:unit(requestId+":sibling:"+index+":sex")<0.5?"female":"male",
      relativeAge:older?"older":"younger",
      gapYears:older?Math.min(gap,oldestGap):gap,
    };
  });
  return Object.freeze({caregivers:[...pattern.caregivers],siblings});
}

export function composeParentage({
  requestId,chronology,selector,place,selected,traditions,sex,redraw=0,
  householdPattern=null,
}){
  const mom=traditions[selected.mother.originId];
  const dad=traditions[selected.father.originId];
  const child=traditions[selected.childOriginId];
  if(!mom||!dad||!child)throw new TypeError("Parentage requires pinned naming traditions");
  const year=Number(chronology.bornAt.slice(0,4));
  const {mother:motherAge,father:fatherAge}=parentAgesAtBirth(requestId);
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
  const draw=householdPattern??drawBirthHousehold({place,requestId});
  const caregivers=[...draw.caregivers];
  const parentParticipants=[
    {role:"mother",name:motherName,born:motherBorn,parentAge:motherAge,
      origin:selected.mother.label},
    {role:"father",name:fatherName,born:fatherBorn,parentAge:fatherAge,
      origin:selected.father.label},
  ].map(parent=>{
    const livesHere=caregivers.includes(parent.role);
    return {
      participantId:parent.role,
      factualRoles:[parent.role,...(livesHere?["caregiver"]:[])],
      relationshipFacts:[
        "The subject's "+parent.role+" is "+parent.name+".",
        "Born approximately "+parent.born+"; age "+parent.parentAge+" at the subject's birth.",
        "Family roots: "+parent.origin+".",
        livesHere?"Lives in the subject's household.":"Does not live in the subject's household.",
      ],
    };
  });
  const grandparents=["grandmother","grandfather"].filter(role=>caregivers.includes(role))
    .map(role=>{
      const maternal=unit(requestId+":grandparent:"+role+":line")<0.5;
      const side=maternal?"maternal":"paternal";
      return {
        participantId:role,
        factualRoles:[role,"caregiver"],
        relationshipFacts:[
          "The subject's "+side+" "+role+" lives in the household.",
          "Family roots: "+(maternal?selected.mother.label:selected.father.label)+".",
        ],
      };
    });
  const usedNames=new Set([sex==="female"?femaleName:maleName]);
  const siblings=draw.siblings.map((sibling,index)=>{
    const list=sibling.sex==="female"?child.childFemaleGivenNames:child.childMaleGivenNames;
    const surname=childFamilyFor(sibling.sex);
    let name;
    for(let trial=0;trial<list.length;trial++){
      const given=selectName(list,requestId,"sibling-"+index+"-given",trial);
      const candidate=fullName(given,surname,child);
      if(!usedNames.has(candidate)){name=candidate;break;}
    }
    if(!name)throw new TypeError("Naming tradition cannot distinguish siblings");
    usedNames.add(name);
    return {name,sex:sibling.sex,relativeAge:sibling.relativeAge,gapYears:sibling.gapYears};
  });
  const siblingParticipants=siblings.map((sibling,index)=>({
    participantId:"sibling_"+(index+1),
    factualRoles:["sibling",sibling.sex==="female"?"sister":"brother"],
    relationshipFacts:[
      sibling.name+" is the subject's "+(sibling.sex==="female"?"sister":"brother")+".",
      "Lives in the household; "+sibling.gapYears+" year(s) "+sibling.relativeAge+" than the subject.",
    ],
  }));
  const familyRelations=[
    ...parentParticipants.map(parent=>parent.relationshipFacts[0]),
    ...grandparents.map(grandparent=>grandparent.relationshipFacts[0]),
    ...siblingParticipants.map(sibling=>sibling.relationshipFacts.join(" ")),
  ];
  const description="The subject lives in "+selector.city+" with "+
    [...caregivers.map(role=>{
      if(role==="mother")return "mother "+motherName;
      if(role==="father")return "father "+fatherName;
      return "a "+role;
    }),...siblings.map(sibling=>sibling.name+" ("+sibling.relativeAge+" sibling)")].join(", ")+
    ". "+(siblings.length===0?"There are no siblings in this household.":"");
  const household=Object.freeze({
    caregivers,siblings,description,familyRelations,
  });
  const parents=[...parentParticipants,...grandparents,...siblingParticipants];
  return Object.freeze({
    selected,sex,redraw,
    femaleName,maleName,issuedName:sex==="female"?femaleName:maleName,
    mother:Object.freeze({name:motherName,originId:selected.mother.originId,
      originLabel:selected.mother.label,birthDecade:Math.floor(motherBorn/10)*10,
      geneticProvenance:"synthetic_genetic_ancestor"}),
    father:Object.freeze({name:fatherName,originId:selected.father.originId,
      originLabel:selected.father.label,birthDecade:Math.floor(fatherBorn/10)*10,
      geneticProvenance:"synthetic_genetic_ancestor"}),
    mixed:selected.mother.originId!==selected.father.originId,
    childGivenNameTradition:selected.childOriginId,
    household,family,participants:parents,
  });
}
