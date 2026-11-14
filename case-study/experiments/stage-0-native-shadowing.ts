// Stage 0, finding F2: a bare import named like a native method replaces the
// native call. Nothing here uses typesugar; the file only imports remeda.
//
//   node case-study/scripts/expand.mjs case-study/experiments/tsconfig.json \
//     case-study/experiments/stage-0-native-shadowing.ts
import { isArray, join, map, reverse, sort } from "remeda";

const xs = [3, 1, 2];
xs.sort((a, b) => a - b); // native: sorts xs in place
export const sorted = xs; // [1, 2, 3]

const ys = [1, 2, 3];
ys.reverse(); // native: reverses ys in place
export const reversed = ys; // [3, 2, 1]

export const doubled = [1, 2].map((x) => x * 2);
export const joined = ["a", "b"].join("-");
export const arrays = [1, [2]].filter((x) => Array.isArray(x));
export const used = [isArray, join, map, reverse, sort];
