# Puzzle question and answer quality audit

Date: 2026-09-22  
Scope: all 68 registered training puzzle generators and all 8 assessment mappings in `src/logic/puzzleGenerators.ts`  
Method: static code review plus deterministic execution of the actual exported registries at every level 1–20, using 200 seeded runs per level. The audit covers generated prompts, visible context, choices, keyed answers, explanations, renderer behavior, random branches, difficulty behavior, and the existing validation script. No production code was changed.

## Executive finding

The bank is not ready to be treated as a reliable assessment or a high-quality adaptive question set. The arithmetic and classic fixed logic items are usually keyed correctly, but the generator framework does not guarantee that a generated item has four meaningful choices, one semantically correct answer, enough stated rules, or difficulty appropriate to its label. Several generators can create objectively ambiguous or incorrectly keyed rounds.

The most urgent defects are:

1. `dual-track` can deliberately key “Position match,” “Color match,” or “No match” while the generated last tile also matches an unguarded feature. There is no “both” option. The probe found 620 key/observed-feature mismatches in 4,000 rounds, including 340 both-feature matches (`puzzleGenerators.ts:285`).
2. `peripheral-catch` hides the target whenever it lands in the center cell, and maps five of nine positions to the same “Center” answer (`puzzleGenerators.ts:120`).
3. `trail-blaze` states only “start at A” and “alternate letters and numbers,” but its key additionally assumes ascending order inside both sets. The shuffled tile field supplies no path edges and is unnecessary for choosing among textual sequences (`puzzleGenerators.ts:587`).
4. `rule-cascade` says to “switch to number” but keys `even` or `odd`, a rule that is never stated (`puzzleGenerators.ts:656`).
5. `bottleneck-plan` has multiple correct choices: shortening Design, Test, or Deploy reduces total project time. The key `Test` is only unique if the question is narrowed to the parallel branch controlling the start of Deploy (`puzzleGenerators.ts:1722`).
6. `long-case-deduction` relies on unstated one-to-one assignment rules for people, days, and labs. Its explanation also derives “Omar is Monday” from assumptions absent from the item (`puzzleGenerators.ts:1750`).
7. `equation-system` always supplies `diff + y`, which algebraically equals `x`, as a distractor. Deduplication therefore reduces every sampled answer set to two or three choices; the independent algebra oracle found no error in the computed key (`puzzleGenerators.ts:1240`).
8. `critical-assumption` keys a stronger claim than the argument needs. Review time need not be the “main bottleneck”; reducing review must merely reduce net release time without an offsetting constraint (`puzzleGenerators.ts:1419`).

The requested screenshot rulings are precise:

- In the trail screenshot, the selected `2-B-1-A` is invalid under the full prompt because the prompt says to start at `A`. The app was right to reject that selection. The item is still defective because the keyed `A-1-B-2` depends on an unstated ascending-order rule; a different option could start at A, alternate types, and remain valid under the written instruction. The displayed shuffled tokens also do not define a route or add information.
- In the implication screenshot, the app's key is correct. From `A -> B`, `B -> C`, and `C is false`, contraposition gives `not B`, then `not A`. This does not assume that any false C normally makes A and B false; it follows because both implications are explicit premises. The explanation should name contraposition and could show the two steps more clearly (`puzzleGenerators.ts:1582`).

## Severity scale

- **Critical**: a generated item can have a wrong key, multiple valid answers, missing stimulus, or missing rules required to derive the key.
- **High**: the item is materially under-specified, measures a different construct than claimed, or has structurally poor choices that damage validity.
- **Medium**: the key is generally correct, but framing, distractors, explanations, or difficulty behavior are weak.
- **Low / sound**: no correctness defect found; improvements concern variety, polish, or difficulty.

## System-wide defects

### Choice construction does not enforce item validity

