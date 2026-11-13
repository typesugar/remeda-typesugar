#!/usr/bin/env node
// Pipe-chain benchmark for the remeda case study. remeda has no benchmark
// suite of its own.
//
//   node case-study/bench/pipe-chains.mjs <dist-dir> [--filter <substring>]
//
// <dist-dir> is a built packages/remeda/dist; the suite imports its index.js,
// so it measures the shipped JavaScript, with no TypeScript loader in the
// process. Prints one line per case in the format case-study/bench.mjs reads:
//
//   <name> x <ops/sec> ops/sec ±<rme>% (<samples> runs sampled)
//
// Cases:
// - "remeda pipe ..." are the chains under test. Some can stop early (take,
//   find, first), which is when remeda's pipe evaluates lazily item by item;
//   the others run each step over the whole array.
// - "remeda data-first ..." call one function directly, without pipe.
// - "native ..." and "loop ..." do the same work with Array methods and a
//   hand-written loop. They don't use remeda, so in an A/B run their deltas
//   show the machine's noise, and the loop is what a fused chain should
//   approach.
//
// Inputs are fixed (seeded), unlike Turf's random fixtures (Turf finding F6).

import path from "node:path";
import { pathToFileURL } from "node:url";

const args = process.argv.slice(2);
const distDir = args.find((a) => !a.startsWith("--"));
if (!distDir) {
  console.error("usage: pipe-chains.mjs <dist-dir> [--filter <substring>]");
  process.exit(1);
}
const filterAt = args.indexOf("--filter");
const only = filterAt === -1 ? undefined : args[filterAt + 1];

const R = await import(pathToFileURL(path.resolve(distDir, "index.js")).href);

// mulberry32: small, fast, deterministic.
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeUsers(n, seed) {
  const r = rng(seed);
  return Array.from({ length: n }, (_, id) => ({
    id,
    active: r() < 0.3,
    score: Math.floor(r() * 1000),
    group: `g${Math.floor(r() * 20)}`,
    tags: Array.from({ length: 1 + Math.floor(r() * 3) }, () =>
      Math.floor(r() * 50),
    ),
  }));
}

const users = makeUsers(10_000, 1);
const small = makeUsers(10, 2);
const nums = Array.from({ length: 10_000 }, rng(3)).map((x) =>
  Math.floor(x * 500),
);

const isActive = (u) => u.active;
const double = (u) => u.score * 2;
const reusable = R.piped(R.filter(isActive), R.map(double), R.take(10));

/** name -> function returning a value (consumed so the work isn't dropped). */
const cases = {
  // Early exit: remeda evaluates these lazily.
  "remeda pipe filter-map-take(10) n=10k": () =>
    R.pipe(users, R.filter(isActive), R.map(double), R.take(10)),
  "native filter-map-slice(10) n=10k": () =>
    users.filter(isActive).map(double).slice(0, 10),
  "loop filter-map-take(10) n=10k": () => {
    const out = [];
    for (const u of users) {
      if (!u.active) continue;
      out.push(u.score * 2);
      if (out.length === 10) break;
    }
    return out;
  },
  "remeda piped (reused) filter-map-take(10) n=10k": () => reusable(users),
  "remeda pipe filter-map-take(10) n=10": () =>
    R.pipe(small, R.filter(isActive), R.map(double), R.take(10)),
  "native filter-map-slice(10) n=10": () =>
    small.filter(isActive).map(double).slice(0, 10),
  "remeda pipe map-filter-map-take(100) n=10k": () =>
    R.pipe(
      users,
      R.map((u) => u.score),
      R.filter((s) => s % 3 === 0),
      R.map((s) => s + 1),
      R.take(100),
    ),
  "remeda pipe drop(100)-take(100)-map n=10k": () =>
    R.pipe(users, R.drop(100), R.take(100), R.map(double)),
  "remeda pipe unique-take(20) n=10k": () =>
    R.pipe(nums, R.unique(), R.take(20)),
  "remeda pipe flatMap-filter-first n=10k": () =>
    R.pipe(
      users,
      R.flatMap((u) => u.tags),
      R.filter((t) => t > 48),
      R.first(),
    ),
  "remeda pipe filter-find n=10k": () =>
    R.pipe(
      users,
      R.filter(isActive),
      R.find((u) => u.score > 990),
    ),

  // Whole-array chains: no step can stop early.
  "remeda pipe filter-map n=10k": () =>
    R.pipe(users, R.filter(isActive), R.map(double)),
  "native filter-map n=10k": () => users.filter(isActive).map(double),
  "loop filter-map n=10k": () => {
    const out = [];
    for (const u of users) if (u.active) out.push(u.score * 2);
    return out;
  },
  "remeda pipe filter-sumBy n=10k": () =>
    R.pipe(
      users,
      R.filter(isActive),
      R.sumBy((u) => u.score),
    ),
  "remeda pipe groupBy n=10k": () =>
    R.pipe(
      users,
      R.groupBy((u) => u.group),
    ),

  // Data-first calls.
  "remeda data-first map n=10k": () => R.map(users, double),
  "remeda data-first filter n=10k": () => R.filter(users, isActive),
};

let sink = 0;
function consume(v) {
  if (Array.isArray(v)) sink += v.length;
  else if (typeof v === "number") sink += v;
  else if (v && typeof v === "object") sink += 1;
}

/** Iterations that take about `ms` milliseconds. */
function calibrate(fn, ms) {
  let n = 1;
  for (;;) {
    const t0 = performance.now();
    for (let i = 0; i < n; i++) consume(fn());
    const dt = performance.now() - t0;
    if (dt >= ms / 4) return Math.max(1, Math.round((n * ms) / dt));
    n *= 2;
  }
}

const SAMPLES = 10;
const SAMPLE_MS = 100;

for (const [name, fn] of Object.entries(cases)) {
  if (only && !name.includes(only)) continue;
  // Warm up, so the samples measure optimised code.
  const warm = performance.now();
  while (performance.now() - warm < 200) consume(fn());
  const n = calibrate(fn, SAMPLE_MS);
  const hz = [];
  for (let s = 0; s < SAMPLES; s++) {
    const t0 = performance.now();
    for (let i = 0; i < n; i++) consume(fn());
    hz.push((n * 1000) / (performance.now() - t0));
  }
  const mean = hz.reduce((a, b) => a + b, 0) / hz.length;
  const sd = Math.sqrt(
    hz.reduce((a, b) => a + (b - mean) ** 2, 0) / (hz.length - 1),
  );
  // 95% margin of error, t-distribution with 9 degrees of freedom.
  const rme = ((2.262 * sd) / Math.sqrt(hz.length) / mean) * 100;
  console.log(
    `${name} x ${Math.round(mean).toLocaleString("en-US")} ops/sec ±${rme.toFixed(2)}% (${hz.length} runs sampled)`,
  );
}
if (sink === 0.5) console.log("unreachable");
