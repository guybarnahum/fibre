import { IntegrityError } from "./persistence-common.mjs";
import { IDENTITY_DOMAIN_REGISTRY_VERSION } from "./identity-domain-registry.mjs";

function tableExists(database, name) {
  return database.prepare(
    "SELECT 1 FROM sqlite_master WHERE type='table' AND name=?",
  ).get(name) !== undefined;
}

export function repairIdentityAssertionRegistryV2Schema(database) {
  // Pre-production Fibre supports one identity storage dialect. There are no
  // production Threads to migrate in place. Fresh schema creation is canonical;
  // any non-current stored dialect fails closed and must be recreated/offline migrated.
  if (!tableExists(database, "identity_assertion_records")) return { repaired: false };

  const columns = database.prepare(
    "PRAGMA table_info(identity_assertion_records)",
  ).all();
  if (!columns.some((column) => column.name === "registry_version")) {
    throw new IntegrityError("unsupported pre-production identity schema: missing registry_version");
  }

  const versions = database.prepare(
    "SELECT DISTINCT registry_version FROM identity_assertion_records ORDER BY registry_version",
  ).all().map((row) => row.registry_version);
  const unsupported = versions.filter((version) => version !== IDENTITY_DOMAIN_REGISTRY_VERSION);
  if (unsupported.length !== 0) {
    throw new IntegrityError(
      `unsupported pre-production identity registry version: ${unsupported.join(", ")}; recreate or offline-migrate this development world`,
    );
  }

  return { repaired: false };
}