`withAnswer` deduplicates strings, randomly shuffles them, takes at most four, and reinserts the answer if it was truncated (`puzzleGenerators.ts:61`). It does not require four choices, ensure distractors are distinct from the computed answer, or test whether another choice also satisfies the prompt. As a result:

- Palindromes, repeated digits, unchanged shuffles, and algebraically equivalent distractors shrink some rounds to two or three choices.
- Carefully written distractors may disappear randomly because more than four strings are supplied.
- `correctIndex` proves only which string the generator intended, not that the prompt logically has one answer.

Every generator should return an item specification that is validated before display: exactly the intended number of distinct choices, exactly one choice accepted by a puzzle-specific solver, no answer-equivalent distractor, and an explanation derived from the same solution object.

### Difficulty is mostly cosmetic

47 of the 68 training generators do not vary prompt, stimulus, choices, answer, or explanation with `difficulty`. `peripheral-catch` varies only exposure duration and is therefore among those 47 content-static types. Many of the remaining 21 change only list length, one numeric step, congruency, or a short note. Fixed “Hard” items therefore repeat unchanged at every level, while some Core memory/search items simply become faster or longer. This is not a calibrated easy/medium/hard system.

The content-static group includes `peripheral-catch`, `rule-flip`, `category-swap`, `rule-cascade`, `matrix-pick`, `odd-one-out`, `logic-lock`, `balance-code`, `logic-grid`, `conditional-syllogism`, `spatial-transform`, every language generator, 11 of 12 planning generators, and all 12 quantitative generators. The full list is emitted by the probe. Each type needs authored or generated tiers with measured changes in inference depth, branching, required operations, and plausible distractor models.

### Product taxonomy is a required matrix, not a source menu

Content remediation must be planned and reported in the mandatory **Fast / Slow × Easy / Medium / Hard** matrix for each of the eight cognitive categories. **Custom** remains an additional user-controlled configuration, not a seventh speed/difficulty cell. Source collections are provenance and acquisition inputs only; they must never replace the user-facing speed, difficulty, or category axes.

### Explanations are often answer declarations

Many explanations restate the key (“the sequence was…,” “the clue points to…,” “the correct option preserves…”), without showing why distractors fail. For reasoning tasks, explanations should show the minimum proof: relevant premises, each inference, the unique conclusion, and one sentence about why the nearest distractor fails.

### “Hard” often means a label, not reasoning depth

Examples include fixed symbol substitution (`symbolic-pattern`), a two-equation system (`equation-system`), direct table maximization (`route-planner`), and clues that reveal the exact triple (`logic-grid`). Conversely, `operation-span` may be cognitively demanding because of timed memory, but its choices can collapse. Difficulty labels need empirical or at least rule-based specifications rather than registry metadata alone.

### The visual can reveal the method or add no information

Several quantitative visuals contain the solution method before the user answers: `speed-distance` gives the closing-speed equation, `probability-draw` gives favorable and total counts, `work-rate` gives both rates and the reciprocal formula, `profit-discount` computes the selling price, and `overlapping-sets` gives the inclusion-exclusion equation. These are hints suitable for post-answer explanation, not question context at higher difficulty.

Other visuals are redundant: the trail grid has no connected route, category choices are repeated both as tiles and buttons, and the delayed-recall interference screen displays a solved sum rather than requiring interference processing.

## Full training-generator inventory

### Processing Speed (5)

