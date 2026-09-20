import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const componentUrl = new URL("./fibre-fin-card.js", import.meta.url);
const stylesheetUrl = new URL("./fibre-fin-card.css", import.meta.url);

test("FIN card web component is compatible with style-src self CSP", async () => {
  const [component, stylesheet] = await Promise.all([
    readFile(componentUrl, "utf8"),
    readFile(stylesheetUrl, "utf8"),
  ]);

  assert.doesNotMatch(component, /<style[\s>]/u, "component must not inject inline style blocks");
  assert.doesNotMatch(component, /\.style\./u, "component must not mutate inline styles");
  assert.match(component, /<link rel="stylesheet" href="\$\{STYLESHEET_HREF\}">/u);
  assert.match(stylesheet, /:host\(\[data-side="back"\]\) \.inner/u);
  assert.match(stylesheet, /rotateY\(180deg\)/u);
});
