// F4 measurement (run from packages/remeda: TYPESUGAR_WORKTREE=<typesugar
// worktree> F4_OUT=<dir> npx tsdown -c ../../case-study/experiments/f4-declarations-step.config.ts):
// remeda's declarations step (emitDtsOnly, ESM + CJS) with
// typesugar's plugin from a typesugar worktree (TYPESUGAR_WORKTREE).
import { createRequire } from "node:module";
import { defineConfig } from "tsdown";

const worktree = process.env["TYPESUGAR_WORKTREE"]!;
const req = createRequire(
  `${worktree}/packages/unplugin-typesugar/package.json`,
);
const { unplugin } = req("unplugin-typesugar") as {
  unplugin: { rolldown: (o: object) => never };
};

export default defineConfig({
  format: ["esm", "cjs"],
  platform: "neutral",
  entry: "src/index.ts",
  outDir: process.env["F4_OUT"]!,
  plugins: unplugin.rolldown({
    tsconfig: "./tsconfig.source.json",
    verbose: true,
  }),
  dts: { emitDtsOnly: true },
  deps: { onlyBundle: false },
});
