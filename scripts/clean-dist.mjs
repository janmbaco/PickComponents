import { rm } from "node:fs/promises";

/**
 * Removes generated build output before recompiling so npm publishes only the
 * current distribution contents.
 */
async function cleanDistDirectory() {
  await rm("dist", { recursive: true, force: true });
  await rm(".cache/tsconfig.tsbuildinfo", { force: true });
}

await cleanDistDirectory();
