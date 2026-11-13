# remeda × typesugar: a case study

This fork of [remeda](https://github.com/remeda/remeda) (MIT, v2.60.0) is a
proof point for [typesugar](https://typesugar.org), the second after
[Turf](https://github.com/typesugar/turf-typesugar). We bring typesugar into a
real, widely used TypeScript library in stages and measure what holds. It is a
one-off study, not a maintained fork; all credit for remeda itself goes to its
authors.

Branch: `typesugar-case-study`, from tag `v2.60.0` (`c362e7c`, 2026-11-12).
`packages/remeda/package.json` says `2.0.0`; that is a placeholder that
semantic-release replaces at publish time, and the published version of this
commit is 2.60.0.

## Why remeda

remeda's `pipe(data, filter(f), map(g), take(10))` avoids intermediate arrays
at run time: functions built with `withLazyImplementation` /
`lazyDataLastImplementation` carry a `LazyEvaluator`, and when a sequence of
them can stop early, `pipe` runs it item by item (`buildFusedSequence`,
`runFusedSequence`). typesugar's `fused()` / `lazy()` (`@typesugar/fusion`)
claim to do the same at compile time, as one loop with no protocol objects.
remeda's tests pin the lazy semantics down closely (they count callback
invocations, `test/lazyInvocationCounter.ts`, and force the lazy path,
`test/forceFusion.ts`), so they are a demanding spec for fusion. remeda's
functions are also data-first and data-last at once (`purry`), which makes
them a natural test of typesugar's extension methods. Turf covered neither
fusion nor extension methods.

## Questions we want answered

1. With typesugar in the build and no source changes, is the output identical,
   and do remeda's tests behave the same?
2. Can typesugar compile remeda-style pipe chains into one loop while keeping
   remeda's semantics, as its runtime and type tests define them (invocation
   counts, early exit, callback arguments, non-lazy steps in a chain)? What
   does it gain at run time?
3. Can remeda's functions be called as extension methods
   (`users.groupBy(...)`), and what happens where their names are also native
   methods (`map`, `filter`, `sort`, `isArray`)?
4. What does adopting it cost: build, test and type-check time, lines
   changed, friction, typesugar bugs found, features that didn't fit?

## Ground rules

- **remeda's public API and its tests are the spec.** Runtime tests
  (`*.test.ts`), type tests (`*.test-d.ts`) and property tests
  (`*.test-prop.ts`) are not changed to make a stage pass. A stage that needs a
  test change says why, in the stage log. The published `.d.ts` must not change
  unless a stage says why.
- **Every stage is measured against the stage before it and against v2.60.0.**
- **typesugar bugs found here are fixed in typesugar** (failing test first) on
  the typesugar branch `remeda-case-study-fixes`, and logged below. Design
  questions are logged for a decision and not settled here. The fork never
  patches around a typesugar bug silently.
- **typesugar is consumed as packed tarballs** (`vendor/typesugar/*.tgz`) built
  from a recorded typesugar commit, installed into a separate `case-study`
  package, so remeda's own lockfile is unchanged
  ([`vendor/typesugar/README.md`](vendor/typesugar/README.md)).
- **Benchmarks are local**: interleaved A/B runs on one stated machine
  (`case-study/bench.mjs`). Readers re-run them rather than compare against our
  numbers.
- **Heavy runs are sized first and pinned**: vitest runs use
  `--maxWorkers=4`; the whole suite is light (each project under 10 s on the
  machine below).

## Measurements (per stage)

| Metric                  | How                                                                                                                                                                                                                                                                                                                                             |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tests                   | `npx vitest run --project runtime\|types\|prop --maxWorkers=4` in `packages/remeda`                                                                                                                                                                                                                                                             |
| Runtime                 | `case-study/bench.mjs`: A and B built in separate worktrees, `case-study/bench/pipe-chains.mjs` run against each side's `dist` interleaved A/B/A/B one process at a time, median ops/sec of N rounds (default 5) with spread (min–max and IQR) and delta %. Native-array and hand-written-loop cases don't use remeda and act as noise controls |
| Emitted code            | `diff -r` of `packages/remeda/dist` (JS, CJS, `.d.ts`) against the previous stage; every residual typesugar runtime reference is listed and explained                                                                                                                                                                                           |
| Bundle size             | Byte-identical at Stage 0; raw, gzip and brotli per `dist` file from the first stage that changes output                                                                                                                                                                                                                                        |
| Build / type-check time | `npm run build` and `npm run check` in `packages/remeda`, median of 3 warm runs                                                                                                                                                                                                                                                                 |
| What typesugar touched  | `case-study/scripts/expand.mjs`: runs the vendored pipeline over files and prints which ones it changes, and how                                                                                                                                                                                                                                |
| Adoption cost           | Lines changed in source, new imports, friction notes                                                                                                                                                                                                                                                                                            |

Machine for every number below unless stated: Apple M5 Pro, 18 cores, 64 GB,
macOS (Darwin 25.6), Node 22.23.2, shared with other work.

## Stages (proposed; each is one PR on this fork)

The shortlist proposed a first stage of `fused()` over array loops inside
remeda's own functions. There are none to fuse: remeda's source has no chained
array-method calls (14 non-test files call a single `filter`/`map`/`reduce`
and the like; none chain them), because its hot paths are hand-written loops.
So the fusion work moves to where chains are written, the call sites of
`pipe`.

0. **Integration, no source changes.** unplugin-typesugar in tsdown (Rolldown)
   and vitest. Expected: `dist/` byte-identical, tests unchanged, benches
   unchanged.
1. **What fusion does today, measured, no remeda changes.** The bench's chains
   written with `lazy()`/`fused()`, compiled by typesugar, against remeda's
   `pipe` and the hand-written loop. Port a sample of remeda's lazy-semantics
   tests (invocation counts, early exit, callback `(value, index, data)`
   arguments) to the `lazy()` form to find where the two disagree.
2. **remeda's `pipe` compiled by fusion.** Teach typesugar to recognise
   `pipe(data, ...steps)` where the steps are remeda's lazy functions and
   compile it into one loop, falling back to the runtime `pipe` for anything
   it can't prove equivalent. remeda's own `pipe`/`piped` tests and every lazy
   function's tests are call sites, so the runtime suite run through the
   transformer is the spec. This is mostly typesugar work.
3. **Extension-method syntax for data-last functions.** `purry`-style
   functions called as methods (`users.groupBy(...)`, `xs.chunk(2)`) where the
   name is not a native method. Names that are native methods depend on the
   decision in F2.
4. **`@tailrec` / `comptime`** where they apply (recursive helpers such as
   `isDeepEqual` and `mergeDeep`, constant tables). Likely small.

Stages may be reordered or cut based on what each one teaches; the log
records why.

## Stage log

### Stage 0: integration, no source changes

**Result: `dist/` is byte-identical; one runtime test fails because of a
typesugar design issue (F2).** With typesugar in the build, all 364 files in
`packages/remeda/dist` (181 ESM `.js`, 181 `.cjs`, `index.d.ts`, `index.d.cts`)
are byte-identical to v2.60.0, in repeated builds, and attw and publint pass.
Of the 2,954 runtime tests one more fails than at v2.60.0:
`src/isArray.test.ts` "should work as type guard in filter", because typesugar
rewrote `Array.isArray(c)` in the test file into a call of remeda's own
`isArray` (F2). Type tests and property tests are unchanged.

typesugar: branch `remeda-case-study-fixes` at `211929e5`, which is `main` at
`86bcf8c7` plus the fix for F3. Vendored in `vendor/typesugar/`.

What changed in the fork (no file under `packages/remeda/src` or
`packages/remeda/test` changed):

- `packages/remeda/tsdown.config.ts`: unplugin-typesugar's Rolldown plugin in
  the second (runtime JS) build step. There is no `unplugin-typesugar/rolldown`
  entry point, so the config takes the `rolldown` factory from the package's
  `unplugin` export (F1). The first step, which emits only declarations, runs
  without it (F4).
- `packages/remeda/vitest.config.ts`: the Vite plugin, ahead of
  `vite-tsconfig-paths`, so test files and the source they import are
  expanded before vitest runs them. `TYPESUGAR_VERBOSE=1` turns on its log in
  both configs.
- `case-study/`: the separate package holding the typesugar dependencies (own
  lockfile; remeda's root `package-lock.json` is unchanged), the bench
  (`bench.mjs`, `bench/pipe-chains.mjs`), `scripts/expand.mjs` and
  `experiments/`.
- `vendor/typesugar/`: tarballs, `pack.sh`, `COMMIT`.

Unlike Turf, nothing here runs TypeScript straight from source under Node:
vitest runs tests through Vite's plugins, so typesugar's Node loader (Turf F1)
is not needed.

Numbers (warm runs; `npm run build` median of 3):

|                                                                                                           | v2.60.0                                    | Stage 0                                                     |
| --------------------------------------------------------------------------------------------------------- | ------------------------------------------ | ----------------------------------------------------------- |
| `npm run build`                                                                                           | 1.75 s                                     | 3.0 s                                                       |
| `dist/` (364 files)                                                                                       |                                            | byte-identical                                              |
| Runtime tests (`--project runtime`)                                                                       | 2,944 pass, 9 expected fail, 1 todo; 3.2 s | 2,943 pass, **1 fail** (F2), 9 expected fail, 1 todo; 3.3 s |
| Type tests (`--project types`)                                                                            | 2,751 pass, no type errors; 1.1 s          | same; 7.1 s                                                 |
| Property tests (`--project prop`)                                                                         | 30 pass; 0.5 s                             | 30 pass; 1.9 s                                              |
| Files typesugar changes (386 `.ts` files under `src/`, `src/internal/`, `test/`, excluding `*.test-d.ts`) |                                            | 3, all test files (F2)                                      |

- Before the F3 fix, with the plugin in both build steps, the build took 72 s
  (median of 3: 71.6, 73.6, 85.0 s) and the runtime tests 57 s. The F3 fix
  brought the build to 40 s; leaving the declarations step without the plugin
  (F4) brought it to 3.0 s. The remaining 1.25 s is mostly building one
  TypeScript Program of 248 files.
- The type tests are slower because vitest still loads every `*.test-d.ts`
  through Vite to collect the tests, so the plugin builds a Program and visits
  each file; tsc then checks the original source, not the expanded one (F5).
- The three files typesugar changes are `src/isArray.test.ts`,
  `src/dropFirstBy.test.ts` and `src/sortBy.test.ts`. In all three a native
  method call became a call of an imported remeda function of the same name:
  `Array.isArray(c)` → `isArray(Array, c)`, `data.filter(f)` →
  `filter(data, f)`, `sortBy(...).map(f)` → `map(sortBy(...), f)`. The last
  two happen to give the same result in those tests; the first does not.
- Benches: see "Stage 0 benches" below.

#### Stage 0 benches

v2.60.0 (A, a fresh worktree) against Stage 0 (B, this checkout's build), 5
rounds, load average 4.3 to 5.8 (`case-study/results/stage-0-sanity/`): all 18
deltas are smaller than their spread, the largest +4.0% (a native control
case). The five control cases that don't use remeda moved −0.2% to +4.0%, so
that is this machine's noise for this suite. As expected for byte-identical
`dist` trees. (The run recorded both sides as `c362e7c` because Stage 0 was
not yet committed; B was the working tree described above.)

#### Baseline for the fusion stages

One run of `case-study/bench/pipe-chains.mjs` on v2.60.0's `dist` (not an A/B;
for orientation only):

| Case (n = 10,000 users unless stated)                |   ops/s |
| ---------------------------------------------------- | ------: |
| remeda `pipe(filter, map, take(10))` (lazy)          |  2.49 M |
| native `filter().map().slice(0, 10)`                 |  0.06 M |
| hand-written loop, same work                         |  29.5 M |
| remeda `pipe(filter, map, take(10))`, n = 10         |   5.9 M |
| native, n = 10                                       |  34.2 M |
| remeda `pipe(filter, map)` (no early exit, not lazy) |  14.2 k |
| native `filter().map()`                              |  66.4 k |
| hand-written loop, same work                         |  92.0 k |
| remeda data-first `map(users, f)`                    | 105.5 k |

Where a chain can stop early, remeda's lazy `pipe` is about 45 times faster
than the native chain and about 12 times slower than the loop that fusion would
emit. Where it can't, `pipe(filter, map)` was 4.7 times slower than native
`filter().map()`, although remeda's data-first `map` alone is faster than
native; why is not yet looked into.

### Syntax demo (before Stage 1)

`case-study/experiments/syntax-remeda.ts` and `syntax-typesugar.ts` do the
same four computations; `syntax-run.ts` runs both on the same 200 users and
prints "same results" (`typesugar run syntax-run.ts -p tsconfig.demo.json`).

| Computation   | remeda today                                                                      | with typesugar                                                 | compiles to                             |
| ------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------- | --------------------------------------- |
| utility chain | `R.pipe(users, R.filter(isActive), R.sortBy(rule), R.groupBy(g), R.mapValues(f))` | `sortBy(users.filter(isActive), rule).groupBy(g).mapValues(f)` | `mapValues(groupBy(sortBy(...), g), f)` |
| one utility   | `R.chunk(users, 25)`                                                              | `users.chunk(25)`                                              | `chunk(users, 25)`                      |
| reduction     | `R.pipe(users, R.filter(p), R.sumBy(f))`                                          | `fused(users.filter(p).map(f).reduce(add, 0))`                 | one `for` loop                          |
| early exit    | `R.pipe(users, R.filter(p), R.map(f), R.take(10))`                                | `fused(lazy(users).filter(p).map(f).take(10).toArray())`       | one `for` loop with a counter           |

What it shows:

- Extension methods turn remeda's data-first calls into method calls with no
  runtime cost; the output is the nested data-first call.
- `fused()` fuses native array methods and `lazy()` pipelines, not remeda's
  functions. It replaces remeda's `pipe` for map/filter/take chains instead of
  compiling it; compiling remeda's `pipe` is still Stage 2.
- Method chains that run through a remeda function with a generic return type
  are not rewritten and throw at runtime (F6), so `sortBy` has to stay a
  plain call. Editors and plain `tsc` don't know the methods exist (F5), and
  `typesugar check` reports the imports they use as unused (F7) or, when a
  native method has a similar name, the method as missing (F8).

## Findings

_typesugar bugs, gaps and design lessons, each with its status and evidence.
Strength: measured (tested against data) | unverified (plausible, not
checked)._

- **F1 (gap, open; measured): unplugin-typesugar has no `./rolldown` entry
  point.** It exports `./vite`, `./webpack`, `./esbuild`, `./rollup` and
  `./tsup`; tsdown, which remeda (and dinero.js and valibot) build with, takes
  Rolldown plugins. The package's root export, `unplugin`, does have a
  `rolldown` factory (unplugin 2), and it works: `unplugin.rolldown(options)`
  in tsdown's `plugins` is what Stage 0 uses. The dinero.js case study, running
  in parallel, found the same gap and added the entry point with docs on its
  typesugar branch `dinero-case-study-fixes` (`02479fc3`, `56e16666`; not
  pushed as of 2026-11-13). Stage 0 keeps the `unplugin.rolldown` form until
  that lands.
- **F2 (design issue, open, needs a decision; measured): importing a function
  named like a native method replaces the native call.** In a file that imports
  remeda's `sort`, typesugar rewrites `xs.sort(cmp)` into `sort(xs, cmp)`;
  likewise `reverse`, `map`, `join` and `Array.isArray(x)` → `isArray(Array,
x)`. The file needs no typesugar import and no macro: having the plugin in
  the build is enough. `case-study/experiments/stage-0-native-shadowing.ts`
  shows the effect, run against the built `dist`:

  |                | `xs.sort(cmp)` then `xs`             | `ys.reverse()` then `ys` | `[1, [2]].filter(x => Array.isArray(x))` |
  | -------------- | ------------------------------------ | ------------------------ | ---------------------------------------- |
  | as written     | `[1, 2, 3]`                          | `[3, 2, 1]`              | `[[2]]`                                  |
  | with typesugar | `[3, 1, 2]` (remeda's `sort` copies) | `[1, 2, 3]`              | `[]`                                     |

  Two rules combine. In `@typesugar/macros` `extension-imports.ts`, "Only a
  bare imported function named after the method (the explicit-override form)
  may shadow a native method", and transformer-core's
  `tryRewriteExtensionMethod` sets `forceRewrite` whenever such an import
  matches. The guide (`docs/guides/extension-methods.md`, "Resolution Order")
  says the opposite: "1. Native property: If `value` has a property `method`,
  use it", with forced rewrites only for `declare global` augmentations. And
  remeda's functions are generic (`sort<T extends IterableContainer>(data: T,
...)`, `isArray<T>(data: ArrayLike<unknown> | T)`), so with type parameters
  erased to their constraints (`core/src/extension-receiver.ts`) they accept
  any receiver, even `ArrayConstructor`. That second part is the open
  generic-extension-receiver decision in typesugar PR #86. For remeda's users
  the effect is that every file importing `map`, `filter`, `sort`, `reverse`,
  `join`, `concat`, `find`, `isArray`, ... has its native calls of those names
  rerouted, some with different results. Options: (a) a native method always
  wins, as the guide says, and an override must be written as a plain call;
  (b) only modules that opt in (`"use extension"`, `@extension`) supply
  extensions through a bare named import, which also answers PR #86's
  question; (c) both. Stage 3 depends on the answer.

- **F3 (bug, fixed; measured): the bundler plugin rebuilt the TypeScript
  Program for every file.** The first transform of each file called
  `pipeline.invalidate(file)` even when the bundler's code was the file on
  disk, and each rebuild re-read every file in the Program from disk (lib and
  `@types` declarations included; `VirtualCompilerHost.getSourceFile` reads a
  file twice when it isn't HKT-preprocessed). remeda's build went from 1.75 s
  to 72 s, the runtime tests from 3.2 s to 57 s; a profile put 54 of 66 s of
  plugin time in `ensureProgram`, mostly file opens, stats and package.json
  parsing. Fix: invalidate only when the code differs from what the Program
  read, as the ESLint processor already does. Commit `211929e5` on
  `remeda-case-study-fixes`, failing test first, with a changeset. The dinero.js
  study fixed the same bug independently the same day (`56f43c89` on
  `dinero-case-study-fixes`, same approach); only one of the two should land. Not fixed:
  each Program rebuild still re-reads every file from disk; worth a look when
  a rebuild is needed (watch mode).
- **F4 (bug, open; measured): one plugin instance serving builds that see
  different code for the same file thrashes.** tsdown runs its ESM and CJS
  builds through the same plugin instance. In remeda's declarations step
  (`emitDtsOnly`), one of them hands the plugin each source file's real text
  and the other `rolldown-plugin-dts`'s stub `export {}`, alternately. The
  plugin keeps one "latest code" per file, so every switch invalidates the
  file and rebuilds the Program (40 s of the 72 s), and between switches the
  Program holds `export {}` for that file, so a macro that reads types from
  another file would see an empty module. Workaround here: no plugin in the
  declarations step, which emits only `.d.ts` built by tsc from the files on
  disk. Fix needs per-build state in the plugin (or skipping code that isn't
  the file's TypeScript source); not done. The dinero.js study's
  declaration-file skip (`56e16666`) does not cover this case: here the stub
  arrives under the source file's own `.ts` id. Whether Vite's SSR and client
  builds hit the same thing: unverified.
- **F5 (limit; measured): type tests and `.d.ts` see the unexpanded source.**
  vitest's typecheck mode runs tsc on the original files, and the published
  declarations come from tsc too (Turf F5). Stage 0 is unaffected. It matters
  for Stage 3: a type test that calls a remeda function as a method only
  type-checks if the method is declared somewhere tsc can see.
- **F6 (bug; measured): a method chain through a generic remeda return type is
  not rewritten, and `typesugar check` passes it.** `users.sortBy(f).groupBy(g)`
  expands to `sortBy(users, f).groupBy(g)`, which throws `TypeError:
sortBy(...).groupBy is not a function` at runtime; the same happens after
  `.chunk(n)` and through a variable (`const s = users.sortBy(f); s.groupBy(g)`).
  `users.groupBy(g).mapValues(f)` and `sortBy(users, f).groupBy(g)` are
  rewritten correctly. Cause, from the code: `inferExtensionCallType` in
  `transformer-core/src/rewriting.ts` takes the return type of an
  uninstantiated generic signature, and remeda's `ReorderedArray<T>` and
  `Chunk<T, N>` are conditional types over `T` that then match no array
  receiver; a variable initialised from an extension call has the checker's
  `any` and is not inferred at all. `typesugar check` reported no error for
  any of these calls. Evidence: `case-study/experiments/syntax-chain-probe.ts`,
  `syntax-chain-probe2.ts`. Not fixed.
- **F7 (bug; measured): `typesugar check` reports imports used only through
  extension methods as unused.** With remeda's `noUnusedLocals`,
  `import { chunk, groupBy, mapValues } from "remeda"` used only as
  `users.chunk(25)` etc. gives TS6133 (TS6192 when all are unused), in
  `check` and `check --strict`. So a project with `noUnusedLocals` cannot use
  extension methods and keep `check` as its CI gate. Evidence:
  `typesugar check -p case-study/experiments/tsconfig.demo.json`. Not fixed.
- **F8 (bug; measured): a method whose name is close to a native one is
  reported as missing.** `users.filter(p).sortBy([f, "desc"])` is rewritten,
  but `typesugar check` reports TS2551 "Property 'sortBy' does not exist ...
  Did you mean 'sort'?", plus TS7006 on the callback parameter: it appears to
  suppress TS2339 for extension calls but not TS2551, which tsc uses when a
  similar name exists. Consistent with that: `users.sortBy(f)` on a
  `ReadonlyArray` (no `sort` member) passes, the same call on `User[]` fails.
  The suppression code itself is not yet read. Evidence:
  `case-study/experiments/syntax-similar-name-probe.ts`. Not fixed.
