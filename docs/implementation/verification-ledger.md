# Implementation verification ledger

Evidence date: 2026-09-23. Base revision: 2c9d1ceab841352b47817bd1692d46b26940f31f. Implementation is an uncommitted working-tree change set.

Status values are PASS, FAIL, and NOT RUN. PASS applies only to the stated scope; limitations are not converted into passes. The release is not ready while the corpus, editorial/timing, incomplete UX findings, and native-device gates below remain outstanding.

## Authoritative automatic run

- Command: npm run verify
- Result: PASS after the final code/config/test changes.
- TypeScript: PASS.
- Unit/content: 13 suites, 86 tests PASS.
- Rendered integration: 1 suite, 12 tests PASS.
- Hard-puzzle validator: PASS.
- Negative controls: 9/9 caught; mutant failures are evidence, not shipped changes.
- Production export: PASS.
- Installed-Chrome mobile E2E: 10/10 PASS at 320, 390, and 430 px; no skipped Playwright cases.
- Desktop browser: NOT RUN by explicit user direction.

## Phase gates

| Phase | Automated implementation | Release status | Reason |
|---|---|---|---|
| A | PASS | PASS for released scope | Recorded red regressions repaired; unresolved High/Critical families withheld. |
| B | PASS | PASS for released scope | State, exact timing, restart and migration checks green. |
| C | FAIL | FAIL / outstanding | Simple setup, core flow and mobile browser checks are green; structured multi-part, short exact-text and further task-specific interactions remain incomplete. |
| D | PASS for pipeline/gates | FAIL / outstanding | Corpus is 0/144 independent reasoning, 0/24 slow-hard and 8/24 cognitive configurations; human editorial/timing and external rights review not run. |
| E | PASS | PASS for automated scope | Analytics math, history, review, mistake practice and saved slow challenges have production-connected green tests. |
| F | PASS for local automation | NOT RUN for native/release scope | E08 and external/human checks outstanding; desktop intentionally skipped. |

## Mandatory verification contract

