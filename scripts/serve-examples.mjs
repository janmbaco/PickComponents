import { createServer } from "http";
import { readFileSync } from "fs";
import { join, extname } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const examplesDir = join(__dirname, "..", "examples");

const mimeTypes = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".mjs": "application/javascript",
  ".ts": "text/plain",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

const server = createServer((req, res) => {
  let filePath = join(examplesDir, req.url === "/" ? "index.html" : req.url);
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
      // SPA Fallback: Serve index.html for non-file requests
      if (!ext) {
        try {
          const indexContent = readFileSync(join(examplesDir, "index.html"));
          res.writeHead(200, {
            "Access-Control-Allow-Origin": "*",
            "Content-Type": "text/html",
          });
          res.end(indexContent, "utf-8");
          return;
        } catch (e) {
          // ignore
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

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}/`);
  console.log(`📂 Serving: examples/`);
  console.log(`\n✨ Open http://localhost:${PORT}/ in your browser`);
});
