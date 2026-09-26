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

test("masked inherited material can reappear in a grandchild",()=>{
  const hidden={value:-.9,dominance:-.9};
  const visible={value:.8,dominance:.9};
  const weak={value:.2,dominance:-.8};
  const grandmother=parent(),grandfather=parent(.1);
  grandmother.loci.pigmentation=[visible,hidden];
  grandfather.loci.pigmentation=[visible,visible];

  const child=recombinePhysicalGenomes({maternalGenome:grandmother,paternalGenome:grandfather,seed:"child-0"});
  assert.deepEqual(child.loci.pigmentation[0],hidden,"hidden allele must pass");
  assert.equal(expressPhysicalGenome(child).pigmentation,visible.value,"hidden allele must stay masked");

  const otherParent=parent(.2);
  otherParent.loci.pigmentation=[weak,weak];
  const grandchild=recombinePhysicalGenomes({maternalGenome:child,paternalGenome:otherParent,seed:"grandchild-0"});
  assert.deepEqual(grandchild.loci.pigmentation[0],hidden,"hidden allele must reach grandchild");
  assert.equal(expressPhysicalGenome(grandchild).pigmentation,hidden.value,"inherited allele must reappear");
});
