import {phenotypeFromPhysicalGenome,recombinePhysicalGenomes,sampleFounderPhysicalGenome} from "../../core/src/human-phenotype/index.mjs";

const AFR_WEST=[{population:"West African",share:1,referencePopulation:"afr_west"}];
const EUR_NORTH=[{population:"Northern European",share:1,referencePopulation:"eur_north"}];
const SOUTH_ASIA=[{population:"South Asian",share:1,referencePopulation:"south_asia"}];

const traits=genome=>phenotypeFromPhysicalGenome(genome).traits;
const child=(maternalGenome,paternalGenome,seed)=>recombinePhysicalGenomes({maternalGenome,paternalGenome,seed});

function family({id,maternalAncestry,paternalAncestry,siblings=4}){
  const maternalGenome=sampleFounderPhysicalGenome({ancestry:maternalAncestry,seed:`${id}:mother`});
  const paternalGenome=sampleFounderPhysicalGenome({ancestry:paternalAncestry,seed:`${id}:father`});
  const children=Array.from({length:siblings},(_,i)=>{
    const genome=child(maternalGenome,paternalGenome,`${id}:child:${i}`);
    return {id:`${id}-child-${i+1}`,genome,phenotype:traits(genome)};
  });
  return {
    id,
    parents:{
      maternal:{genome:maternalGenome,phenotype:traits(maternalGenome)},
      paternal:{genome:paternalGenome,phenotype:traits(paternalGenome)}
    },
    children
  };
}

function inheritedFrom(parentGenome,childGenome,locus,copy){
  const inherited=childGenome.loci[locus][copy];
  return parentGenome.loci[locus].findIndex(a=>a.value===inherited.value);
}

function lineage(){
  const mixed=family({id:"mixed",maternalAncestry:AFR_WEST,paternalAncestry:EUR_NORTH,siblings:5});
  const westAfrican=family({id:"west-african",maternalAncestry:AFR_WEST,paternalAncestry:AFR_WEST,siblings:4});
  const southAsian=family({id:"south-asian",maternalAncestry:SOUTH_ASIA,paternalAncestry:SOUTH_ASIA,siblings:4});

  const partner=sampleFounderPhysicalGenome({ancestry:SOUTH_ASIA,seed:"mixed:grandchild-partner"});
  const parent=mixed.children[0];
  const grandchildren=Array.from({length:6},(_,i)=>{
    const genome=child(parent.genome,partner,`mixed:grandchild:${i}`);
    return {id:`mixed-grandchild-${i+1}`,genome,phenotype:traits(genome)};
  });

  return {families:[mixed,westAfrican,southAsian],grandchildren:{parent,partner:{genome:partner,phenotype:traits(partner)},children:grandchildren}};
}

function diagnostics(x){
  const familyDiagnostics=x.families.map(f=>({
    id:f.id,
    siblingPhenotypeSignatures:new Set(f.children.map(c=>JSON.stringify(c.phenotype))).size,
    inheritanceValid:f.children.every(c=>Object.keys(c.genome.loci).every(locus=>
      inheritedFrom(f.parents.maternal.genome,c.genome,locus,0)>=0&&
      inheritedFrom(f.parents.paternal.genome,c.genome,locus,1)>=0
    ))
  }));
  const g=x.grandchildren;
  return {
    familyDiagnostics,
    grandchildPhenotypeSignatures:new Set(g.children.map(c=>JSON.stringify(c.phenotype))).size,
    grandchildInheritanceValid:g.children.every(c=>Object.keys(c.genome.loci).every(locus=>
      inheritedFrom(g.parent.genome,c.genome,locus,0)>=0&&
      inheritedFrom(g.partner.genome,c.genome,locus,1)>=0
    ))
  };
}

const experiment=lineage();
const result={version:"physical-inheritance-family-experiment-v0.1",experiment,diagnostics:diagnostics(experiment)};
process.stdout.write(JSON.stringify(result,null,2)+"\n");