| Generator | Verdict | Finding and proposed remedy |
|---|---|---|
| `speed-match` (`:95`) | Medium | The true/false judgment is valid, but “Same with color change” and “Same with order change” are both forms of “Different” and do not answer the yes/no prompt. Use either `Same`/`Different`, or ask for the change type and key among mutually exclusive categories. Ensure a nonmatch changes exactly one controlled feature. |
| `peripheral-catch` (`:120`) | **Critical** | If `targetIndex === 4`, the renderer replacement places the center shape over the target, so no target is shown. Indices 1, 3, 4, 5, and 7 all map to “Center,” destroying localization precision. Keep the target out of the center, define all nine locations (or four quadrants), and generate distractors from distinct valid shape/location pairs. |
| `pattern-flash` (`:151`) | Medium | One distractor contains shapes without colors while the answer uses `shape-color`, so it is visibly malformed. Shuffle/reverse can duplicate the answer. Generate all choices in the same representation and mutate exactly one controlled property per distractor. |
| `symbol-scan` (`:176`) | Low / sound | The count is computed from the displayed shuffled tokens and is correct. Random generation can add more targets than the guaranteed minimum, which is acceptable because the final count is recomputed. Add accessibility cues beyond color and validate four distinct numeric choices. |
| `color-rush` (`:208`) | Low / sound | The computed count is correct. Blank colored dots rely entirely on color perception, and difficulty is mainly list length/exposure. Add a color-accessible mode and define speed tiers. |

### Working Memory (6)

| Generator | Verdict | Finding and proposed remedy |
|---|---|---|
| `sequence-recall` (`:234`) | Medium | Repeated digits make shuffle and reversal distractors equal to the answer; palindromes worsen the collapse. The numeric transform described in code behaves like a two-step wrap, not an intuitive one-step error. Generate distractors by guaranteed position swaps/substitutions and reject duplicates. |
| `number-chain` (`:259`) | Medium | Forward mode supplies `chain.join('')`, the answer itself, as a distractor, so deduplication guarantees fewer than four choices. Reverse mode can also collide for palindromes/repeated digits. The probe found five one-choice training rounds; its independent recall oracle found the key itself correct. Build errors relative to the required direction and enforce Hamming/edit distance from the answer. |
| `dual-track` (`:285`) | **Critical** | The generator forces only the chosen match dimension. A position trial has a 1/6 chance of also matching color; a color trial has a 1/9 chance of also matching position; a “none” trial still has a 1/6 chance of matching color. The choices omit “both.” Explicitly force the non-target dimension to differ and add/handle a controlled both-match condition. |
| `memory-grid` (`:316`) | Medium | The target positions are correct, but a random distractor can duplicate them and the other cells are numbered, which reduces location memory to remembering printed indices. Reject duplicate pairs; decide whether the construct is spatial location or number-pair recall and render accordingly. |
| `operation-span` (`:343`) | High | The actual distractors are `shuffle(allLetters)`, `reverse(allLetters)`, and `none`. If every equation is true, the shuffled all-letters choice can duplicate the answer; if none are true, `none` duplicates it; the shuffle can also preserve the original order. The probe found fewer than four choices in 846/4,000 rounds, while independently re-evaluating every equation found zero keyed-answer errors. Generate a controlled number of true rows and create distractors from specific verification or order errors. |
| `delayed-recall` (`:377`) | Medium | The “interference” shows a fully solved arithmetic statement and requires no response, so it is mostly a timed blank rather than a competing task. Require a quick judgment or calculation, and keep its result separate from code recall scoring. |

### Attention (6)

| Generator | Verdict | Finding and proposed remedy |
|---|---|---|
| `color-word` (`:407`) | Medium | The word is rendered twice (as the note and colored token). At low difficulty word and ink may match, removing Stroop conflict. Render it once; deliberately balance congruent/incongruent trials by tier. |
| `noise-filter` (`:428`) | High | The note says distractors share either color or shape, but tokens are fully random: some share neither, some are accidental full targets. The recomputed count remains correct, but the stated stimulus design is false. Construct exact counts of color-only, shape-only, neither, and both items. |
| `focus-fire` (`:460`) | Medium | At harder levels the center arrow is also the only green arrow, so color identifies the answer and defeats flanker inhibition. Give all arrows the same appearance; manipulate congruency and spacing independently. |
| `stop-signal` (`:483`) | High | This is retrospective circle counting, not a stop-signal or go/no-go task. `sample` cannot return more than the six source entries, so difficulty plateaus when the requested length exceeds six. Rename/reframe as visual counting or implement timed go/no-go interactions and commission errors. |
| `odd-pulse` (`:507`) | High | The prompt says “Tap” but the user never taps beats; they choose a count after a deterministic every-fourth REST display. It does not measure rhythm inhibition. Implement sequential timed responses, or rename it to a brief count task and vary the rest pattern. |
| `conflict-grid` (`:531`) | Medium | The keyed count is recomputed correctly, but random extras make target prevalence uncontrolled and the explanation omits the actual counted items. Construct the matrix by condition and report the exact count plus matching rule. |

