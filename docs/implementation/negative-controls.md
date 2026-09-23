# Negative-control evidence

Each deliberate fault was applied only inside a validated temporary workspace. PASS means the unmodified test suite rejected that mutant. The production workspace was not altered by a mutation.

| ID | Deliberate fault | Focused test | Result | Mutant exit |
|---|---|---|---|---:|
| NC01 | Q01 incorrect implication key | tests/content/phase-a-independent.test.ts — Q01 | PASS (caught) | 1 |
| NC02 | Q02 missing Trail ordering rule | tests/content/phase-a-regressions.test.ts — Q02 | PASS (caught) | 1 |
| NC03 | S01 final submit bypasses feedback | tests/unit/session-machine.test.ts — S01 | PASS (caught) | 1 |
| NC04 | T07 global attempt idempotency guard removed | tests/unit/app-store.test.ts — T07: repeated callbacks | PASS (caught) | 1 |
| NC05 | T01/T03 paused time counted as active | tests/unit/session-machine.test.ts — T01: exact | PASS (caught) | 1 |
| NC06 | F01/F03 empty selection falls back to all content | tests/content/catalog.test.ts — all 48 requested cells | PASS (caught) | 1 |
| NC07 | A01 wrong Hard answers counted as solved | tests/unit/analytics.test.ts — A01 | PASS (caught) | 1 |
| NC08 | M01 default write allowed before hydration | tests/unit/app-store.test.ts — M01 | PASS (caught) | 1 |
| NC09 | Q12/P01 staged content served as approved | tests/content/pipeline.test.ts — P01/Q12 | PASS (caught) | 1 |
