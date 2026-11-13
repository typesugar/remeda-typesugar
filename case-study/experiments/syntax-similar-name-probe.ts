// F8: rewritten, but typesugar check reports TS2551 ("Did you mean 'sort'?").
import { sortBy } from "remeda";

interface User {
  readonly active: boolean;
  readonly score: number;
}
declare const users: ReadonlyArray<User>;

export const a = users.filter((u) => u.active).sortBy([(u) => u.score, "desc"]);
export const b = users.sortBy((u) => u.score);
