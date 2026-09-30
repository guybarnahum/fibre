export function threadMatchesPopulationFilter(thread, filter = "all") {
  if (filter === "migration") return thread?.health === "migration_required";
  return true;
}

export function populationFilterCount(threads, filter = "all") {
  const values = Array.isArray(threads) ? threads : [];
  return values.filter((thread) => threadMatchesPopulationFilter(thread, filter)).length;
}
