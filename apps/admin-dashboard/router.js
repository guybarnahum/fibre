const threadMatch = location.pathname.match(/^\/thread\/([^/]+)$/u);

if (threadMatch) {
  document.title = "Fibre Admin · Thread";
  import("/thread-page.js").then(({ renderThreadPage }) => renderThreadPage(decodeURIComponent(threadMatch[1])));
} else {
  import("/app.js");
}