### Flexibility (5)

| Generator | Verdict | Finding and proposed remedy |
|---|---|---|
| `rule-flip` (`:565`) | High | There is no previous rule and only one item. Naming its color or shape is not rule switching. Present a sequence of trials with explicit switch/repeat cues and score switch cost separately. |
| `trail-blaze` (`:587`) | **Critical** | The written constraints do not state ascending order; the shuffled visual has no path edges and is irrelevant to textual choices. State “A, 1, B, 2…” or “alternate in ascending order,” then make all distractors obey start/alternation while violating one specific order rule. For a true trail task, require connecting spatial nodes. |
| `switch-math` (`:612`) | Medium | It applies one fixed addition then subtraction and does not require switching based on cues. Use multiple steps with alternating or cue-dependent operations; scale steps and rule switches. |
| `category-swap` (`:634`) | Medium | There is no earlier category rule to switch from; it is a basic classification item. Add a preceding rule/trial and a switch cue, or classify it as language/category knowledge. |
| `rule-cascade` (`:656`) | **Critical** | “Switch to number” is keyed as parity (`even`/`odd`) although no parity rule is stated. State “report whether the number is even or odd,” define what happens when the second condition is false, and solve through an explicit rule interpreter. |

### Reasoning & Logic (14)

| Generator | Verdict | Finding and proposed remedy |
|---|---|---|
| `next-in-line` (`:683`) | Low / sound | The arithmetic progression and key agree. It remains a single-operation pattern; add multi-step, multiplicative, difference, and structural tiers with uniqueness checks. |
| `interleaved-sequence` (`:702`) | High | The odd positions follow a clean addition rule, but the even positions are `b, 2b, 2b + step`, which is not the advertised second consistent hidden rule. Since the question asks for the next odd term, the even sequence is unnecessary/misleading context. Generate two independently coherent sequences and explain both. |
| `matrix-pick` (`:726`) | Low / sound | The cyclic row shift gives the keyed missing shape. Random distractors may deduplicate, and difficulty never changes. Mutate from a controlled symbol set and add multi-feature matrix rules. |
| `odd-one-out` (`:749`) | Low / sound | Exactly one item comes from a different bank. The task is basic semantic classification and difficulty is static. Add relation-based categories and explain the shared property. |
| `logic-lock` (`:770`) | Low / sound | For the three authored answer templates, the constraints force the key. Difficulty and scenario never vary. Generate constraints from a solver and verify uniqueness over all permutations. |
| `balance-code` (`:790`) | Low / sound | The algebra and key agree, though X can be negative and difficulty is unused. Define tiered integer ranges and distractors from sign/operation errors. |
| `logic-grid` (`:824`) | High | The first two clues directly state the exact person-color-rank triple; “Only one option can satisfy all clues” is meta-text. This is copying, not deduction. Generate complete entities/attributes and indirect constraints, then solver-check exactly one option. |
| `conditional-syllogism` (`:865`) | Medium | Modus ponens is valid, but this is one direct inference despite “two-step” labeling, and generic distractors have a different grammatical form. Add real chains, negation traps, and mutually comparable conclusions. |
| `spatial-transform` (`:889`) | Low / sound | Full reversal, blank preservation, key, and explanation agree. It is static and closer to symbol manipulation than mental rotation. Add controlled flips/rotations with nonverbal stimuli. |
| `suspect-deduction` (`:1359`) | Sound | Exhaustive evaluation confirms Nora is the only culprit producing exactly one false statement. Improve the explanation with the truth count for each candidate. |
| `truth-count-deduction` (`:1526`) | Sound | Kai uniquely produces exactly two true statements. Show a compact truth table after answering. |
| `rank-deduction` (`:1554`) | Sound | Exhaustive permutation checking confirms the unique order Luna–Milo–Nia–Oren and Milo second. Add harder generated cases only with solver uniqueness. |
| `implication-chain` (`:1582`) | Sound | The key `A and B are both false` is logically correct by two contraposition steps. Expand the explanation to `not C -> not B -> not A`; do not change the answer. |
| `set-logic` (`:1610`) | Sound | Existential import is explicitly supplied (“at least one red”), so a non-striped card must exist. The key and explanation are correct. |

