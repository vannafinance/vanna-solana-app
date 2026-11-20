// Tiny static server for this folder only. node server.js  ->  http://localhost:4180 (falls back to 4181 / 4182 if busy).
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".md": "text/plain; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png" };

const server = http.createServer((req, res) => {
  let p = decodeURIComponent((req.url || "/").split("?")[0]);
  if (p.endsWith("/")) p += "index.html";
  const file = path.normalize(path.join(ROOT, p));
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404, { "Content-Type": "text/plain" }); return res.end("Not found"); }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-store" });
    res.end(buf);
  });
});

const ports = [4180, 4181, 4182];
function listen(i) {
  server.once("error", (e) => { if (e.code === "EADDRINUSE" && i + 1 < ports.length) listen(i + 1); else { console.error(e.message); process.exit(1); } });
  server.listen(ports[i], "127.0.0.1", () => {
    fs.writeFileSync(path.join(ROOT, ".port"), String(ports[i]));
    console.log("wallet-picker on http://localhost:" + ports[i]);
  });
}
listen(0);
