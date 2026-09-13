const pill = document.querySelector("#build-pill");

async function loadBuild() {
  if (!pill) return;
  try {
    const response = await fetch("/healthz", { headers: { Accept: "application/json" }, cache: "no-store" });
    const build = await response.json();
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const version = String(build.version ?? "unknown").replace(/^fibre-admin-dashboard-/u, "");
    const buildId = typeof build.buildId === "string" && build.buildId.length > 0 ? build.buildId : null;
    pill.textContent = buildId ? `${version} · ${buildId.slice(0, 8)}` : version;
    pill.title = [
      `Running Admin build ${build.version}`,
      buildId ? `Cloudflare version ${buildId}` : null,
      build.buildTag ? `Tag ${build.buildTag}` : null,
      build.builtAt ? `Created ${build.builtAt}` : null,
    ].filter(Boolean).join("\n");
  } catch (error) {
    pill.textContent = "build ?";
    pill.title = `Build metadata unavailable: ${error instanceof Error ? error.message : String(error)}`;
  }
}

void loadBuild();
