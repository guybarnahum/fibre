const pill = document.querySelector("#build-pill");

async function loadBuild() {
  if (!pill) return;
  try {
    const response = await fetch("/healthz", { headers: { Accept: "application/json" }, cache: "no-store" });
    const build = await response.json();
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const version = String(build.version ?? "unknown").replace(/^fibre-admin-dashboard-/u, "");
    const gitSha = typeof build.gitSha === "string" && build.gitSha.length > 0 ? build.gitSha : null;
    pill.textContent = gitSha ? `${version} · ${gitSha.slice(0, 8)}` : `${version} · unversioned`;
    pill.title = gitSha ? `Running Admin build ${build.version}\nGit ${gitSha}` : `Running Admin build ${build.version}`;
  } catch (error) {
    pill.textContent = "build ?";
    pill.title = `Build metadata unavailable: ${error instanceof Error ? error.message : String(error)}`;
  }
}

void loadBuild();
