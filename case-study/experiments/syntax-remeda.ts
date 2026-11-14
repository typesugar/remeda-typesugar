// Syntax demo, remeda as written today. Same computations as
// syntax-typesugar.ts.
import * as R from "remeda";

interface User {
  readonly id: number;
  readonly active: boolean;
  readonly score: number;
  readonly group: string;
}

export function demo(users: ReadonlyArray<User>) {
  // 1. A chain of remeda utilities.
  const topByGroup = R.pipe(
    users,
    R.filter((u) => u.active),
    R.sortBy([(u) => u.score, "desc"]),
    R.groupBy((u) => u.group),
    R.mapValues((us) => us.slice(0, 3)),
  );

  // 2. One utility, data-first.
  const pages = R.chunk(users, 25);

  // 3. A reduction that remeda runs as two passes.
  const total = R.pipe(
    users,
    R.filter((u) => u.active),
    R.sumBy((u) => u.score * 2),
  );

  // 4. An early-exit chain that remeda runs lazily.
  const firstTen = R.pipe(
    users,
    R.filter((u) => u.active),
    R.map((u) => u.score * 2),
    R.take(10),
  );

  return { topByGroup, pages, total, firstTen };
}
