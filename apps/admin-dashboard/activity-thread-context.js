const container = document.querySelector("#thread-context");
const form = document.querySelector("#filters");

function appliedThreadId() {
  const params = new URLSearchParams(location.search);
  if (params.get("kind") !== "thread") return null;
  const threadId = params.get("value")?.trim();
  return threadId || null;
}

function element(tag, className, text = null) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== null) node.textContent = text;
  return node;
}

function publicImageAssets(identity) {
  return (Array.isArray(identity?.assets) ? identity.assets : [])
    .filter((asset) => asset?.url && String(asset.mediaType ?? "").startsWith("image/"));
}

async function renderThreadContext() {
  if (!container) return;
  const threadId = appliedThreadId();
  if (!threadId) {
    container.hidden = true;
    container.replaceChildren();
    return;
  }

  container.hidden = false;
  container.replaceChildren(element("span", null, "Resolving Thread identity…"));
  try {
    const response = await fetch(`/api/threads/${encodeURIComponent(threadId)}/identity`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.detail ?? payload.error ?? `HTTP ${response.status}`);
    if (threadId !== appliedThreadId()) return;

    const identity = payload.identity ?? {};
    const assets = publicImageAssets(identity);
    const main = element("div", "activity-thread-context-main");
    if (assets[0]) {
      const avatar = element("img", "activity-thread-avatar");
      avatar.src = assets[0].url;
      avatar.alt = identity.displayName ? `${identity.displayName} media` : "Thread media";
      main.append(avatar);
    }

    const copy = element("div", "activity-thread-copy");
    copy.append(
      element("strong", null, identity.displayName ?? "Unnamed Thread"),
      element("span", null, [identity.fibreIdentityNumber, identity.birthDate, identity.lifecycleStatus].filter(Boolean).join(" · ") || "Identity resolved from current Presentation"),
      element("span", "mono", identity.threadId ?? threadId),
      element("span", null, `${assets.length} ready public image${assets.length === 1 ? "" : "s"}`),
    );
    main.append(copy);

    if (assets.length > 0) {
      const media = element("div", "activity-thread-assets");
      for (const asset of assets.slice(0, 4)) {
        const link = element("a");
        link.href = asset.url;
        link.target = "_blank";
        link.rel = "noreferrer";
        link.title = asset.role ?? asset.mediaId ?? asset.objectRef ?? "Open Thread asset";
        const image = element("img");
        image.src = asset.url;
        image.loading = "lazy";
        image.alt = asset.role ?? "Thread asset";
        link.append(image);
        media.append(link);
      }
      main.append(media);
    }
    container.replaceChildren(main);
  } catch (error) {
    if (threadId !== appliedThreadId()) return;
    container.replaceChildren(element("span", null, `Thread identity unavailable · ${error instanceof Error ? error.message : String(error)}`));
  }
}

form?.addEventListener("submit", () => setTimeout(() => void renderThreadContext(), 0));
window.addEventListener("popstate", () => void renderThreadContext());
void renderThreadContext();
