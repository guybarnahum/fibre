function singleValue(values) {
  const unique = [...new Set(values.filter(Boolean))];
  return unique.length === 1 ? unique[0] : null;
}

async function fetchPage(params) {
  const response = await fetch(`/api/activity/page?${params}`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.detail ?? payload.error ?? `HTTP ${response.status}`);
  return payload;
}

export function activityExportParams(search, displayedMode = null) {
  const fixed = new URLSearchParams(search);
  fixed.delete("edge");
  fixed.delete("direction");
  fixed.delete("cursor");
  if (["causal", "raw"].includes(displayedMode)) fixed.set("mode", displayedMode);
  return fixed;
}

export async function collectAllActivityPages({ search, displayedMode = null, fetchPageFn, onProgress = () => {} }) {
  const fixed = activityExportParams(search, displayedMode);
  const records = [];
  const seenCursors = new Set();
  let first = null;
  let nextCursor = null;
  let pagesFetched = 0;

  do {
    const params = new URLSearchParams(fixed);
    params.set("edge", "first");
    params.set("direction", "next");
    if (nextCursor) params.set("cursor", nextCursor);
    const page = await fetchPageFn(params);
    if (first === null) first = page;
    records.push(...(page.records ?? []));
    pagesFetched += 1;
    onProgress(records.length, first.total ?? records.length);
    nextCursor = page.nextCursor ?? null;
    if (nextCursor !== null) {
      if (seenCursors.has(nextCursor)) throw new Error("Activity paging returned a repeated cursor");
      seenCursors.add(nextCursor);
    }
  } while (nextCursor !== null);

  return { first, records, pagesFetched };
}

async function identityFor(first, records) {
  const threadId = first?.query?.kind === "thread"
    ? first.query.value
    : singleValue(records.map((record) => record.threadId));
  let resolved = null;
  if (threadId) {
    try {
      const response = await fetch(`/api/threads/${encodeURIComponent(threadId)}/identity`, {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      const payload = await response.json();
      if (response.ok) resolved = payload.identity ?? null;
    } catch {}
  }
  return {
    requestId: singleValue(records.map((record) => record.requestId)),
    genesisId: singleValue(records.map((record) => record.genesisId)),
    threadId,
    threadName: resolved?.displayName ?? null,
    fibreIdentityNumber: resolved?.fibreIdentityNumber
      ?? singleValue(records.map((record) => record.evidence?.fibreIdentityNumber)),
  };
}

function displayedMode() {
  const active = document.querySelector(".view-switch button.active")?.dataset.mode;
  if (["causal", "raw"].includes(active)) return active;
  const requested = new URLSearchParams(location.search).get("mode");
  return ["causal", "raw"].includes(requested) ? requested : null;
}

async function completeExport(onProgress) {
  const activeMode = displayedMode();
  const { first, records, pagesFetched } = await collectAllActivityPages({
    search: location.search,
    displayedMode: activeMode,
    fetchPageFn: fetchPage,
    onProgress,
  });
  return {
    contract: "fibre-activity-export-v0.5",
    exportedAt: new Date().toISOString(),
    environment: first?.environment ?? null,
    queriedAt: first?.queriedAt ?? null,
    query: first?.query ?? null,
    mode: first?.mode ?? activeMode ?? "raw",
    pagination: {
      pageSize: first?.pageSize ?? 25,
      totalPagesAtStart: first?.totalPages ?? 1,
      totalRecordsAtStart: first?.total ?? records.length,
      pagesFetched,
      exportedRecords: records.length,
    },
    identity: await identityFor(first, records),
    records,
  };
}

async function copyText(value) {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    const area = document.createElement("textarea");
    area.value = value;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.append(area);
    area.select();
    const copied = document.execCommand("copy");
    area.remove();
    return copied;
  }
}

const button = typeof document === "undefined" ? null : document.querySelector("#export-button");
button?.addEventListener("click", async (event) => {
  event.stopImmediatePropagation();
  if (button.disabled) return;
  button.disabled = true;
  button.title = "";
  try {
    const payload = await completeExport((count, total) => {
      button.textContent = `Collecting ${count}/${total}`;
    });
    const copied = await copyText(JSON.stringify(payload, null, 2));
    button.textContent = copied ? `Copied ${payload.records.length}` : "Copy failed";
  } catch (error) {
    button.textContent = "Export failed";
    button.title = error instanceof Error ? error.message : String(error);
  }
  setTimeout(() => {
    button.textContent = "Copy export";
    button.title = "";
    button.disabled = false;
  }, 1600);
}, { capture: true });
