#!/usr/bin/env node
// Print what typesugar's pipeline makes of TypeScript files, without a bundler.
//
//   node case-study/scripts/expand.mjs <tsconfig> <file.ts>...
//
// For each file: "unchanged", or the expanded code. Uses the vendored
// typesugar from the case-study package.
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(new URL("../package.json", import.meta.url));
const { createPipeline } = require("@typesugar/transformer");

const [tsconfig, ...files] = process.argv.slice(2);
if (!tsconfig || files.length === 0) {
  console.error("usage: expand.mjs <tsconfig> <file.ts>...");
  process.exit(1);
}
const pipeline = createPipeline(path.resolve(tsconfig));
for (const f of files) {
  const r = pipeline.transform(path.resolve(f));
  console.log(`=== ${f}: ${r.changed ? "CHANGED" : "unchanged"}`);
  for (const d of r.diagnostics ?? [])
    console.log(`  [${d.severity}] ${d.message}`);
  if (r.changed) console.log(r.code);
}