| ID | Production path | Test/oracle | Red evidence | Green evidence / seed | Negative control | Status | Limitation |
|---|---|---|---|---|---|---|---|
| Q01 | puzzleGenerators implication-chain; catalog gate | phase-a-independent: complete truth table and counterexample | Audit/user concern was investigated; original key proved sound | PASS; fixed fixture | NC01 caught wrong key | PASS | No human editorial sign-off |
| Q02 | trailBlaze; ordered session renderer | phase-a-regressions + phase-a-independent + rendered ordered-input regression; 24 permutations | Recorded 7-test Phase A red run: ordering rules absent; ordered-input regression failed before renderer change | PASS; fixed fixture and exact ordered construction | NC02 caught missing ordering rules | PASS | Physical touch-device interaction NOT RUN |
| Q03 | dualTrack | phase-a-regressions independent feature comparison | Recorded red run: 155/1,000 mismatches | PASS; seeds 1..1,000 | Required dual-track mutation represented by NC02 alternative per contract | PASS | Human construct validation not run |
| Q04 | peripheralCatch | phase-a-regressions exact visible target/location | Recorded red run: hidden/coarsened target reachable | PASS; seeds 1..300 | No dedicated mutant; full seeded oracle | PASS | Physical-device visual timing not run |
| Q05 | equationSystem | phase-a-regressions + independent algebra solve | Recorded red run: collision-reduced choice count | PASS; seeds 1..200 | Independent equation oracle participates in full suite | PASS | Human difficulty calibration not run |
| Q06 | bottleneckPlan | phase-a-regressions + independent critical-path arithmetic | Recorded red run: several answers reduced total duration | PASS; fixed fixture | Production-connected wording/key assertion | PASS | None for released fixture |
| Q07 | longCaseDeduction | phase-a-independent exhaustive day/lab permutations | Audit found unstated bijections | PASS; exhaustive finite models | Publication gate rejects missing assumptions | PASS | One case only; corpus target unmet |
| Q08 | ruleCascade | phase-a-independent visible-rule interpreter | Audit found unstated parity output | PASS; seeds 1..500, all branches | Seed oracle | PASS | Human timing provisional |
| Q09 | operationSpan and delayedRecall | phase-a-independent + rendered phase integration | Audit found edge/collision and phase risks | PASS; operation seeds 1..3,000; recall 1..200 | Seed and rendered-phase oracles | PASS | Physical-device interrupted presentation not run |
| Q10 | answers grader; numeric and ordered session schemas | answers + session-machine exact/tolerance/unit/order/draft tests | Ordered production regression captured before repair; numeric contract was preventive | PASS; boundary and wrong-order fixtures | Full grader tests | PASS | Structured multi-part and short exact-text formats remain incomplete; no free-form LLM grading |
| Q11 | stableChoiceId; immutable attempt snapshots | phase-a-independent + app-store reload/retry | Preventive contract | PASS; reorder/equivalence fixtures | Publication equivalence rejection | PASS | None |
| Q12 | catalog and pack publication selectors | catalog + pipeline fail-closed variants | Audit showed unsafe families previously served | PASS; every gate variant | NC09 caught staged serving | PASS | External rights review still NOT RUN |
| Q13 | family metadata and coverage report | catalog metadata + pipeline 48-cell honesty | Audit found difficulty labels unsupported | Metadata PASS; corpus gate FAIL | Coverage cannot be relabelled by tests | FAIL | 0/144 independent reasoning items; 0/24 slow-hard cases; 8/24 cognitive configurations; human timing/editorial NOT RUN |
| S01 | session commit and SessionView | session-machine + integration + Chrome E01 | UX-01 screenshot/probe: final feedback bypassed | PASS; final correct and wrong | NC03 caught direct-to-summary | PASS | None |
| S02 | threeMisses state guard | session-machine + Chrome E01 three misses | UX-02 probe | PASS | S01 state mutation plus exact counts | PASS | None |
| S03 | attempt snapshots, review, retry | session-machine, app-store, integration | UX-05 probe | PASS; reload and retry identity | NC04 guards global duplicates | PASS | None |
| S04 | Header close; BackHandler; pause modal | integration exits/back/feedback resume | UX-01/03 audit evidence | PASS | Terminal-exit invariants | PASS | Native Android Back device check NOT RUN |
| S05 | END_SESSION abandoned model | session-machine + integration | Audit found unanswered feed items ambiguous | PASS | Exact submitted/abandoned assertions | PASS | None |
| S06 | session reducer event guards | illegal/stale events + bounded independent traces | Preventive contract | PASS | NC03/NC04 | PASS | Bounded traces are not exhaustive formal proof |
| T01 | session timing accrue | exact 24-second fake trace + monotonic clock | UX-09/10 audit | PASS; exact milliseconds | NC05 caught pause inflation | PASS | None |
| T02 | deadlineReached/commit | 999/1000/1001ms final and delayed nonfinal expiry | Preventive race contract | PASS | Exact boundary assertions | PASS | None |
| T03 | feedback/pause timing | session-machine exact budget test | UX-09 audit | PASS | NC05 | PASS | None |
| T04 | clock and restoredSession | clock + practice/check restart tests | UX-06/09 audit | PASS | Restart fixtures with changed monotonic origin | PASS | Physical sleep/background device test NOT RUN |
| T05 | slow soft target | session-machine slow/untimed fixtures | Plan requirement | PASS | Exact target fixture | PASS | Human duration calibration provisional |
| T06 | no-go protocol | session-machine go/no-go fixtures | Plan requirement | PASS | 1,000ms no-go and 500ms response | PASS | Released attention no-go families remain quarantined |
| T07 | commit/store idempotency | session-machine + app-store duplicate callbacks | Preventive race contract | PASS | NC04 caught aggregate duplication | PASS | None |
| F01 | eligibleFamilies/buildSessionItems | catalog all 48 cells + integration empty pool | Recorded Phase A fallback red | PASS; exact axis metadata | NC06 caught fallback | PASS | Many cells honestly empty |
| F02 | Setup and Home | integration simple setup + Chrome modes | UX-16 audit | PASS | Visible controls | PASS | None |
| F03 | normalization and explicit allowlist | phase-a-regressions + catalog | Recorded Phase A 67-to-68 red | PASS | NC06 covers broadening | PASS | None |
| F04 | Custom draft/apply/cancel | integration custom and empty-pool paths | UX-16/18 audit | PASS | Draft state assertions | PASS | Incompatible filters remain narrow/empty; they are never silently broadened |
| M01 | createAppStore hydration gate | app-store delayed read | UX-20 audit | PASS | NC08 caught pre-hydration update | PASS | Browser delay is covered at store boundary |
| M02 | migratePersistedState | migration legacy facts/uncertainty | UX-10/14 audit | PASS | Synthetic legacy fixture | PASS | No personal profile used |
| M03 | two-phase migration/recovery | migration corruption + staged crash resume | UX-20 audit | PASS | NC08 related preservation control | PASS | None |
| M04 | serialized writes + page-hide flush | reverse delay and synchronous latest-state tests | UX-20 audit | PASS | NC04 aggregate guard | PASS | None |
| M05 | bounded migration retention | 301 attempts/51 checks fixture | UX-11 audit | PASS | Known totals retained | PASS | New v2 history is currently not compacted |
| M06 | confirmed app-only reset | failed reset + sentinel key tests | UX-19 audit | PASS | Isolated storage only | PASS | No export feature |
| A01 | analyticsSummary | known nine-outcome fixture | UX-10/13 audit | PASS; accuracy 4/6 | NC07 caught wrong Hard count | PASS | None |
| A02 | comparable latency groups | analytics sample gates and group isolation | UX-13 audit | PASS; 10/20 gates | Numeric fixture | PASS | Human performance norms not claimed |
| A03 | analytics empty/all-wrong handling | analytics undefined and zero fixtures | UX-13 audit | PASS | Exact numeric assertions | PASS | None |
| A04 | session/day measured time | analytics exact 1-second fixture | UX-10 audit | PASS | NC05 plus exact sums | PASS | Legacy time remains labelled estimate |
| A05 | localDayKey/practiceStreak | New York midnight and DST fixtures | UX-12 audit | PASS | Specified UTC instants | PASS | Device timezone switching not run |
| A06 | assessmentResultsForSession/check forms | assessment, check-form, integration tests | UX-14/15 audit | PASS | Compatible and interrupted fixtures | PASS | No psychometric validation claimed |
| P01 | packPublicationProblems/loadApprovedPack | pipeline missing-gate variants | Rights audit requirement | PASS | NC09 caught staged serving | PASS | No external pack imported |
| P02 | ingestPack identity/checksum | pipeline repeat/version fixtures | Plan requirement | PASS | Stable version fixtures | PASS | No external pack imported |
| P03 | contentCoverageReport | pipeline and catalog 48-cell tests | Plan requirement | PASS for honesty; target FAIL | Machine counts cannot convert missing targets | PASS | Corpus target remains a separate release blocker |
| E01 | built app session UI/store | Chrome final wrong/correct/three misses | UX-01/02 screenshots | PASS; installed Chrome mobile-390 | NC03 mirrors browser failure | PASS | No desktop run by user direction |
| E02 | built app long case/store | Chrome notes, answer draft, scroll, reload/resume | UX-06/07 audit | PASS; mobile-390 | Store restart fixtures | PASS | Only released fixture interaction covered |
| E03 | built app Setup/store | Chrome all six combinations and reload | UX-16/17/18 audit | PASS; mobile-390 | NC06 | PASS | Custom details also covered in rendered integration |
| E04 | browser storage boundary | Chrome corrupt and blocked writes; store delay/retry tests | UX-20 audit | PASS | NC08 | PASS | Browser quota variants beyond injected failure not run |
| E05 | service worker/update boundary | Chrome offline answer/reload; unit waiting-worker activation | UX-30 audit | PASS for current local pack | Session snapshot/version tests | PASS | Interrupted external pack download NOT RUN because no external pack exists |
| E06 | service-worker cache namespace | Chrome actual unregister/reinstall, sentinel cache, missing asset | UX-30 audit | PASS | Actual browser cache assertions | PASS | Production CDN not tested |
| E07 | responsive/semantic UI | Chrome 320/390/430 screenshots and bounds | UX-21/23 audit | PASS for mobile web scope | Visible text/non-color feedback assertions | PASS | Desktop/tablet skipped by user; manual full Tab order and 200% text NOT RUN |
| E08 | native lifecycle/accessibility | No physical-device run | Required device gate | No green evidence | N/A | NOT RUN | Android/iOS, TalkBack/VoiceOver, landscape and 200% device text outstanding |