### Language & Verbal (8)

| Generator | Verdict | Finding and proposed remedy |
|---|---|---|
| `word-scramble` (`:935`) | Medium | Random shuffle can leave the word unchanged. For `focus`, all standard distractors are six letters while the answer is five, making the answer obvious. Require a changed scramble and length-match all options. |
| `quick-clue` (`:955`) | Medium | Keys are reasonable, but distractors are mostly unrelated and difficulty is ignored. Use same-part-of-speech, semantically neighboring, length-matched distractors and tier the vocabulary. |
| `letter-flow` (`:974`) | Low / sound | The filtering leaves one choice satisfying both category and initial. It is a very basic lexical filter; add timed fluency or denser near-neighbor choices for higher tiers. |
| `word-chain` (`:997`) | Low / sound | The four authored chains and next-word initials are valid. The answer is selected as the first matching pool word, so content is repetitive and difficulty static. Expand curated chains and reject alternative valid options. |
| `verbal-analogy` (`:1027`) | Medium | The intended relations are defensible, but distractors are obviously unrelated and the explanation merely asserts “same relationship.” Name the relation and use plausible relation-confusion distractors. |
| `constraint-clue` (`:1052`) | High | Distractors are filtered so they fail length or letter constraints before meaning is considered. The answer is therefore engineered to be obvious, and the “meaning” gloss is sometimes awkward. Include near matches that each fail exactly one constraint and use dictionary-reviewed definitions. |
| `critical-assumption` (`:1419`) | **Critical** | “The delay is mainly caused by review time” is sufficient but not logically necessary for cutting review to speed releases. Rewrite the conclusion/argument or key a true bridge assumption, and use the negation test to validate necessity. |
| `cryptic-clue` (`:1502`) | Low / sound | All choices are anagrams and only `listen` matches the definition, so the key is sound. The clue is over-explicit and static; use standard clue grammar and explain definition, indicator, and fodder. |

### Planning & Strategy (12)

