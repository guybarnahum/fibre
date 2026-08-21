import { readFile } from "node:fs/promises";

const endpoint = process.argv[2] ?? "http://127.0.0.1:8787/__p3/fixtures/can-tho";
const base = new URL("../../artifacts/validation/thread-presentation/p2/can-tho/", import.meta.url);

const bundle = {
  presentation: JSON.parse(await readFile(new URL("presentation.json", base), "utf8")),
  media: JSON.parse(await readFile(new URL("media.json", base), "utf8")),
  provenance: JSON.parse(await readFile(new URL("provenance.json", base), "utf8")),
};

const response = await fetch(endpoint, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ bundle }),
});
const body = await response.text();
if (!response.ok) {
  throw new Error(`P3 fixture seed failed (${response.status}): ${body}`);
}
console.log(body);