## Required negative controls

Detailed assertion tails are in negative-controls.json; summary is in negative-controls.md.

| ID | Fault | Result |
|---|---|---|
| NC01 | Q01 incorrect implication key | PASS (mutant rejected) |
| NC02 | Q02 missing Trail ordering rule | PASS (mutant rejected) |
| NC03 | S01 final submit bypasses feedback | PASS (mutant rejected) |
| NC04 | T07 global attempt idempotency guard removed | PASS (mutant rejected) |
| NC05 | T01/T03 paused time counted as active | PASS (mutant rejected) |
| NC06 | F01/F03 empty selection falls back to all content | PASS (mutant rejected) |
| NC07 | A01 wrong Hard answers counted as solved | PASS (mutant rejected) |
| NC08 | M01 default write allowed before hydration | PASS (mutant rejected) |
| NC09 | Q12/P01 staged content served as approved | PASS (mutant rejected) |

## App-flow audit finding dispositions

| Audit ID | Status | Disposition | Evidence |
|---|---|---|---|
| UX-01 | PASS | Final feedback -> explicit View results; summary has Done/Review. | S01/E01 |
| UX-02 | PASS | Third miss keeps feedback and exact totals. | S02/E01 |
| UX-03 | PASS | Persistent labelled close and terminal exits. | S04/E07 |
| UX-04 | PASS | Finite active-time sessions, explicit skips, Slow soft target. | T03/T05/S06 |
| UX-05 | PASS | Immutable session-owned review; retry identity. | S03 |
| UX-06 | PASS | Versioned session/drafts persist and resume. | T04/E02 |
| UX-07 | PASS | Ordinary ScrollView; browser scroll leaves item unchanged. | E02 |
| UX-08 | PASS | Prompt/rules, selected answer and explanation remain together. | S01/E07 |
| UX-09 | PASS | Explicit active/study/interference/response/feedback timing. | T01-T06 |
| UX-10 | PASS | Correct-only solved counts and exact time. | A01/A04 |
| UX-11 | PASS | Known migrated totals and disclosed legacy gaps. | M05 |
| UX-12 | PASS | Local-day/DST convention and derived streak. | A05 |
| UX-13 | PASS | Fitness removed; correct-only comparable latency. | A01-A03 |
| UX-14 | PASS | Compatible per-domain baseline and partial coverage. | A06 |
| UX-15 | PASS | Untrained/independent claims removed; versioned check forms. | A06 |
| UX-16 | PASS | Simple pace/tier/categories plus Custom; developer copy removed. | F02/F04 |
| UX-17 | PASS | Explicit exclusions persist; All remains distinct. | F03 |
| UX-18 | PASS | Empty intersections fail closed. | F01/F03 |
| UX-19 | PASS | Explicit confirmation and disclosed app-owned reset scope. | M06 |
| UX-20 | PASS | Hydration gate, serialized writes and visible errors. | M01-M04/E04 |
| UX-21 | NOT RUN | Semantic roles/labels and mobile keyboard entry pass; VoiceOver/TalkBack and live-focus review not run. | E07/E08 |
| UX-22 | PASS | Single feedback block and restrained hierarchy visually inspected at three mobile widths. | E07 screenshots |
| UX-23 | NOT RUN | 320/390/430 pass; landscape and 200% physical-device text remain unrun. | E07/E08 |
| UX-24 | FAIL | Numeric, MCQ, visual, staged-memory and production ordered-path rendering exist; structured multi-part, short exact-text and further task-specific interactions remain incomplete. | Q02/Q09/Q10 |
| UX-25 | FAIL | Review, mistake practice, saved slow challenges and persisted version-specific report/exclusion are implemented; misconception-specific review remains incomplete. | S03/Progress/UX-25/Phase E regressions |
| UX-26 | FAIL | Delivered pace/tier is stored, but within-tier calibration/adaptation and human difficulty evidence are incomplete. | Q13/F01 |
| UX-27 | PASS | Check is opt-in with First/Progress-compatible baseline language. | A06/F02 |
| UX-28 | PASS | One main Start/Resume action and three current metrics. | Home integration |
| UX-29 | PASS | Navigation owns close/back; reload and terminal routes tested. | S04/E01/E02 |
| UX-30 | PASS | Namespaced cache deletion, navigation-only fallback and safe activation. | E05/E06 |

