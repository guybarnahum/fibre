import test from "node:test";
import assert from "node:assert/strict";
import {
  createPhysicalGenome,
  physicalGenomeLoci,
  resolveBirthPhysicalInheritance
} from "../src/human-phenotype/index.mjs";

const genome=offset=>createPhysicalGenome(Object.fromEntries(physicalGenomeLoci.map((name,i)=>[
  name,[{value:((i%5)-2)/3+offset,dominance:.2},{value:((i%7)-3)/4-offset,dominance:-.2}]
])));

const maternalAncestry=[{population:"maternal-history",share:1,referencePopulation:"afr_west"}];
const paternalAncestry=[{population:"paternal-history",share:1,referencePopulation:"eur_north"}];

test("birth inheritance uses real parent genomes without ancestry",()=>{
  const maternalGenome=genome(-.05),paternalGenome=genome(.08);
  const a=resolveBirthPhysicalInheritance({maternalGenome,paternalGenome,seed:"two-parents"});
  const b=resolveBirthPhysicalInheritance({
    maternalGenome,paternalGenome,
    maternalAncestry:[{population:"irrelevant",share:1,referencePopulation:"east_asia"}],
    paternalAncestry:[{population:"irrelevant",share:1,referencePopulation:"south_asia"}],
    seed:"two-parents"
  });
  assert.equal(a.parents.maternal.source,"parent","mother must remain genetic authority");
  assert.equal(a.parents.paternal.source,"parent","father must remain genetic authority");
  assert.deepEqual(a.genome,b.genome,"ancestry must not alter two-parent inheritance");
});

test("birth inheritance creates only the missing founder genome",()=>{
  const maternalGenome=genome(-.05);
  const child=resolveBirthPhysicalInheritance({
    maternalGenome,
    paternalAncestry,
    seed:"one-parent"
  });
  assert.equal(child.parents.maternal.source,"parent","real mother must remain authority");
  assert.equal(child.parents.paternal.source,"founder","missing father must use founder genetics");
  assert.deepEqual(child.parents.maternal.genome,maternalGenome,"real parent genome must be preserved");
});

test("parentless birth creates two founders then uses ordinary recombination",()=>{
  const a=resolveBirthPhysicalInheritance({maternalAncestry,paternalAncestry,seed:"founder-birth"});
  const replay=resolveBirthPhysicalInheritance({maternalAncestry,paternalAncestry,seed:"founder-birth"});
  assert.equal(a.parents.maternal.source,"founder","missing mother must use founder genetics");
  assert.equal(a.parents.paternal.source,"founder","missing father must use founder genetics");
  assert.deepEqual(a,replay,"founder birth must replay");
  for(const locus of physicalGenomeLoci) {
    assert.ok(a.parents.maternal.genome.loci[locus].some(x=>x.value===a.genome.loci[locus][0].value&&x.dominance===a.genome.loci[locus][0].dominance),"mother must contribute");
    assert.ok(a.parents.paternal.genome.loci[locus].some(x=>x.value===a.genome.loci[locus][1].value&&x.dominance===a.genome.loci[locus][1].dominance),"father must contribute");
  }
});
