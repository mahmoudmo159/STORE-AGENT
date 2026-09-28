import test from "node:test";
import assert from "node:assert/strict";

test("backend package is Vercel-oriented", async () => {
  const pkg = await import("../package.json", {assert:{type:"json"}});
  assert.equal(pkg.default.type, "module");
  assert.equal(pkg.default.scripts.dev, "vercel dev");
});

test("health route exists", async () => {
  const fs = await import("node:fs/promises");
  const s = await fs.readFile(new URL("../api/[...path].js", import.meta.url), "utf8");
  assert.match(s, /service:"nike-store-agent-backend"/);
});
