const button = document.querySelector("#export-button");

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

async function collectAllPages(onProgress) {
  const fixed = new URLSearchParams(location.search);
  fixed.delete("edge");
  fixed.delete("direction");
  fixed.delete("cursor");
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
    const page = await fetchPage(params);
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

async function completeExport(onProgress) {
  const { first, records, pagesFetched } = await collectAllPages(onProgress);
  return {
    contract: "fibre-activity-export-v0.5",
    exportedAt: new Date().toISOString(),
    environment: first?.environment ?? null,
    queriedAt: first?.queriedAt ?? null,
    query: first?.query ?? null,
    mode: first?.mode ?? new URLSearchParams(location.search).get("mode") ?? "raw",
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
