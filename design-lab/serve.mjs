import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { dirname, extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".woff2": "font/woff2",
  ".jpg": "image/jpeg",
  ".txt": "text/plain; charset=utf-8"
};

const server = createServer(async (request, response) => {
  if (!["GET", "HEAD"].includes(request.method)) {
    response.writeHead(405, { Allow: "GET, HEAD" });
    response.end();
    return;
  }
  try {
    const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    let target = resolve(root, `.${pathname}`);
    if (target !== root && !target.startsWith(root + sep)) throw new Error("Outside laboratory");
    if ((await stat(target)).isDirectory()) target = resolve(target, "index.html");
    const type = types[extname(target)];
    if (!type) throw new Error("Unsupported file");
    const content = await readFile(target);
    response.writeHead(200, {
      "Content-Type": type,
      "Content-Length": content.byteLength,
      "Cache-Control": "no-cache",
      "X-Content-Type-Options": "nosniff"
    });
    response.end(request.method === "HEAD" ? undefined : content);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Recurso no disponible en el laboratorio de Kofi.");
  }
});

server.on("error", (error) => {
  console.error(`No se pudo abrir el laboratorio: ${error.message}`);
  process.exitCode = 1;
});
server.listen(4173, "127.0.0.1", () => {
  console.log("Laboratorio Kofi: http://localhost:4173");
  console.log("Solo prototipos y datos ficticios. Detener con Ctrl+C.");
});