| Generator | Verdict | Finding and proposed remedy |
|---|---|---|
| `route-planner` (`:1085`) | Low / sound | The selected route maximizes reward under the limit. Risk never breaks a tie, so that instruction is unused. Create actual reward ties or remove tie-break text; vary network depth by tier. |
| `resource-schedule` (`:1115`) | Sound | Of the listed combinations, Solve + Review is feasible and has the highest value. State whether only listed combinations are allowed, or enumerate all subsets with a solver. |
| `tower-moves` (`:1163`) | High | The item never states the essential rule that a larger piece cannot be placed on a smaller piece. “Legally” assumes prior Tower of Hanoi knowledge. Add all move rules and use a visual state transition. |
| `planning-grid` (`:853`) | High | This wraps the same direct-answer `logic-grid` item, so it does not test planning or action selection. Replace it with a genuine schedule/assignment state requiring a choice among feasible actions. |
| `seating-deduction` (`:1324`) | Sound | Exhaustive permutation testing confirms one arrangement and Ari in the middle. Its fixed five-person case should become a solver-backed template for varied tiers. |
| `weighing-puzzle` (`:1185`) | Sound | Under “one heavy coin, all others normal,” the two weighings uniquely identify coin 3. The explanation is correct. |
| `river-crossing-plan` (`:1213`) | Medium | The key is feasible, but the puzzle has no conflict constraints and is only repeated shuttling. Wording such as “returns” should explicitly say the guard returns alone. Add meaningful state constraints for harder tiers. |
| `dependency-plan` (`:1638`) | Sound | Parallel B/C after A and D after both gives 7 days. Clarify that B and C may run in parallel; otherwise some users may assume serial work. |
| `value-packing` (`:1666`) | Sound | Exhaustive subset comparison confirms Map + Rope + Lamp is the global optimum at capacity 6. Explain why the closest feasible competitor loses. |
| `valid-schedule` (`:1694`) | Sound among choices | The keyed option is the only listed schedule satisfying every rule, although many unlisted schedules can satisfy them. Ask “Which of these schedules…” to make the answer domain explicit. |
| `bottleneck-plan` (`:1722`) | **Critical** | Design, Test, and Deploy all lie on the critical path, so shortening any one reduces total duration. Ask which parallel task controls when Deploy can start (Test), or specify a constrained intervention that makes Test uniquely optimal. |
| `long-case-deduction` (`:1750`) | **Critical** | The derivation requires unstated bijections: one person per day, one person per lab, and each day/lab used once. Add those rules. Then solver-enumerate all assignments and assert that the selected claim holds in every model. |

### Quantitative Reasoning (12)

| Generator | Verdict | Finding and proposed remedy |
|---|---|---|
| `equation-system` (`:1240`) | **Critical choice defect** | The distractor `diff + y` is identically X, so it always duplicates the answer; X can also equal Y. Across training and assessment probes, all 8,000 rounds had the guaranteed answer-equivalent source distractor before deduplication, leaving 1,160 two-choice and 6,840 three-choice rounds. Generate distractors from actual errors (`sum/2`, `diff/2`, sign swap) and reject collisions. The independent algebra oracle confirmed all 8,000 keys. |
| `ratio-puzzle` (`:1268`) | Sound | The total is constructed so each part equals 3 and B is correctly keyed. Difficulty is static and numbers are tiny; add non-unit scales and multistep contexts. |
| `symbolic-pattern` (`:1295`) | Medium | The arithmetic is correct, but all symbol values are directly given and the task is fixed `3 x 2 + 4`; it does not justify a Hard label. Move to Core or require inference of values from equations. |
| `quant-balance` (`:812`) | Low / sound | It is a domain-relabelled copy of `balance-code`; the key is correct but it adds no content diversity and ignores difficulty. Consolidate or create quantitative-comparison variants. |
| `data-sufficiency` (`:1392`) | Low / sound | Each statement independently gives X=6. The response scheme omits the standard “together not sufficient” case, limiting reuse; define the full five-case schema before generating varied items. |
| `work-rate` (`:1454`) | Medium | The key 6 hours is correct, but the visual provides the rates and formula, leaving only arithmetic. Move derivation to feedback at medium/hard tiers. |
| `mixture-puzzle` (`:1478`) | Low / sound | Equal quantities correctly average to 30%. It is very basic and static; use unequal volumes and replacement/dilution for higher tiers. |
| `speed-distance` (`:1786`) | Medium | 2.5 hours is correct, but the visual explicitly supplies closing speed and the task is static. Reserve the hint for easy mode or post-answer feedback. |
| `probability-draw` (`:1810`) | Medium | 3/5 is correct, but the visual already gives favorable and total pair counts. Hard mode should require deriving those counts and should include common ordered/unordered distractors. |
| `remainder-system` (`:1834`) | Low / sound | 17 is the smallest positive solution. Add range bounds and multi-congruence tiers; keep the current equation restatement as an easy hint only. |
| `profit-discount` (`:1858`) | Medium | 12.5% is correct, but the visual performs both price calculations. Shift worked steps to the explanation and use distractors tied to percent-base mistakes. |
| `overlapping-sets` (`:1882`) | Medium | 10 is correct, but the visual gives the exact inclusion-exclusion setup. At medium/hard, show only data/context and explain the equation after submission. |

