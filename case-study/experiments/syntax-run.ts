// Runs both syntax demos on the same users and compares the results.
import { demo as viaRemeda } from "./syntax-remeda";
import { demo as viaTypesugar } from "./syntax-typesugar";

const users = Array.from({ length: 200 }, (_, id) => ({
  id,
  active: id % 3 !== 0,
  score: (id * 37) % 101,
  group: `g${id % 4}`,
}));

const a = JSON.stringify(viaRemeda(users));
let b: string;
try {
  b = JSON.stringify(viaTypesugar(users));
} catch (error) {
  b = `threw: ${String(error)}`;
}
console.log(
  a === b
    ? "same results"
    : `different:\n remeda    ${a.slice(0, 200)}\n typesugar ${b.slice(0, 200)}`,
);
