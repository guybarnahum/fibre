// Read-only bridge for existing mutable R2 journal books. Newly authored books
// live in World InfraDriver.state; this adapter is removed after migration.
export function createLegacyThreadJournalReader(bucket) {
  if (!bucket || typeof bucket.get !== "function") {
    throw new TypeError("legacy Thread Journal bucket must support get()");
  }
  return async function readLegacyThreadJournal(key) {
    const existing = await bucket.get(key);
    return existing === null ? null : existing.text();
  };
}
