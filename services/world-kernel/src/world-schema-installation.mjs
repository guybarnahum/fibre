import {openContactStore} from "./contact-store.mjs";
import {openFibreCreditStore} from "./fibre-credit-store.mjs";
import {openGuardianCognitionStore} from "./guardian-cognition-store.mjs";
import {openInsideFibreWorkStore} from "./inside-fibre-work-store.mjs";
import {openObligationApplicabilityStore} from "./obligation-applicability-store.mjs";
import {openSemanticStateStore} from "./semantic-state-store.mjs";
import {GenesisOriginAuthorityStore} from "./genesis-origin-authority-store.mjs";

// Called by the explicit deployment command, never by an ordinary World
// request. Constructors retain local development setup, but skip this work
// when their Cloudflare storage has schemaReady=true.
export function installWorldSchemas(storage,worldReader){
  const constructors=[
    ()=>openSemanticStateStore(storage),
    ()=>openContactStore(storage),
    ()=>openInsideFibreWorkStore(storage),
    ()=>openGuardianCognitionStore(storage),
    ()=>openObligationApplicabilityStore(storage),
    ()=>new GenesisOriginAuthorityStore(storage),
    ()=>openFibreCreditStore(storage,{worldReader}),
  ];
  for(const open of constructors){
    const store=open();
    store.close();
  }
}
