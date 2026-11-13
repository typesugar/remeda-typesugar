# Vendored typesugar

The case study consumes typesugar as packed tarballs, the same files
`npm publish` would upload, so a stage can be reproduced without a local
typesugar checkout or `npm link`.

- Which commit: see [`COMMIT`](./COMMIT) (commit, branch, pack date, Node
  version and the SHA-256 of every tarball).
- Wiring: `case-study/package.json` is a separate npm package, not a member of
  remeda's workspaces. It depends on `typesugar`, `unplugin-typesugar` and
  `@typesugar/fusion` as `file:../vendor/typesugar/*.tgz`, and its `overrides`
  point every `@typesugar/*` package at its tarball, so the transitive
  dependencies resolve to these files as well, never to the npm registry. It
  is installed on its own with `npm install --prefix case-study` and has its
  own lockfile, so remeda's root `package-lock.json` is unchanged.
- `packages/remeda/tsdown.config.ts` and `packages/remeda/vitest.config.ts`
  resolve unplugin-typesugar from that package.

## Regenerate

From a clean typesugar checkout (or worktree) at the commit you want:

```sh
vendor/typesugar/pack.sh /path/to/typesugar
npm install --prefix case-study
```

`pack.sh` runs `pnpm install --frozen-lockfile` in the typesugar checkout,
builds the packages listed in it (two at a time), runs `pnpm pack` for each
into this directory, rewrites `COMMIT`, and points `case-study/package.json`
at the new files. Tarball names carry the first 8 characters of the commit
(`typesugar-core-0.1.1-211929e5.tgz`), so a repack is a new file name and a
lockfile can't keep installing old bytes under an unchanged one (Turf
finding F4). The remote URL recorded in `COMMIT` has any credentials removed.

Packed set: `typesugar`, `unplugin-typesugar`, `@typesugar/fusion` and their
workspace dependencies: `@typesugar/{core, macros, transformer,
transformer-core, lsp-common, reflect, derive, typeclass, type-system, std,
fp, contracts}`.
