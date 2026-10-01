function requireMethod(name,value,method){
  if(!value||typeof value[method]!=="function")throw new TypeError(`${name} must expose ${method}()`);
}

const IDENTITY_STATES=new Set(["legacy_v1_de_novo","legacy_v1_recombined"]);

function appearanceOrigins(lineages){
  const byThread=new Map();
  for(const lineage of Array.isArray(lineages)?lineages:[]){
    if(!["maternal","paternal"].includes(lineage?.side))continue;
    if(typeof lineage?.threadId!=="string"||lineage.threadId==="")continue;
    const value=typeof lineage?.population==="string"?lineage.population.trim():"";
    if(value==="")continue;
    const origins=byThread.get(lineage.threadId)??new Set();
    origins.add(value);
    byThread.set(lineage.threadId,origins);
  }
  return Object.freeze([...byThread.entries()]
    .map(([threadId,origins])=>Object.freeze({
      threadId,
      physicalOrigins:Object.freeze([...origins]),
    }))
    .sort((a,b)=>a.threadId.localeCompare(b.threadId)));
}

function physicalOriginsFor(appearance,threadId){
  return appearanceOrigins(appearance?.lineages)
    .find((entry)=>entry.threadId===threadId)?.physicalOrigins??Object.freeze([]);
}

function freezeEntry(threadId,domains,reasons,physicalOrigins=[]){
  return Object.freeze({
    threadId,
    domains:Object.freeze([...domains].sort()),
    reasons:Object.freeze(Object.fromEntries(
      [...reasons.entries()].map(([domain,values])=>[domain,Object.freeze([...values].sort())]),
    )),
    physicalOrigins:Object.freeze([...physicalOrigins]),
  });
}

export function createThreadMigrationSummaryService({
  appearanceCoverage,
  directoryStore,
  symbolicGenomeStore,
  genesisBirthSexEvidence,
}={}){
  requireMethod("appearanceCoverage",appearanceCoverage,"scan");
  requireMethod("appearanceCoverage",appearanceCoverage,"inspect");
  requireMethod("directoryStore",directoryStore,"getEntry");
  requireMethod("symbolicGenomeStore",symbolicGenomeStore,"listThreadMigrationCandidates");
  requireMethod("symbolicGenomeStore",symbolicGenomeStore,"inspectThreadGenomeMigration");
  requireMethod("genesisBirthSexEvidence",genesisBirthSexEvidence,"listMigrationThreadIds");
  requireMethod("genesisBirthSexEvidence",genesisBirthSexEvidence,"resolve");

  function add(target,threadId,domain,reason){
    const current=target.get(threadId)??{
      domains:new Set(),
      reasons:new Map(),
    };
    current.domains.add(domain);
    const reasons=current.reasons.get(domain)??new Set();
    reasons.add(reason);
    current.reasons.set(domain,reasons);
    target.set(threadId,current);
  }

  return Object.freeze({
    inspect(threadId){
      const thread=directoryStore.getEntry(threadId);
      if(thread===null)return null;
      const domains=new Set();
      const reasons=new Map();

      const appearance=appearanceCoverage.inspect(threadId);
      if((appearance?.migrationCandidates?.length??0)>0){
        domains.add("appearance");
        reasons.set("appearance",new Set(
          appearance.migrationCandidates.flatMap((entry)=>entry.reasons??[entry.reason]),
        ));
      }

      const genome=symbolicGenomeStore.inspectThreadGenomeMigration(threadId);
      if(IDENTITY_STATES.has(genome.state)){
        domains.add("identity");
        reasons.set("identity",new Set([`symbolic_genome:${genome.state}`]));
      }
      if(thread.sex===null&&genesisBirthSexEvidence.resolve(threadId)!==null){
        domains.add("identity");
        const identity=reasons.get("identity")??new Set();
        identity.add("genesis_sex");
        reasons.set("identity",identity);
      }

      return freezeEntry(threadId,domains,reasons,physicalOriginsFor(appearance,threadId));
    },

    scan(){
      const migrations=new Map();
      const appearance=appearanceCoverage.scan();
      for(const candidate of appearance.migrationCandidates){
        for(const reason of candidate.reasons??[candidate.reason]){
          add(migrations,candidate.threadId,"appearance",reason);
        }
      }
      for(const candidate of symbolicGenomeStore.listThreadMigrationCandidates()){
        add(migrations,candidate.threadId,"identity",`symbolic_genome:${candidate.state}`);
      }
      for(const threadId of genesisBirthSexEvidence.listMigrationThreadIds()){
        add(migrations,threadId,"identity","genesis_sex");
      }
      return Object.freeze({
        contract:"fibre-thread-migration-summary-v0.1",
        threads:Object.freeze([...migrations.entries()]
          .map(([threadId,{domains,reasons}])=>freezeEntry(
            threadId,
            domains,
            reasons,
            physicalOriginsFor(appearance,threadId),
          ))
          .sort((a,b)=>a.threadId.localeCompare(b.threadId))),
        origins:appearanceOrigins(appearance.lineages),
      });
    },
  });
}