## Assessment mapping audit (8)

The assessment registry is at `puzzleGenerators.ts:1999`. It uses one randomly generated item per domain, which is not enough to estimate a stable domain score and makes reaction-time comparisons strongly dependent on the sampled item.

| Domain | Assessment generator | Verdict |
|---|---|---|
| Processing speed | `speedMatch(..., true)` | Plausible brief comparison task, but needs balanced same/different and controlled single-feature changes. |
| Working memory | `sequenceRecall(..., true)` labelled “Spatial Span” | **Construct mismatch**: this is a left-to-right digit sequence, not a Corsi-style spatial span. Rename it digit/serial span or implement spatial locations. |
| Attention | `colorWord(..., true)` | Plausible Stroop item, but a single trial cannot estimate inhibition and low tiers may be congruent. Use a balanced block and compare congruent vs incongruent latency/errors. |
| Flexibility | `trailBlaze(..., true)` | **Invalid until fixed**: ascending order is unstated and the noninteractive trail visual is irrelevant. A single textual multiple-choice item is not Trail Making. |
| Reasoning | `grammaticalReasoning` | Shapes are always different, so the user only judges whether “same/not the same” matches an obvious pair. It is static, trivial, and weak evidence for reasoning ability. |
| Language | `numberChain(..., true)` labelled “Digit Span” | **Wrong construct/domain**: reverse digit span measures working memory, not language/verbal ability. Replace with vocabulary, verbal relations, comprehension, or verbal inference items. |
| Planning | `routePlanner(..., true)` | Correct table optimization, but essentially one scan/comparison with two possible time limits; weak coverage of planning. Use several dependency/resource cases. |
| Quantitative | `equationSystem(..., true)` | Algebraic solution is correct, but answer choices are structurally broken by the guaranteed duplicate and content does not scale with difficulty. |

An assessment battery should contain multiple items per construct, balanced forms, an explicit time policy, and enough trials to separate speed from accuracy. Training generators should not automatically serve as assessment instruments merely by changing title and subtitle.

## Deterministic generator-probe results

`docs/audit/puzzle-generation-probes.cjs` transpiles and executes the real `trainingGeneratorEntries` and `assessmentGenerators` exports in a CommonJS VM. It replaces `Math.random` with a deterministic seeded PRNG before each round. The reported run used:

```text
node docs/audit/puzzle-generation-probes.cjs --seeds 200
```

That covers all levels 1–20: 272,000 training rounds (68 × 20 × 200) and 32,000 assessment rounds (8 × 20 × 200).