## Family disposition ledger

All 68 original registry families remain in the denominator. The richer rationale, source, rights declaration, pace/tier and timing fields are in content-disposition.md and coverage-report.json.

| Requirement | Domain | Disposition | Gate/evidence | Status | Limitation |
|---|---|---|---|---|---|
| FAMILY-speed-match | processingSpeed | redesign | catalog exclusion gate | PASS | Withheld from practice/check/retry. Not published until its Medium structural/content concerns are repaired and independently checked. |
| FAMILY-peripheral-catch | processingSpeed | repair | catalog publication gate + audit evidence | PASS | Released v2; human timing provisional. Exact visible location and mutually exclusive responses repaired and seed-tested. |
| FAMILY-pattern-flash | processingSpeed | redesign | catalog exclusion gate | PASS | Withheld from practice/check/retry. Not published until its Medium structural/content concerns are repaired and independently checked. |
| FAMILY-color-rush | processingSpeed | retain | catalog publication gate + audit evidence | PASS | Released v2; human timing provisional. Audit found the key sound; tier is provisional pending human calibration. |
| FAMILY-symbol-scan | processingSpeed | retain | catalog publication gate + audit evidence | PASS | Released v2; human timing provisional. Audit found the key sound; tier is provisional pending human calibration. |
| FAMILY-sequence-recall | workingMemory | redesign | catalog exclusion gate | PASS | Withheld from practice/check/retry. Not published until its Medium structural/content concerns are repaired and independently checked. |
| FAMILY-number-chain | workingMemory | redesign | catalog exclusion gate | PASS | Withheld from practice/check/retry. Not published until its Medium structural/content concerns are repaired and independently checked. |
| FAMILY-dual-track | workingMemory | repair | catalog publication gate + audit evidence | PASS | Released v2; human timing provisional. All position/color match combinations are now represented and seed-tested. |
| FAMILY-memory-grid | workingMemory | redesign | catalog exclusion gate | PASS | Withheld from practice/check/retry. Not published until its Medium structural/content concerns are repaired and independently checked. |
| FAMILY-operation-span | workingMemory | repair | catalog publication gate + audit evidence | PASS | Released v2; human timing provisional. Displayed equations, ordered recall, repeated symbols, and distinct responses are independently recomputed across fixed seeds. |
| FAMILY-delayed-recall | workingMemory | repair | catalog publication gate + audit evidence | PASS | Released v2; human timing provisional. Study, interference, exact ordered recall, and distinct responses are verified together. |
| FAMILY-color-word | attention | redesign | catalog exclusion gate | PASS | Withheld from practice/check/retry. Not published until its Medium structural/content concerns are repaired and independently checked. |
| FAMILY-focus-fire | attention | redesign | catalog exclusion gate | PASS | Withheld from practice/check/retry. Not published until its Medium structural/content concerns are repaired and independently checked. |
| FAMILY-stop-signal | attention | quarantine | catalog exclusion gate | PASS | Withheld from practice/check/retry. Audit identified a Critical/High unresolved validity or construct defect. |
| FAMILY-odd-pulse | attention | quarantine | catalog exclusion gate | PASS | Withheld from practice/check/retry. Audit identified a Critical/High unresolved validity or construct defect. |
| FAMILY-conflict-grid | attention | redesign | catalog exclusion gate | PASS | Withheld from practice/check/retry. Not published until its Medium structural/content concerns are repaired and independently checked. |
| FAMILY-noise-filter | attention | quarantine | catalog exclusion gate | PASS | Withheld from practice/check/retry. Audit identified a Critical/High unresolved validity or construct defect. |
| FAMILY-rule-flip | flexibility | quarantine | catalog exclusion gate | PASS | Withheld from practice/check/retry. Audit identified a Critical/High unresolved validity or construct defect. |
| FAMILY-trail-blaze | flexibility | repair | catalog publication gate + audit evidence | PASS | Released v2; human timing provisional. Every ordering constraint is now stated and regression-tested. |
| FAMILY-switch-math | flexibility | redesign | catalog exclusion gate | PASS | Withheld from practice/check/retry. Not published until its Medium structural/content concerns are repaired and independently checked. |
| FAMILY-category-swap | flexibility | redesign | catalog exclusion gate | PASS | Withheld from practice/check/retry. Not published until its Medium structural/content concerns are repaired and independently checked. |
| FAMILY-rule-cascade | flexibility | repair | catalog publication gate + audit evidence | PASS | Released v2; human timing provisional. Parity output rule is now explicit. |
| FAMILY-next-in-line | reasoning | retain | catalog publication gate + audit evidence | PASS | Released v2; human timing provisional. Audit found the key sound; tier is provisional pending human calibration. |
| FAMILY-interleaved-sequence | reasoning | quarantine | catalog exclusion gate | PASS | Withheld from practice/check/retry. Audit identified a Critical/High unresolved validity or construct defect. |
| FAMILY-matrix-pick | reasoning | retain | catalog publication gate + audit evidence | PASS | Released v2; human timing provisional. Audit found the key sound; tier is provisional pending human calibration. |
| FAMILY-odd-one-out | reasoning | retain | catalog publication gate + audit evidence | PASS | Released v2; human timing provisional. Audit found the key sound; tier is provisional pending human calibration. |
| FAMILY-logic-lock | reasoning | retain | catalog publication gate + audit evidence | PASS | Released v2; human timing provisional. Audit found the key sound; tier is provisional pending human calibration. |
| FAMILY-balance-code | reasoning | retain | catalog publication gate + audit evidence | PASS | Released v2; human timing provisional. Audit found the key sound; tier is provisional pending human calibration. |
| FAMILY-logic-grid | reasoning | quarantine | catalog exclusion gate | PASS | Withheld from practice/check/retry. Audit identified a Critical/High unresolved validity or construct defect. |
| FAMILY-conditional-syllogism | reasoning | redesign | catalog exclusion gate | PASS | Withheld from practice/check/retry. Not published until its Medium structural/content concerns are repaired and independently checked. |
| FAMILY-spatial-transform | reasoning | retain | catalog publication gate + audit evidence | PASS | Released v2; human timing provisional. Audit found the key sound; tier is provisional pending human calibration. |
| FAMILY-suspect-deduction | reasoning | retain | catalog publication gate + audit evidence | PASS | Released v2; human timing provisional. Audit found the key sound; tier is provisional pending human calibration. |
| FAMILY-truth-count-deduction | reasoning | retain | catalog publication gate + audit evidence | PASS | Released v2; human timing provisional. Audit found the key sound; tier is provisional pending human calibration. |
| FAMILY-rank-deduction | reasoning | retain | catalog publication gate + audit evidence | PASS | Released v2; human timing provisional. Audit found the key sound; tier is provisional pending human calibration. |
| FAMILY-implication-chain | reasoning | retain | catalog publication gate + audit evidence | PASS | Released v2; human timing provisional. Audit found the key sound; tier is provisional pending human calibration. |
| FAMILY-set-logic | reasoning | retain | catalog publication gate + audit evidence | PASS | Released v2; human timing provisional. Audit found the key sound; tier is provisional pending human calibration. |
| FAMILY-word-scramble | language | redesign | catalog exclusion gate | PASS | Withheld from practice/check/retry. Not published until its Medium structural/content concerns are repaired and independently checked. |
| FAMILY-quick-clue | language | redesign | catalog exclusion gate | PASS | Withheld from practice/check/retry. Not published until its Medium structural/content concerns are repaired and independently checked. |
| FAMILY-letter-flow | language | retain | catalog publication gate + audit evidence | PASS | Released v2; human timing provisional. Audit found the key sound; tier is provisional pending human calibration. |
| FAMILY-word-chain | language | retain | catalog publication gate + audit evidence | PASS | Released v2; human timing provisional. Audit found the key sound; tier is provisional pending human calibration. |
| FAMILY-verbal-analogy | language | redesign | catalog exclusion gate | PASS | Withheld from practice/check/retry. Not published until its Medium structural/content concerns are repaired and independently checked. |
| FAMILY-constraint-clue | language | quarantine | catalog exclusion gate | PASS | Withheld from practice/check/retry. Audit identified a Critical/High unresolved validity or construct defect. |
| FAMILY-critical-assumption | language | quarantine | catalog exclusion gate | PASS | Withheld from practice/check/retry. Audit identified a Critical/High unresolved validity or construct defect. |
| FAMILY-cryptic-clue | language | retain | catalog publication gate + audit evidence | PASS | Released v2; human timing provisional. Audit found the key sound; tier is provisional pending human calibration. |
| FAMILY-route-planner | planning | retain | catalog publication gate + audit evidence | PASS | Released v2; human timing provisional. Audit found the key sound; tier is provisional pending human calibration. |
| FAMILY-resource-schedule | planning | retain | catalog publication gate + audit evidence | PASS | Released v2; human timing provisional. Audit found the key sound; tier is provisional pending human calibration. |
| FAMILY-tower-moves | planning | quarantine | catalog exclusion gate | PASS | Withheld from practice/check/retry. Audit identified a Critical/High unresolved validity or construct defect. |
| FAMILY-planning-grid | planning | quarantine | catalog exclusion gate | PASS | Withheld from practice/check/retry. Audit identified a Critical/High unresolved validity or construct defect. |
| FAMILY-seating-deduction | planning | retain | catalog publication gate + audit evidence | PASS | Released v2; human timing provisional. Audit found the key sound; tier is provisional pending human calibration. |
| FAMILY-weighing-puzzle | planning | retain | catalog publication gate + audit evidence | PASS | Released v2; human timing provisional. Audit found the key sound; tier is provisional pending human calibration. |
| FAMILY-river-crossing-plan | planning | redesign | catalog exclusion gate | PASS | Withheld from practice/check/retry. Not published until its Medium structural/content concerns are repaired and independently checked. |
| FAMILY-dependency-plan | planning | retain | catalog publication gate + audit evidence | PASS | Released v2; human timing provisional. Audit found the key sound; tier is provisional pending human calibration. |
| FAMILY-value-packing | planning | retain | catalog publication gate + audit evidence | PASS | Released v2; human timing provisional. Audit found the key sound; tier is provisional pending human calibration. |
| FAMILY-valid-schedule | planning | retain | catalog publication gate + audit evidence | PASS | Released v2; human timing provisional. Audit found the key sound; tier is provisional pending human calibration. |
| FAMILY-bottleneck-plan | planning | repair | catalog publication gate + audit evidence | PASS | Released v2; human timing provisional. Question now uniquely asks for the controlling parallel branch. |
| FAMILY-long-case-deduction | planning | repair | catalog publication gate + audit evidence | PASS | Released v2; human timing provisional. One-to-one day/lab rules are explicit and the forced assignment is independently enumerated. |
| FAMILY-equation-system | quantitative | repair | catalog publication gate + audit evidence | PASS | Released v2; human timing provisional. Equivalent distractor removed; four distinct choices seed-tested. |
| FAMILY-ratio-puzzle | quantitative | retain | catalog publication gate + audit evidence | PASS | Released v2; human timing provisional. Audit found the key sound; tier is provisional pending human calibration. |
| FAMILY-symbolic-pattern | quantitative | redesign | catalog exclusion gate | PASS | Withheld from practice/check/retry. Not published until its Medium structural/content concerns are repaired and independently checked. |
| FAMILY-quant-balance | quantitative | retain | catalog publication gate + audit evidence | PASS | Released v2; human timing provisional. Audit found the key sound; tier is provisional pending human calibration. |
| FAMILY-data-sufficiency | quantitative | retain | catalog publication gate + audit evidence | PASS | Released v2; human timing provisional. Audit found the key sound; tier is provisional pending human calibration. |
| FAMILY-work-rate | quantitative | redesign | catalog exclusion gate | PASS | Withheld from practice/check/retry. Not published until its Medium structural/content concerns are repaired and independently checked. |
| FAMILY-mixture-puzzle | quantitative | retain | catalog publication gate + audit evidence | PASS | Released v2; human timing provisional. Audit found the key sound; tier is provisional pending human calibration. |
| FAMILY-speed-distance | quantitative | redesign | catalog exclusion gate | PASS | Withheld from practice/check/retry. Not published until its Medium structural/content concerns are repaired and independently checked. |
| FAMILY-probability-draw | quantitative | redesign | catalog exclusion gate | PASS | Withheld from practice/check/retry. Not published until its Medium structural/content concerns are repaired and independently checked. |
| FAMILY-remainder-system | quantitative | retain | catalog publication gate + audit evidence | PASS | Released v2; human timing provisional. Audit found the key sound; tier is provisional pending human calibration. |
| FAMILY-profit-discount | quantitative | redesign | catalog exclusion gate | PASS | Withheld from practice/check/retry. Not published until its Medium structural/content concerns are repaired and independently checked. |
| FAMILY-overlapping-sets | quantitative | redesign | catalog exclusion gate | PASS | Withheld from practice/check/retry. Not published until its Medium structural/content concerns are repaired and independently checked. |

## Unresolved release limitations

- FAIL: pilot corpus target is unmet; missing cases are not padded with seeds, permutations or linked subparts.
- FAIL: UX-24, UX-25 and UX-26 remain incomplete as described above.
- NOT RUN: independent human editorial review and target-audience timing calibration.
- NOT RUN: legal/rights review for external datasets; none were imported.
- NOT RUN: Android/iOS physical lifecycle, TalkBack/VoiceOver, landscape and 200% device text.
- NOT RUN: production hosting/CDN/update rollout.
- NOT RUN by user direction: desktop and tablet browser coverage.
- NOT RUN: dependency advisory remediation; install reported 25 advisories and no automatic breaking fix was authorized.
