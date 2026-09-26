import test from "node:test";
import assert from "node:assert/strict";
import {createPhysicalGenome,recombinePhysicalGenomes,expressPhysicalGenome,physicalGenomeLoci} from "../src/human-phenotype/index.mjs";

const parent=(offset=0)=>createPhysicalGenome(Object.fromEntries(physicalGenomeLoci.map((name,i)=>[
  name,[{value:((i%5)-2)/3+offset,dominance:i%3===0?.7:0},{value:((i%7)-3)/4-offset,dominance:i%4===0?-.6:0}]
])));

test("a child inherits one allele from each parent and siblings can differ",()=>{
  const mother=parent(-.05),father=parent(.08);
  const a=recombinePhysicalGenomes({maternalGenome:mother,paternalGenome:father,seed:"child-a"});
  const replay=recombinePhysicalGenomes({maternalGenome:mother,paternalGenome:father,seed:"child-a"});
  const sibling=recombinePhysicalGenomes({maternalGenome:mother,paternalGenome:father,seed:"child-b"});
  assert.deepEqual(a,replay,"inheritance must replay");
  assert.notDeepEqual(a,sibling,"siblings should differ");
  for(const locus of physicalGenomeLoci){
    assert.ok(mother.loci[locus].some(x=>x.value===a.loci[locus][0].value&&x.dominance===a.loci[locus][0].dominance),"mother must contribute");
    assert.ok(father.loci[locus].some(x=>x.value===a.loci[locus][1].value&&x.dominance===a.loci[locus][1].dominance),"father must contribute");
  }
});

test("unexpressed inherited material can pass to a grandchild",()=>{
  const hidden={value:-.9,dominance:-.9};
  const mother=parent(),father=parent(.1);
  mother.loci.pigmentation=[{value:.8,dominance:.9},hidden];
  const childSeed=Array.from({length:64},(_,i)=>`child-${i}`).find(seed=>{
    const candidate=recombinePhysicalGenomes({maternalGenome:mother,paternalGenome:father,seed});
    return candidate.loci.pigmentation.some(x=>x.value===hidden.value&&x.dominance===hidden.dominance);
  });
  assert.ok(childSeed,"hidden allele should reach child");

  const child=recombinePhysicalGenomes({maternalGenome:mother,paternalGenome:father,seed:childSeed});
  const grandchildSeed=Array.from({length:64},(_,i)=>`grandchild-${i}`).find(seed=>{
    const grandchild=recombinePhysicalGenomes({maternalGenome:child,paternalGenome:father,seed});
    return grandchild.loci.pigmentation.some(x=>x.value===hidden.value&&x.dominance===hidden.dominance);
  });
  assert.ok(grandchildSeed,"hidden allele should reach grandchild");
  assert.ok(Number.isFinite(expressPhysicalGenome(child).pigmentation),"genome must express phenotype");
});
