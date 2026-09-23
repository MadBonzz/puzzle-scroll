# Mandatory implementation verification contract

Companion to [the implementation plan](plan.md), added after review on 2026-09-22. This specifies tests the implementation must create and run; it does **not** claim they already exist or pass. Current `package.json` has typecheck, fixture validation and build scripts, but no unit/integration/E2E test runner. No application code or dependencies were changed to prepare this contract.

## 1. Rules that prevent misleading verification

1. Test the production reducer, selector, generator, grader, migration, analytics and rendered screens. Do not implement a second toy app in the tests and call that integration coverage. Mock only external boundaries such as native modules, clocks and persistence transport; retain real serialization, filtering and grading logic.
2. For an existing defect, record a failing test on the relevant unchanged implementation, repair the code, then record the same test passing. If extraction is necessary, preserve behavior first. New-feature tests can begin red because the feature is absent, but the final result must demonstrate the requested behavior.
3. Expected answers come from independently derived fixtures/constraints, not `correctIndex`, the production solution function, or a generated explanation. A test of `grade(key) === correct` is not a correctness oracle. It is only a wiring test.
4. Preserve test expectations during a repair. If an expectation is wrong, document its mathematical/product evidence and change it separately; do not silently redefine the requirement to obtain green tests. Ask for direction if this changes an approved product requirement.
5. Prove selected tests can detect bad behavior using the negative controls in section 8. Every mutation must fail for the intended assertion, not just a syntax/build error. Restore the good code after each temporary mutation without destructive Git operations or losing unrelated edits.
6. No `.skip`, `.todo`, zero-test success, unconditional success on caught errors, removed registries to hide failures, broad mocks of the behavior under test, or bulk snapshot updates as a fix. Explicit quarantines must be visible in the coverage/disposition report and excluded from every production path.
7. Record exact commands, code revision/worktree identifier, seed manifest, test counts, failures and evidence paths. Distinguish PASS, FAIL and NOT RUN. Missing browser binaries, permissions or devices are NOT RUN, never PASS.
8. Automated tests reduce error risk; they cannot certify prose quality, actual 5–10-minute human effort, rights clearance or native usability. Preserve the editorial/device gates instead of inventing evidence.

## 2. Harness and reproducibility

