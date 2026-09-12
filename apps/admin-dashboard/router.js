const threadMatch = location.pathname.match(/^\/thread\/([^/]+)$/u);

function enhanceActivityThreadLinks() {
  const tbody = document.querySelector("#activity-rows");
  if (!tbody) return;
  const enhance = () => {
    for (const cell of tbody.querySelectorAll("td.correlation[title^='thr_']")) {
      if (cell.querySelector("a")) continue;
      const threadId = cell.title;
      const link = document.createElement("a");
      link.href = `/thread/${encodeURIComponent(threadId)}`;
      link.className = "thread-link";
      link.textContent = cell.textContent;
      link.title = `Open ${threadId}`;
      link.addEventListener("click", (event) => event.stopPropagation());
      cell.replaceChildren(link);
    }
  };
  new MutationObserver(enhance).observe(tbody, { childList:true, subtree:true });
  enhance();
}

if (threadMatch) {
  document.title = "Fibre Admin · Thread";
  import("/thread-page.js").then(({ renderThreadPage }) => renderThreadPage(decodeURIComponent(threadMatch[1])));
} else {
  import("/app.js").then(enhanceActivityThreadLinks);
}
