import { groupBy, mapValues, sortBy, sumBy, chunk } from "remeda";

interface User {
  readonly active: boolean;
  readonly score: number;
  readonly group: string;
}
declare const users: ReadonlyArray<User>;

export const a = users.groupBy((u) => u.group);
const sorted = users.sortBy((u) => u.score);
export const b = sorted.groupBy((u) => u.group);
export const c = users.sortBy((u) => u.score).groupBy((u) => u.group);
export const d = users.groupBy((u) => u.group).mapValues((us) => us.length);
export const e = users.sumBy((u) => u.score);
export const f = [1, 2, 3].chunk(2);