At the start of Phase A, create compatible unit/component and web E2E harnesses. Recommended: Jest with `jest-expo` and React Native Testing Library for the Expo/React Native app, and Playwright for the exported web app. Verify compatibility with the repository's installed Expo/React versions before selecting dependencies; do not copy arbitrary latest version pins or migrate to Expo Router just to test. Expo documents the preset and component library in its [unit-testing guide](https://docs.expo.dev/develop/unit-testing/). Browser tests should operate visible controls and isolate storage, following [Playwright's testing guidance](https://playwright.dev/docs/best-practices).

Proposed test locations (create during implementation; filenames may vary if the ledger maps equivalents):

```text
tests/unit/           session, clocks, selectors, grading, analytics, migration
tests/integration/    actual screens + real store/reducer with fake I/O boundaries
tests/content/        independent reference solvers, fixtures, generated properties
tests/fixtures/       versioned legacy stores, content, clock/event traces
tests/e2e/            exported-web flows, reload/offline/update and accessibility checks
docs/implementation/ verification ledger, content disposition, device/editorial records
```

Required command interface to create:

| Command | Required behavior |
|---|---|
| `npm run test:unit` | Non-watch reducer/clock/selector/grading/analytics/migration suites; nonzero on any failure or zero discovered tests. |
| `npm run test:integration` | Real rendered component/store interactions and storage fault injection. |
| `npm run test:content` | Approved bank schema, independent answer validators and fixed-seed sweep; supports a documented smoke/full configuration. |
| `npm run test:e2e` | Starts or targets an isolated local exported-web build, waits for readiness, runs actual browser interactions, saves failure traces and stops only its own server. |
| `npm run verify` | Runs typecheck, existing puzzle validation or its documented replacement, unit, integration, full content checks, build and web E2E sequentially; propagates every failure. No deploy. |

Install dependencies/download test browsers only through normal permitted setup; do not label an unavailable suite passed. `verify` must not turn missing infrastructure into a green release gate. Native/manual evidence is separately required and never implied by this command.

Use injected monotonic clocks/fake timers for exact timing assertions; avoid real five-minute waits. Make production generators accept explicit seeds or a seeded RNG. Retain fixed known-failure fixtures; run every approved template and supported parameter/tier boundary. For retained legacy generators, the full sweep includes levels 1–20 and at least 200 seeds per level, as in the audit; also test every supported new tier/parameter boundary with at least 200 deterministic seeds per randomized configuration. Static authored items are checked individually, not inflated into thousands of identical tests. Record seed/version sets, and add a separate reproducible held-out seed set before release.

Existing audit scripts are diagnostic: the generator probe prints defects yet exits zero. Do not treat that exit status as a content pass. Port its useful oracles into assertions, expand them, and map all 68 training families and 8 assessment mappings to retained/repaired/quarantined/replaced dispositions. Historical probe outputs remain evidence even after source extraction makes those scripts incompatible.

## 3. Independent answer and content tests — Phase A, expanded in D/F

All cases below must reach the actual production content/grade/eligibility path, with a separate test oracle. Table examples are fixed acceptance fixtures, not a requirement to retain every old presentation.

| ID | Input and exact expectation |
|---|---|
| Q01 Implication | Enumerate all 8 assignments of A/B/C. For `A⇒B`, `B⇒C`, `¬C`, the sole satisfying assignment is `(false,false,false)`. Keep the app's existing conclusion; improve its explanation. Separate counterexample: `A=false,B=true,C=true` satisfies the two implications and disproves the invalid general inference `¬A⇒¬B`. |
| Q02 Trail | For available tiles A/B/1/2, Start A + alternate alone admits both `A-1-B-2` and `A-2-B-1`. Confirm the old wording is ambiguous. After adding ascending letters/numbers and use-each-once, enumerate all 24 permutations: only `A-1-B-2` satisfies all rules. Reject `2-B-1-A`, repeats, missing/extra tiles and `A-2-B-1`. A different repaired interaction must enforce equivalently explicit constraints. |
| Q03 Dual Track | Construct all four combinations of position match yes/no and color match yes/no from displayed stimuli. Each must grade according to both observed features. If keeping both matches possible, supply an unambiguous Both response; if forbidding them, assert the generator never produces them. Never accept No match when either feature matches. |
| Q04 Peripheral Catch | Exercise every supported target location. The rendered stimulus contains exactly one intended target and the accepted response identifies its displayed location. No replacement may hide a center target; if the redesigned task forbids center, assert no generated center target. Distinct locations must not collapse to an unexplained Center option. |
| Q05 Equations | Fixture `x+y=10`, `x-y=2` gives x=6,y=4 by an independent solve. `difference+y` is 6 and cannot be a distractor for x. Every four-choice template must yield four distinct, answer-inequivalent choices across seeds and boundaries; zero key errors. Binary tasks remain legitimately binary. |
| Q06 Bottleneck | Independent test network: Design 2, then parallel Build 5 and Test 7, then Deploy 3. Total=12. Reducing Design, Test or Deploy by 1 each yields 11; reducing Build yields 12. Broad Which action reduces completion time is not single-answer with those choices. A narrowed Which parallel branch controls Deploy uniquely answers Test. Check the actual revised prompt against its own graph. |
| Q07 Deduction cases | Encode every stated assignment/cardinality/order rule; independently enumerate feasible assignments. If the problem requires unique assignment, exactly one must remain. Delete a required one-to-one rule in a negative fixture and demonstrate the uniqueness/assumption gate detects the issue. Do not encode an unstated rule only in the solver. |
| Q08 Rule Cascade | Every required switch (including parity, if retained) is explicitly stated and demonstrated by an example. Derive responses from visible rule history. Include transitions just before/on/after a rule change; no key may rely on an omitted parity rule. |
| Q09 Memory/span | Recompute equation truth from displayed rows and derive the ordered recall target from presented stimuli. Include all-true, all-false, repeated-symbol, palindrome and unchanged-shuffle cases. Response choices must retain the template's declared count and semantic uniqueness. Test renderer study/interference/response phases together, not only generator objects. |
| Q10 Response normalization | With an exact unitless rational fixture 1/2 and decimal input explicitly supported: accept `1/2`, `2/4`, `0.5`; reject `1/3`, empty input, `1/0`, NaN and infinity. For a separate declared tolerance target 10 ±0.1 inclusive, accept 9.9/10.1 and reject 9.89/10.11 using decimal-safe comparison. Unitless, unit-required and convertible-unit policies each need explicit tests; no silently stripped units. |
| Q11 Choice identity | Permute displayed options while retaining stable choice IDs. The same semantic answer grades identically after reorder, reload and review. Duplicate display strings and equivalent values such as 0.5/1⁄2 cannot masquerade as distinct single-select answers. |
| Q12 Publication gate | Missing key/validator, invalid choice count, ambiguous alternatives, failed independent solve, missing required assumptions, missing rights evidence or quarantine status makes content ineligible for practice, checks, retries and cached pack loading. A previous affected attempt may remain in history with an unreliable-content flag; it is not silently regraded. |
| Q13 Difficulty/depth | All approved items have pace eligibility, one required tier, category, response format, effort hypothesis and QA provenance. Test all six pace/tier requests and all 48 category cells. Metadata cannot prove depth: require a case-by-case reasoning outline and independent editorial disposition for the 24 slow-hard cases, with unknown human timing labelled provisional. |

For other fixed verbal/logic items, preserve an item-level evidence record of independent reasoning, assumptions, correct answer and why distractors fail. Particular attention: critical-assumption cannot make a sufficient but unnecessarily strong claim the uniquely necessary assumption. Tests can enforce a completed review record, not make the review true merely because a Boolean says approved. A second LLM verdict alone is not independent mathematical verification or human editorial review.

The coverage report must list every original family and every newly approved item/template; failed content cannot disappear from its denominator. Cases linked into one long problem count once toward corpus targets. Renaming variables, reseeding numbers or shuffling options does not create independent authored cases.

## 4. Session and timing tests — Phases A/B

Test the production state machine with event traces, then confirm visible behavior in component integration tests. Include practice, quick check and Custom three-misses paths.

| ID | Required assertion |
|---|---|
| S01 Final response | For final correct and final incorrect answers, submit creates exactly one immutable attempt and displays feedback, not summary. Correct answer, chosen answer and explanation are visible. Explicit View results then shows summary with Done and Review answers. |
| S02 Third miss | Two existing misses + another miss produces final feedback first, then summary on explicit action. No fourth question; miss/attempt totals change once. |
| S03 Review and retry | Answer, navigate away/back, open review and reload: original response/options/outcome remain unchanged and noneditable. Retry is explicit and creates a new attempt/instance identity without mutating the first. |
| S04 Exits | Close and platform Back from each phase follow the same policy. Instructions before session start return safely to setup; active close offers Resume/End. Feedback close preserves feedback and its committed answer; resuming returns there. Summary Done/Back goes Home, not a restarted feed. Review Back returns to summary. No hidden tab/lock operation is necessary. |
| S05 Early end | End after one submitted answer and one unanswered item: only the submitted answer enters submitted-answer accuracy; the open item is recorded as unsubmitted/abandoned according to the documented model, not incorrect. Keep history/review and a visible exit. |
| S06 Illegal events | Submit from ready/study/paused/summary, Next before answer without explicit skip, stale events from an old item, and repeated View results cannot change the active item or duplicate records. Explicit skip records skipped, not incorrect. |
| T01 Exact accounting | Fake trace: instructions 2s, study 3s, interference 2s, response 4s, pause 7s, response 1s, submit, feedback 5s. Expect activeTaskMs=10,000; responseMs=5,000; studyMs=3,000; interferenceMs=2,000; feedbackMs=5,000; engagedMs=17,000; wallElapsedMs=24,000. |
| T02 Boundary | A 1,000ms remaining budget: submission at 999ms is normal, at 1,000ms or 1,001ms is timedOut for an ordinary response task. Test final-item and nonfinal-item cases. Fake-time dispatch ordering cannot overwrite a timely captured response or award two attempts. |
| T03 Feedback/pause | Advance fake time by 60s during feedback and 60s while paused: no active budget is consumed. If zero budget remains at submission, keep feedback and offer View results. No negative countdown and no new item. |
| T04 Background/restart | Background stops active counting. Persist duration totals; reload with a different monotonic origin, then add 2s of valid response work: exactly 2,000ms is added, not the background/process downtime. Detect interrupted timed study and invalidate/replace the check trial or mark check incomplete; replay cannot improve the same scored trial. |
| T05 Slow target | At the 15-minute soft target while working, allow submission of the current item and its feedback. Do not append a fresh case. Explicit Custom hard timer uses T02 instead; untimed sessions do not synthesize expiry. |
| T06 No-go | For a fixture protocol with a 1,000ms no-go window: no response throughout is correct; a response at 500ms is incorrect. A go trial with no response is an omission, not a correct no-go. This protocol completion rule must not accidentally use generic timeout grading. |
| T07 Idempotency | Rapid double tap, duplicate callback, persistence retry and remount after commit yield one logical attempt, one summary contribution and one aggregate update. An old item's timeout cannot end the next item. |

Add bounded model-based traces through every declared state edge and guard. Assert invariants after every event: durations nonnegative, one current instance, no duplicate commits, immutable saved responses, no unstarted scored attempt, no summary without a visible exit. Do not use the production reducer as its own expected-state oracle. Keep a small independent transition table derived from the approved behavior.

## 5. Settings, migration and analytics — Phases B/C/E

| ID | Required assertion |
|---|---|
| F01 Required modes | Parameterize 2 paces × 3 tiers × 8 categories. Every delivered item matches all selected axes and is approved. Include two sources within one cell and one source spanning different cells, proving source does not determine mode. An empty cell shows unavailable with no fallback item. |
| F02 Simple setup | Default screen exposes Fast/Slow, Easy/Medium/Hard, categories, Start and Custom. Fine family controls are hidden until Custom. No source collection selector replaces required controls. Defaults Fast/Easy, last saved selection restored. |
| F03 Exclusions | An explicit 67-of-68 legacy selection remains explicit after save/reload; the excluded family does not return. All-current/future mode includes a newly approved family; an explicit allowlist does not. Empty category/type intersection never falls back to all content. |
| F04 Draft changes | Custom Cancel leaves stored preferences and active session snapshot unchanged; Apply persists only the draft. Category changes retain compatible filters. If a pace/tier change requires clearing incompatible exclusions, show the exact proposed reset and require confirmation before broadening; cancel preserves previous selections. No eligible pool produces a clear empty state. |
| M01 Hydration | Delay the initial read while UI mounts: no default-state write may overwrite saved data and Start is gated. Resolve hydration with a fixture, then verify saved selection/history render correctly. |
| M02 Legacy facts | Build fixtures from actual old interfaces/storage keys. A one-second legacy attempt is not retroactively claimed to be one measured second. Preserve original data plus legacy labels; absent selected response stays unavailable for review. Placeholder baseline 50 stays unknown, not a new measured result. |
| M03 Migration safety | Running migration twice is idempotent. Corrupt/unknown-version data and write failure preserve the original bytes or recoverable copy; no silent reset. Resume migration after an injected crash between staging and activation. Validate before switching storage version. |
| M04 Write order | Delay older save A and newer save B in reverse completion order: reload must recover B or a visible recoverable error, never silently resurrect A. Aggregate and attempt updates are atomic/idempotent at the logical level even if underlying storage lacks transactions. |
| M05 Retention | Fixture 301 correct attempts and 51 checks: enforce any bounded detail policy without losing known totals (301/51). Detail gaps are disclosed; no invented historical timestamps/answers. Preserve old domain lifetime totals even if retained details contain only 300 entries. |
| M06 Reset | Cancel reset preserves preferences, history and session. Confirm reset clears only the clearly disclosed app-owned scope, never unrelated storage/caches. Test this separately in isolated storage; do not reset the developer's real profile. |
| A01 Outcome math | Fixture: 3 unassisted correct +1 assisted correct +2 incorrect +1 skipped +1 timedOut +1 interrupted =9 recorded outcomes. Submitted-answer accuracy is 4/6, not 4/9 or 5/6. Assistance is a separate flag/subtotal, not a second outcome. If all six submitted items are Hard, Hard solved=4 with assisted=1, not 6. |
| A02 Latency gates | Ten correct unassisted eligible responses of 1,000 through 10,000ms have median 5,500ms. Wrong, assisted, interrupted or other-family/tier/pace/protocol responses must not enter that sample. With 9 eligible correct responses show insufficient data; with 10 show median; comparative trend requires 20 eligible samples with compatible comparison groups, not merely 20 unrelated attempts. |
| A03 Zero and all wrong | No submitted answers gives unavailable accuracy, not NaN, 0%-as-measured or fabricated 50. Ten incorrect submitted answers gives 0% accuracy and no correct-answer median. No synthetic profile for unassessed domains. |
| A04 Real time | A new one-second correct attempt contributes 1,000ms active time, not 15,000. Review time and legacy estimates remain separate. Session/day/week sums reconcile with retained aggregates; pause/background do not become active minutes. |
| A05 Local days | With timezone America/New_York, 2026-09-22T03:59Z belongs to Sep 21 and 04:01Z to Sep 22. Include DST fixture 2026-11-01T05:30Z and 06:30Z: both belong to Nov 1, with one real hour between instants despite repeated local 01:30. Streak recomputes after inactivity; do not silently reinterpret uncertain legacy UTC dates. |
| A06 Baselines | First eligible result for a domain/form family establishes baseline; later compatible result compares to it. An interrupted trial cannot establish a valid timed baseline. A check covering only two domains supplies no scores for the other six; incompatible versions/forms/tiers and practice results never silently merge. |

Migration fixtures must be synthetic/anonymized. Store boundary failures are intentional test inputs, not a reason to remove data safety checks. Where a legacy preset mapping is unspecified, document the mapping and preserve exclusions before testing it; do not assume every legacy mode means Slow/Hard.

## 6. Pack ingestion and browser/device integration — Phases C/D/F

| ID | Required assertion |
|---|---|
| P01 Fail closed | Source staged with no valid answer, missing rights evidence or ambiguous solution never appears in eligible feeds. A code-only license is not automatic clearance of embedded third-party content. Verify pack approval at loading as well as import. |
| P02 Idempotent import | Import the same stable source/item/version twice: approved distinct item count does not double. Changed wording/key creates a new content version and does not rewrite historical review snapshots. |
| P03 Coverage honesty | Machine-readable output includes all 48 cells, approved/quarantined counts and distinct templates/cases. Pilot gate counts 144 independent reasoning items including 24 slow-hard cases, plus 24 cognitive configurations; linked parts and random permutations cannot pad totals. Missing targets stay explicit, not passed via count relabeling. |
| E01 Baseline regression | In the real browser, complete a deterministic small quick-check fixture with the final response wrong; see final feedback, then summary, Review answers, Back, Done and Home. Repeat final-correct and three-misses paths. Inspect persisted records and visible counts; no double commit. |
| E02 Long-case resume | Open a long Slow/Hard case, enter notes and draft answer, scroll to rules and back, navigate away and reload; notes, same case/version/options and draft restore. Submit, reload and review: saved response remains immutable. Ordinary vertical scroll must not change the question. |
| E03 Settings persistence | Use visible controls for all six pace/tier combinations with category changes and Custom Apply/Cancel; reload. Delivered metadata and visible summary match. Check empty pool and exclusion persistence in the built app, not only a selector unit test. |
| E04 Storage errors | Simulate delayed hydration, blocked writes and corrupt data in isolated browser storage. Recovery/error state is visible, existing data is not overwritten, duplicate Retry actions do not duplicate attempts. |
| E05 Offline/update | Warm a pack, go offline, complete and reload a session using available content. Interrupted new-pack download leaves previous valid pack usable. A mid-session update cannot replace current content/key/stimulus. Version activation occurs safely between sessions. |
| E06 Cache boundaries | Seed one app-owned stale cache and a sentinel unrelated cache. An actual service-worker update removes only permitted app-owned stale caches. A missing JS/image request must not receive index HTML masquerading as the asset; offline navigation fallback remains functional. |
| E07 Layout/accessibility | At 320/390/430px and tablet/desktop sizes, verify visible reachable exits and no clipped mandatory rules/options/input/feedback. Test keyboard entry/Tab focus, labels and non-color feedback. Capture representative long-case/final-feedback/summary screens and inspect them; snapshots alone cannot prove usability. |
| E08 Native lifecycle | On real supported target devices, test Android Back, screen sleep/background during every timed phase, interrupted study, scrolling versus gestures, 200% text, landscape, TalkBack/VoiceOver as applicable. Record platform/version and result. Web emulation is not native-device evidence. |

End-to-end fixtures may inject deterministic content and time only through a guarded test boundary; they must use real UI, selection, grading and store logic. Such a boundary must not allow production users to bypass publication/rights gates or rewrite scores. Do not test against personal stored progress or publish a test build publicly.

## 7. Phase completion and evidence ledger

Maintain `docs/implementation/verification-ledger.md` with one row per test ID and per audit finding disposition:

```text
Requirement / audit ID | production files | test file/case | oracle/fixture
red evidence (existing defect) | green command/result/count | seed/revision
negative-control result | PASS / FAIL / NOT RUN | unresolved limitation
```

- Phase A: harness, Q01–Q12 for repaired/released scope, S01–S06, F03 and the relevant storage/analytics regressions. Quarantines have explicit gates, not undocumented omissions.
- Phase B: S/T, M and A04/A05 timing/migration cases; real component/store integration.
- Phase C: F01–F04, S04 exits and E01–E03/E07 browser paths.
- Phase D: all Q/P requirements, individual item evidence and all-cell coverage report; editorial review status explicit.
- Phase E: all A requirements plus real screen/store reconciliation.
- Phase F: full seeded sweep, all automatic suites, exported build, E04–E08, negative controls and unresolved-defect review. Record corpus targets separately from code completion.

Run focused tests while changing code; rerun the full `verify` command after the final edits to code/content/config, not only an earlier revision. Preserve failing browser traces/screenshots for diagnosis. No open Critical/High (P0/P1 equivalent) correctness/navigation/data-integrity issue in the released scope. A skipped device check, missing human review or unmet corpus target remains outstanding even if every automated test is green; report local automated completion separately from full release readiness.

## 8. Required negative controls (tests of the tests)

Before handoff, demonstrate at least these deliberate faults are caught; do not ship them:

1. Change implication key to an incorrect assignment: Q01/content grading must fail from independent truth-table evidence.
2. Reintroduce No match for a matching Dual Track stimulus or remove trail's required ordering: Q02/Q03 must flag the semantic mismatch or publication gate.
3. Route the final submit directly to summary: S01 and E01 must fail on missing feedback, not only a snapshot change.
4. Remove idempotency guard: T07 must fail on two recorded attempts/aggregate increments.
5. Count 7 seconds of pause as active time: T01/T03 must fail on exact duration, not merely timer text.
6. Fall back to all content on an empty intersection: F01/F03 must fail when an out-of-selection item is delivered.
7. Increment Hard solved on a wrong answer or restore the 15-second floor: A01/A04 must fail on the known numeric totals.
8. Write default storage before hydration or activate a failed migration: M01/M03 must catch preserved-data violation.
9. Mark a staged or quarantined item eligible: Q12/P01 must fail through the actual serving selector/pack loader.

These are targeted mutation checks, not a requirement to adopt a mutation-testing service. Use a temporary isolated worktree if practical, or narrowly scoped reversible patches, recording assertion failures and restoration. Confirm the unmutated suite passes afterward. If a mutation survives, strengthen the relevant test before declaring the requirement verified.
