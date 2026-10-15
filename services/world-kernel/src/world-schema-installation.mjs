import {openContactStore} from "./contact-store.mjs";
import {openFibreCreditStore} from "./fibre-credit-store.mjs";
import {createGuardianCognitionTables} from "./guardian-cognition-schema.mjs";
import {openWorldStateDatabase} from "./world-state-storage.mjs";
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
export function installWorldSchemas(storage,worldReader){
  const constructors=[
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
}
