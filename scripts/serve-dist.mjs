import { createServer } from "http";
import { existsSync, readFileSync } from "fs";
import { join, extname } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const examplesDir = join(__dirname, "..", "examples");

const mimeTypes = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".mjs": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

const server = createServer((req, res) => {
  const requestUrl = new URL(req.url || "/", "http://localhost");
  const pathname = decodeURIComponent(requestUrl.pathname);
  const filePath = resolveRequestFile(pathname);
  const ext = extname(filePath);
  const contentType = mimeTypes[ext] || "application/octet-stream";

  try {
    const content = readFileSync(filePath);
    res.writeHead(200, {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": contentType,
    });
    res.end(content, "utf-8");
  } catch (error) {
    if (error.code === "ENOENT") {
      if (!extname(pathname)) {
        try {
          const indexContent = readFileSync(join(examplesDir, "index.html"));
          res.writeHead(200, {
            "Access-Control-Allow-Origin": "*",
            "Content-Type": "text/html",
          });
          res.end(indexContent, "utf-8");
          return;
        } catch {
          // Ignore and fall through to 404 response.
        }
      }

      res.writeHead(404, { "Access-Control-Allow-Origin": "*" });
      res.end("404 Not Found");
    } else {
      res.writeHead(500, { "Access-Control-Allow-Origin": "*" });
      res.end("500 Internal Server Error");
    }
  }
});

function resolveRequestFile(pathname) {
  if (pathname === "/") {
    return join(examplesDir, "index.html");
  }

  const directPath = join(examplesDir, pathname);
  const ext = extname(pathname);

  if (ext) {
    return directPath;
  }

  const indexPath = join(directPath, "index.html");
  if (existsSync(indexPath)) {
    return indexPath;
  }

  return directPath;
}

const PORT = 8080;
server.listen(PORT, () => {
  console.log(`🚀 Static Server running at http://localhost:${PORT}/`);
  console.log(`📂 Serving: examples/`);
  console.log(`\n✨ Open http://localhost:${PORT}/ in your browser`);
});
