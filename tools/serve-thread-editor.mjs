import { createReadStream, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";

const root = new URL("../apps/thread-editor/", import.meta.url).pathname;
const mime = { ".html":"text/html; charset=utf-8", ".js":"text/javascript; charset=utf-8", ".css":"text/css; charset=utf-8", ".json":"application/json" };

createServer((req, res) => {
  const requested = req.url === "/" ? "index.html" : decodeURIComponent(req.url ?? "/").replace(/^\//, "");
  const file = normalize(join(root, requested));
  if (!file.startsWith(root)) { res.writeHead(403).end("Forbidden"); return; }
  try {
    if (!statSync(file).isFile()) throw new Error("not file");
    res.writeHead(200, { "Content-Type": mime[extname(file)] ?? "application/octet-stream" });
    createReadStream(file).pipe(res);
  } catch { res.writeHead(404).end("Not found"); }
}).listen(4173, () => console.log("Thread Editor: http://localhost:4173"));
