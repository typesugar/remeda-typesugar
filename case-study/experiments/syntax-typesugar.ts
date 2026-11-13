// Syntax demo, with typesugar. Same computations as syntax-remeda.ts.
import { fused, lazy } from "@typesugar/fusion";
import { chunk, groupBy, mapValues, sortBy } from "remeda";

interface User {
  readonly id: number;
  readonly active: boolean;
  readonly score: number;
  readonly group: string;
}

export function demo(users: ReadonlyArray<User>) {
  // 1. Extension methods: remeda functions called as methods.
  const topByGroup = users
    .filter((u) => u.active)
    .sortBy([(u) => u.score, "desc"])
    .groupBy((u) => u.group)
    .mapValues((us) => us.slice(0, 3));

  // 2. One utility as a method.
  const pages = users.chunk(25);

  // 3. Compiled to one loop.
  const total = fused(
    users
      .filter((u) => u.active)
      .map((u) => u.score * 2)
      .reduce((a, b) => a + b, 0),
  );

  // 4. Early exit, compiled to one loop.
  const firstTen = fused(
    lazy(users)
      .filter((u) => u.active)
      .map((u) => u.score * 2)
      .take(10)
      .toArray(),
  );

  return { topByGroup, pages, total, firstTen };
}
