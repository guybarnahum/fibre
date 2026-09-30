export function threadHasMigrationDomain(thread, domain) {
  return Array.isArray(thread?.migrationDomains) && thread.migrationDomains.includes(domain);
}

export function threadMatchesPopulationFilter(thread, filter = "all") {
  if (filter === "migration") return thread?.health === "migration_required";
  if (filter === "appearance") return threadHasMigrationDomain(thread, "appearance");
  if (filter === "identity") return threadHasMigrationDomain(thread, "identity");
  return true;
}

export function populationFilterCount(threads, filter = "all") {
  const values = Array.isArray(threads) ? threads : [];
  return values.filter((thread) => threadMatchesPopulationFilter(thread, filter)).length;
}
