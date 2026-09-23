# PuzzleScroll: changes to review before implementation

The audit supports a substantial rebuild of question quality, session flow and presentation. The detailed [implementation plan](plan.md) contains the work sequence, data model, test cases and acceptance gates. No application changes have been implemented during this audit.

## Your requested modes stay exactly as specified

**Fast / Slow x Easy / Medium / Hard**, plus the categories the user wants. **Custom** opens finer settings. There are six pace/difficulty combinations; source names will not replace them. Sources supply content and attribution internally, while questions from different sources can belong to the same selected mode.

## What the audit found

The [question audit](audit/puzzle-quality-audit.md) covers all 68 training types and eight assessment mappings. Confirmed problems include missing rules, ambiguous accepted answers, weak or duplicate distractors, hints that reveal the calculation before answering, and Hard labels on very basic static questions. For example, the project-bottleneck question has three actions that reduce project time, while the app accepts only one. Dual Track can accidentally match both features without offering a both answer.

The [app audit](audit/app-content-flow-audit.md) records 30 content/flow findings. The baseline and three-misses reports skip the final answer's feedback and lack visible exits. Returning to a question forgets its visible answer. A 5 min session is actually an endlessly extended question batch. One-second answers count as 15 seconds, wrong hard answers increase Hard solved, and settings exposes 90 controls. Some excluded puzzle types return after reload.

For the screenshots: the implication answer is correct because A implies B, B implies C, and C is false, forcing B and A false. The trail selection `2-B-1-A` violates the full prompt's Start at A, which is offscreen in the screenshot; the question still omits the ascending-order requirement and does not explain its shuffled tiles.

The reproducible generator audit exercised **304,000 seeded rounds**. It found 620/4,000 Dual Track key mismatches and 142/8,000 trail rounds with multiple options satisfying the written rules. These are sampled generated instances, not 304,000 distinct authored questions or a proof that every other key is correct.

## Proposed changes

| Area | Change |
|---|---|
| Answer trust | Repair or quarantine flawed items. Independently solve every approved question; prove the key and reject other valid MCQ options. Explain the reasoning and likely mistake. |
| Session endings | Last answer, then feedback, then View results. Results always provide **Done** and **Review answers**. Apply the same rule to timeout, early end and three misses. |
| Navigation | Visible close/pause throughout. Preserve answers and unfinished work. Revisiting is review; retry is explicit. Vertical scrolling reads the page without accidentally replacing the question. |
| Simple setup | Fast/Slow, Easy/Medium/Hard, category chips, Start, Custom. Remove overlapping preset modes and the developer-facing Complex puzzle placement text. |
| Fast practice | Proposed default: **five active-task minutes**, visible countdown and answered count, short trials, clear feedback. Examples and feedback do not consume the task-time budget. |
| Slow practice | Proposed default: **about 15 minutes**, elapsed timer and time to finish the current problem. Include substantive 5-10-minute hard cases, readable rules/data, a scratchpad, optional hints and saved progress. |
| Input | Mostly MCQ for easier tasks. Add numeric/fraction, ordered plan and structured answers where suitable. Every scored question has a verified answer; arbitrary prose is not automatically graded by an LLM. |
| Progress checks | Optional, explained and timed. Use repeated trials rather than pretending one answer measures an entire domain. Proposed five-minute checks cover 2-3 domains; full coverage takes longer or several checks. |
| Analytics | Actual active time by day/week/month; accuracy; correct-answer response time; speed vs accuracy for comparable tasks; session history and mistake review. Remove the invented Fitness score. |
| Visual design | Readable body text, fewer nested boxes, one feedback block, consistent header/timer, accessible controls, room for long questions and large text. |
| Engagement | Meaningful session completion, saved challenges, mistakes practice, varied new problems and progress the user can understand. |

Timer lengths and the focused-check format above are recommended defaults, detailed in the plan. Your pace/difficulty/category controls are fixed requirements.

## Content and datasets

The [source catalog](audit/dataset-source-catalog.md) maps sources and gaps across all **48 category x pace x difficulty cells**, including answer availability and reuse restrictions.

- **Candidate building blocks:** DeepMind Mathematics and GSM8K for quantitative work; SynLogic and selected PuzzleClone tasks for logic/planning; WordNet for authored verbal questions; independently verified public-domain recreational puzzles. These need item-level review and adaptation before serving.
- **PlanningBench:** a source of planning scenarios and constraints, not automatically a ready-to-grade bank. Require a checkable solution and response validator before use.
- **Reference/permission sources:** Wall Street Quants, official exam/recruitment material and other high-quality puzzle archives can guide the intended level. Public access or purchase does not itself grant app redistribution rights. The catalog identifies which sources have worked answers and which are gated or uncertain.
- **Original content is necessary:** especially longer verbal/quantitative cases and stimulus-based speed, memory, attention and switching tasks. For those four cognitive categories, Slow can mean a sustained block of trials; it should not mean relabelling a long algebra question as attention.

Suggested rollout: repair the existing bank; pilot **144 reviewed questions + 24 cognitive-task configurations**, including a depth pack of at least **24 slow-hard cases**; then expand toward **720 independent questions + 48 cognitive templates**. The case count is a subset/quality floor, not an extra count of linked subquestions. Difficulty is assigned to the required Easy/Medium/Hard tiers using reasoning depth and observed solving effort, regardless of source.

## Order of work and review limits

1. Correct answers, framing, feedback, exits and filter/persistence defects.
2. Session state, real timers, resume and honest data migration.
3. Simpler setup, revised screens and task-specific layouts.
4. Validated content pipeline and substantial slow questions.
5. Analytics, review and engagement; expand the approved bank.
6. Physical-device/browser, accessibility, offline and migration verification.

Screenshots and code were inspected, and diagnostic state tests were executed. Live browser/device testing was unavailable in this session; the audit labels those remaining checks explicitly. Existing TypeScript and fixture validation passing does not establish question quality or correct UX. Detailed evidence and reproducible generator/state probes are in [the audit folder](audit/).
