import { createRequire } from "node:module";
import type { PluginOption } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

// typesugar (case study): resolved from the separate case-study package, as in
// tsdown.config.ts. The plugin expands macros in source and test files before
// vitest runs them. Type tests (the "types" project) still pass through it
// when vitest collects them, but tsc checks the original source (finding F5).
const caseStudyRequire = createRequire(
  new URL("../../case-study/package.json", import.meta.url),
);
// Typed here because the package's own types aren't resolvable from this
// workspace.
type TypesugarUnplugin = {
  readonly vite: (options: {
    readonly tsconfig: string;
    readonly verbose: boolean;
  }) => PluginOption;
};
const { unplugin: typesugarUnplugin } = caseStudyRequire(
  "unplugin-typesugar",
) as { readonly unplugin: TypesugarUnplugin };

export default defineConfig({
  plugins: [
    typesugarUnplugin.vite({
      tsconfig: "./tsconfig.json",
      verbose: process.env["TYPESUGAR_VERBOSE"] === "1",
    }),
    tsconfigPaths(),
  ],
  test: {
    // typesugar (case study, finding F12): Vitest 5 caches transformed
    // modules on disk by file content and config, but typesugar's output for
    // a file also depends on the types of the files it imports and on the
    // typesugar version, so a cached expansion goes stale. Off until
    // unplugin-typesugar keeps its files out of that cache.
    experimental: { fsModuleCache: false },
    coverage: {
      include: ["src/**"],
      exclude: [
        "src/**/*.test-d.ts",
        "src/**/*.test-prop.ts",
        "src/index.ts",
        "src/internal/types/**/*.ts",
      ],
    },
    projects: [
      {
        extends: true,
        test: {
          name: "runtime",
          include: ["src/**/*.test.ts"],
          isolate: false,
        },
      },
      {
        extends: true,
        test: {
          name: "types",
          include: ["src/**/*.test-d.ts"],
          typecheck: {
            enabled: true,
            only: true,
            ignoreSourceErrors: true,
            tsconfig: "./tsconfig.test-d.json",
          },
        },
      },
      {
        extends: true,
        test: {
          name: "prop",
          include: ["src/**/*.test-prop.ts"],
          isolate: false,
        },
      },
    ],
  },
});
