import test from "node:test";
import assert from "node:assert/strict";
import {createPhysicalGenome,recombinePhysicalGenomes,expressPhysicalGenome,physicalGenomeLoci} from "../src/human-phenotype/index.mjs";

const parent=(offset=0)=>createPhysicalGenome(Object.fromEntries(physicalGenomeLoci.map((name,i)=>[
  name,[{value:((i%5)-2)/3+offset},{value:((i%7)-3)/4-offset}]
])));

test("a child inherits one allele from each parent and siblings can differ",()=>{
  const mother=parent(-.05),father=parent(.08);
  const a=recombinePhysicalGenomes({maternalGenome:mother,paternalGenome:father,seed:"child-a"});
  const replay=recombinePhysicalGenomes({maternalGenome:mother,paternalGenome:father,seed:"child-a"});
  const sibling=recombinePhysicalGenomes({maternalGenome:mother,paternalGenome:father,seed:"child-b"});
  assert.deepEqual(a,replay,"inheritance must replay");
  assert.notDeepEqual(a,sibling,"siblings should differ");
  for(const locus of physicalGenomeLoci){
    assert.ok(mother.loci[locus].some(x=>x.value===a.loci[locus][0].value),"mother must contribute");
    assert.ok(father.loci[locus].some(x=>x.value===a.loci[locus][1].value),"father must contribute");
  }
});

test("quantitative physical expression is additive",()=>{
  const genome=parent();
  genome.loci.pigmentation=[{value:-.8},{value:.4}];
  assert.equal(expressPhysicalGenome(genome).pigmentation,-.2,"physical expression must average inherited alleles");
});
