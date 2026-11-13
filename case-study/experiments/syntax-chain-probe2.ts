import { chunk, groupBy, sortBy } from "remeda";

interface User {
  readonly score: number;
  readonly group: string;
}
declare const users: ReadonlyArray<User>;

const annotated: ReadonlyArray<User> = users.sortBy((u) => u.score);
export const g = annotated.groupBy((u) => u.group);
export const h = sortBy(users, (u) => u.score).groupBy((u) => u.group);
export const i = users.chunk(2).groupBy((c) => String(c.length));
