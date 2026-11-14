# Bench A/B: v2.60.0 vs /Users/dean/src/personal/remeda-typesugar

- A: `c362e7cc2f42`; B: `c362e7cc2f42`
- Machine: Apple M5 Pro, 18 cores, 64 GB, darwin 25.6.0 arm64; Node v22.23.2
- Date: 2026-11-13T09:34:50.747Z to 2026-11-13T09:38:41.058Z
- Load average (1/5/15 min): start 4.27 4.69 6.22, end 5.83 4.98 5.96
- 5 rounds, interleaved A/B, one process at a time. Spread is the larger side's (max-min)/median.

| Benchmark                                       | A median ops/s | B median ops/s |  Δ % | Spread % (A / B) | IQR % (A / B) |                   |
| ----------------------------------------------- | -------------: | -------------: | ---: | ---------------: | ------------: | ----------------- |
| remeda pipe filter-map-take(10) n=10k           |      2,392,918 |      2,455,243 | +2.6 |       5.8 / 11.3 |     3.7 / 4.4 | noise: spread > Δ |
| native filter-map-slice(10) n=10k               |         53,685 |         54,847 | +2.2 |      12.1 / 14.6 |     7.8 / 1.2 | noise: spread > Δ |
| loop filter-map-take(10) n=10k                  |     28,141,850 |     28,478,497 | +1.2 |       7.8 / 15.3 |     3.8 / 2.5 | noise: spread > Δ |
| remeda piped (reused) filter-map-take(10) n=10k |      2,457,574 |      2,467,561 | +0.4 |       4.6 / 10.7 |     1.6 / 1.8 | noise: spread > Δ |
| remeda pipe filter-map-take(10) n=10            |      5,751,743 |      5,864,832 | +2.0 |       3.8 / 11.6 |     2.2 / 4.1 | noise: spread > Δ |
| native filter-map-slice(10) n=10                |     32,377,712 |     33,059,921 | +2.1 |       5.1 / 11.9 |     1.8 / 9.4 | noise: spread > Δ |
| remeda pipe map-filter-map-take(100) n=10k      |        179,963 |        184,933 | +2.8 |        4.5 / 9.0 |     2.2 / 6.4 | noise: spread > Δ |
| remeda pipe drop(100)-take(100)-map n=10k       |        432,483 |        433,241 | +0.2 |        4.3 / 7.0 |     2.1 / 5.5 | noise: spread > Δ |
| remeda pipe unique-take(20) n=10k               |      1,920,162 |      1,975,359 | +2.9 |        6.6 / 8.1 |     3.7 / 1.2 | noise: spread > Δ |
| remeda pipe flatMap-filter-first n=10k          |      3,504,943 |      3,551,527 | +1.3 |        4.4 / 7.9 |     2.3 / 0.6 | noise: spread > Δ |
| remeda pipe filter-find n=10k                   |        730,083 |        736,467 | +0.9 |       10.5 / 9.4 |     1.6 / 4.3 | noise: spread > Δ |
| remeda pipe filter-map n=10k                    |         14,172 |         14,488 | +2.2 |       10.7 / 9.4 |     2.2 / 6.3 | noise: spread > Δ |
| native filter-map n=10k                         |         63,814 |         66,396 | +4.0 |       15.3 / 6.4 |     8.8 / 0.6 | noise: spread > Δ |
| loop filter-map n=10k                           |         91,706 |         91,492 | -0.2 |        8.7 / 6.1 |     1.8 / 1.7 | noise: spread > Δ |
| remeda pipe filter-sumBy n=10k                  |         16,134 |         16,440 | +1.9 |        6.8 / 4.8 |     4.5 / 2.1 | noise: spread > Δ |
| remeda pipe groupBy n=10k                       |         11,571 |         11,990 | +3.6 |      12.3 / 18.4 |   10.8 / 10.4 | noise: spread > Δ |
| remeda data-first map n=10k                     |        105,613 |        103,584 | -1.9 |       11.3 / 7.1 |     9.0 / 0.8 | noise: spread > Δ |
| remeda data-first filter n=10k                  |         92,489 |         92,529 | +0.0 |        7.0 / 5.5 |     4.4 / 1.9 | noise: spread > Δ |

18 of 18 deltas are smaller than their spread.
Control cases (no remeda): deltas +2.2%, +1.2%, +2.1%, +4.0%, -0.2%.
