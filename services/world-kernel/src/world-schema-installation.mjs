import {openContactStore} from "./contact-store.mjs";
import {GenesisStore} from "./genesis-store.mjs";
import {openFibreCreditStore} from "./fibre-credit-store.mjs";
import {createGuardianCognitionTables} from "./guardian-cognition-schema.mjs";
import {openWorldStateDatabase} from "./world-state-storage.mjs";
import {openWorldStore} from "./persistence.mjs";
import {openLivedNowStore} from "./lived-now-store.mjs";
import {openLivedExperienceStore} from "./lived-experience-store.mjs";
import {SymbolicGenomeStore} from "./symbolic-genome-store.mjs";
import {openInsideFibreWorkStore} from "./inside-fibre-work-store.mjs";
import {openObligationApplicabilityStore} from "./obligation-applicability-store.mjs";
import {openSemanticStateStore} from "./semantic-state-store.mjs";
import {openWorldReconciliationRetryStore} from "./world-reconciliation-retry-store.mjs";
import {ThreadHealthProjectionStore} from "./thread-health-projection-store.mjs";
import {ThreadVisualPublicationWorksetStore} from "./thread-visual-publication-workset-store.mjs";
import {GenesisOriginAuthorityStore} from "./genesis-origin-authority-store.mjs";

// Called by the explicit deployment command, never by an ordinary World
// request. Constructors retain local development setup, but skip this work
// when their Cloudflare storage has schemaReady=true.
export function installWorldSchemas(storage){
  const worldReader=openWorldStore(storage);
  try{
  const constructors=[
    ()=>new GenesisStore(storage),
    ()=>openLivedNowStore(storage),
    ()=>openLivedExperienceStore(storage),
    ()=>new SymbolicGenomeStore(storage),
    ()=>openSemanticStateStore(storage),
    ()=>openWorldReconciliationRetryStore(storage),
    ()=>new ThreadHealthProjectionStore(storage),
    ()=>new ThreadVisualPublicationWorksetStore(storage),
    ()=>openContactStore(storage),
    ()=>openInsideFibreWorkStore(storage),
    ()=>{
      const database=openWorldStateDatabase(storage,{storeName:"GuardianCognitionSchema"});
      try{database.transaction(()=>createGuardianCognitionTables(database));}
      catch(error){database.close();throw error;}
      return {close:()=>database.close()};
    },
    ()=>openObligationApplicabilityStore(storage),
    ()=>new GenesisOriginAuthorityStore(storage),
    ()=>openFibreCreditStore(storage,{worldReader}),
  ];
  for(const open of constructors){
    const store=open();
    store.close();
  }
  // Deployment must not acknowledge a World with missing queue frontiers.
  // Verify physical schema on the same state scope that serves alarms.
  const database=openWorldStateDatabase(storage,{storeName:"WorldSchemaInstallation"});
  try{
    database.prepare("SELECT 1 FROM thread_experience_pending_work LIMIT 1").get();
    database.prepare("SELECT 1 FROM thread_contact_pending_work LIMIT 1").get();
    database.prepare("SELECT 1 FROM embodiment_reference_index LIMIT 1").get();
    database.prepare("SELECT 1 FROM genesis_first_life_work LIMIT 1").get();
    database.prepare("SELECT 1 FROM world_localities LIMIT 1").get();
  }finally{database.close();}
  }finally{worldReader.close();}
}
