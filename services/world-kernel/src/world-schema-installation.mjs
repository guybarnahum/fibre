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
export function installWorldSchemas(storage,{deploymentGitSha="local"}={}){
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
  // Schema and its revision witness are installed only by an operator.
  const stampDatabase=openWorldStateDatabase(storage,{storeName:"WorldSchemaStamp"});
  try{
    stampDatabase.exec(`CREATE TABLE IF NOT EXISTS world_schema_installation (
      id INTEGER PRIMARY KEY CHECK(id=1),
      installed_git_sha TEXT NOT NULL,
      installed_at TEXT NOT NULL
    ) STRICT`);
    stampDatabase.prepare(`INSERT INTO world_schema_installation
      (id,installed_git_sha,installed_at) VALUES (1,?,?)
      ON CONFLICT(id) DO UPDATE SET installed_git_sha=excluded.installed_git_sha,
        installed_at=excluded.installed_at`).run(deploymentGitSha,new Date().toISOString());
  }finally{stampDatabase.close();}
  // Deployment must not acknowledge a World with missing queue frontiers.
  // Verify physical schema on the same state scope that serves alarms.
  const database=openWorldStateDatabase(storage,{storeName:"WorldSchemaInstallation"});
  try{
    database.prepare("SELECT 1 FROM thread_experience_pending_work LIMIT 1").get();
    database.prepare("SELECT 1 FROM thread_contact_pending_work LIMIT 1").get();
    database.prepare("SELECT 1 FROM embodiment_reference_index LIMIT 1").get();
    database.prepare("SELECT 1 FROM genesis_first_life_work LIMIT 1").get();
    database.prepare("SELECT next_due_at FROM lived_now_continuity_audit WHERE id=1").get();
    database.prepare("SELECT 1 FROM world_places LIMIT 1").get();
    database.prepare("SELECT discovery_json FROM world_public_places LIMIT 1").get();
    database.prepare("SELECT appearance_json FROM world_public_places LIMIT 1").get();
    database.prepare("SELECT 1 FROM thread_known_places LIMIT 1").get();
    // A ready World must actually have every table that live readers assume.
    for(const name of [
      "threads","thread_events","situated_evidence_witnesses",
      "encounter_story_thread_presence","social_interaction_records",
      "embodiment_reference_index","lived_now_next_boundaries",
      "inside_fibre_work_commitments","fibre_civil_registrations",
      "genesis_world_specs","genesis_manifests",
      "genesis_raised_language_corrections","genesis_birth_publications",
      "genesis_historical_envelope_plans","genesis_generation_attempts",
      "genesis_origin_authorities","live_world_place_records",
      "live_physical_venue_bindings","symbolic_genomes",
      "symbolic_genome_runtime_baselines","symbolic_genome_loci",
      "symbolic_genome_mutations","thread_journal_profiles",
      "thread_visual_publication_work","thaw_leases","runtime_sessions",
      "embodiment_current_heads","world_schema_installation",
    ]){
      database.prepare(`SELECT 1 FROM "${name}" LIMIT 1`).get();
    }
  }finally{database.close();}
  }finally{worldReader.close();}
}
