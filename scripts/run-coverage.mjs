import { rmSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = resolve(fileURLToPath(new URL("..", import.meta.url)));
const coverageDir = resolve(rootDir, ".coverage/v8");

rmSync(coverageDir, { recursive: true, force: true });
mkdirSync(coverageDir, { recursive: true });

const testResult = spawnSync(
  "npx",
  ["playwright", "test", "--project=unit", "--project=integration"],
  {
    cwd: rootDir,
    env: {
      ...process.env,
      SKIP_WEBSERVER: "1",
      NODE_V8_COVERAGE: coverageDir,
    },
    stdio: "inherit",
  },
);

if (testResult.status !== 0) {
  process.exit(testResult.status ?? 1);
}

const coverageResult = spawnSync(
  process.execPath,
  ["scripts/check-coverage.mjs", ".coverage/v8"],
  {
    cwd: rootDir,
    env: process.env,
    stdio: "inherit",
  },
);

process.exit(coverageResult.status ?? 1);
