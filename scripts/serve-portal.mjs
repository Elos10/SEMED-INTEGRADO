import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../public");
const port = Number(process.env.PORT || 8765);
const mime = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

async function resolveFile(pathname) {
  const relative = decodeURIComponent(pathname).replace(/^\/+/, "");
  const requested = path.resolve(root, relative);
  if (requested !== root && !requested.startsWith(`${root}${path.sep}`)) return null;
  const candidates = [requested, path.join(requested, "index.html"), `${requested}.html`];
  for (const candidate of candidates) {
    try {
      if ((await stat(candidate)).isFile()) return candidate;
    } catch {}
  }
  return null;
}

createServer(async (request, response) => {
  const pathname = new URL(request.url || "/", "http://localhost").pathname;
  const file = await resolveFile(pathname);
  if (!file) {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Página não encontrada.");
    return;
  }
  response.writeHead(200, {
    "cache-control": "no-store",
    "content-type": mime[path.extname(file)] || "application/octet-stream",
  });
  response.end(await readFile(file));
}).listen(port, "127.0.0.1", () => {
  console.log(`Portal disponível em http://127.0.0.1:${port}`);
});
