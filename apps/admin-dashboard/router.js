const threadMatch = location.pathname.match(/^\/thread\/([^/]+)$/u);

if (threadMatch) {
  document.title = "Fibre Admin · Thread";
  import("/thread-page.js").then(({ renderThreadPage }) => renderThreadPage(decodeURIComponent(threadMatch[1])));
} else if (location.pathname.replace(/\/+$/u,"")==="/life") {
  document.title="Fibre Admin · Life & Causes";
  const birth=new URLSearchParams(location.search).get("birth");
  if(birth!==null){
    document.title="Fibre Admin · Birth execution";
    import("/life-genesis-ui.js").then(({renderGenesisExecutionPage})=>renderGenesisExecutionPage(birth));
  }else{
    import("/life-causes-ui.js").then(({renderLifeCausesPage})=>renderLifeCausesPage());
  }
} else if (location.pathname.replace(/\/+$/u,"")==="/world-events") {
  document.title="Fibre Admin · World Events";
  import("/world-events-ui.js").then(({renderWorldEventsPage})=>renderWorldEventsPage());
} else {
  import("/app.js").then(() => import("/thread-population-ui.js"));
}