| Probe | Observed result |
|---|---|
| Training choice counts | 5 one-choice, 1,175 two-choice, 31,055 three-choice, 239,765 four-choice rounds |
| Assessment choice counts | 4,711 two-choice, 12,302 three-choice, 14,987 four-choice rounds |
| Basic structure | 5 training rounds failed the audit's minimum-two-choice invariant; all were `number-chain`. No assessment round failed it. |
| Key/index integrity | Zero out-of-range or missing `correctIndex` values; zero post-deduplication duplicate strings. This checks structure, not semantic truth. |
| Difficulty content | 47/68 training generators were content-static after excluding only IDs, the echoed difficulty value, and duration fields; 21 varied content. Two of eight assessments were content-static. |
| `dual-track` oracle | 620/4,000 keys did not describe all observed matches; 340 were both-position-and-color matches with no “both” choice. |
| `peripheral-catch` oracle | 380/4,000 targets were overwritten at the center; 1,620 visible non-center edge targets were coarsened to “Center.” All visible cases agreed with the generator's own coarse-zone key. |
| Trail written-rule oracle | The key always started at A and alternated types, but 142/8,000 training-plus-assessment rounds displayed two choices satisfying those written rules. This empirical ambiguity is additional to the general unstated-ascending-order defect. |
| Equation oracle | All 8,000 training-plus-assessment keys solved the displayed equations; all 8,000 source distractor sets included the algebraically equivalent `diff + y` before deduplication. |
| Operation-span oracle | Zero key errors after independently evaluating the displayed equations; 846/4,000 rounds had fewer than four choices. |
| Number-chain oracle | Zero key errors after reconstructing the displayed chain. All 1,600 forward rounds had fewer than four choices by construction; 1,243/6,400 reverse training-plus-assessment rounds also collapsed. |

Choice count is diagnostic, not a universal correctness rule. The reasoning assessment's `grammatical-reasoning` task is deliberately binary, so its 4,000 two-choice rounds are not defects merely for having fewer than four options. Likewise, an authored three-option task can be valid. The objective failures are one-choice rounds, unintended collision-driven shrinkage, answer-equivalent distractors, or choices that cease to represent the prompt's mutually exclusive outcomes.

## What the existing validation proves—and does not prove

`npm.cmd run validate:puzzles` passed. The script correctly exhausts or calculates selected fixed puzzles including seating, suspect, truth count, rank, implication, packing, scheduling, and arithmetic (`scripts/validate-hard-puzzles.mjs`). This supports the “Sound” rulings above, including the implication answer.

However, the validation script re-implements selected puzzle facts instead of importing and instantiating the production generators. It does not inspect generated choices, renderer output, random branches, prompt sufficiency, or difficulty. That is why it passes while `dual-track`, center-hidden `peripheral-catch`, duplicate `equation-system` choices, ambiguous trail rules, and multi-answer bottleneck wording remain.

The audit probe now instantiates every generator across deterministic seeds and levels and supplies independent oracles for the highest-risk randomized cases. It remains an audit artifact rather than a production test. Production tests should incorporate those checks and expand generator-specific solvers. At minimum they should assert:

1. required stimulus is visible in every random branch;
2. choice count and strings meet the product schema;
3. exactly one choice satisfies the written prompt and visible rules;
4. the explanation proves that choice from only visible premises;
5. declared difficulty causes a documented content change;
6. assessment domain and task construct match.

## Verification performed

- Read all 68 registry entries and their generator bodies in `src/logic/puzzleGenerators.ts`.
- Checked shared types, choice rendering, study/interference phases, and feedback display in `src/types.ts`, `src/components/PuzzleVisual.tsx`, and `src/components/PuzzleCard.tsx`.
- Read the full `scripts/validate-hard-puzzles.mjs` oracle coverage.
- Ran `node docs/audit/puzzle-generation-probes.cjs --seeds 200`: completed successfully after generating and inspecting 304,000 real-source rounds across levels 1–20; the detected defects are reported above.
- Ran `npm.cmd run validate:puzzles`: passed (`Hard puzzle validation passed.`).
- Ran `npm.cmd run typecheck`: passed with no TypeScript errors.
- Independently truth-tabled the implication chain and reviewed the trail screenshot facts supplied by the main audit.

## Limitations

This was a code-level audit, not a user study or psychometric validation. It did not estimate item response curves, population difficulty, test-retest reliability, accessibility with assistive technology, or visual comprehension on physical devices. The probe makes audit runs reproducible by replacing `Math.random` inside its VM; production generators still do not expose a seed parameter. Sampling can demonstrate reachable failures but cannot prove the absence of rare failures. Those limitations strengthen the recommendation to add first-class deterministic seeds and solver-backed item validation before expanding the bank.
