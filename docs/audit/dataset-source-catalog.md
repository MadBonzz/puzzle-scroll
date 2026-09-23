# PuzzleScroll dataset and question-source catalog

Audited 2026-09-22. This is a research and product-planning document, not legal advice. License conclusions are conservative screening decisions based on publisher-controlled pages and repository artifacts. Escalate unresolved third-party provenance, ambiguous dataset scope, or permission-dependent reuse; ordinary original-content and clearly licensed-source work does not need a blanket legal gate.

Catalog scope: **22 assessed entries covering 24 named source/artifact families**. The count differs because PuzzleClone/PC-83K and Puzzled Pint/PuzzleWorld are each assessed together as one related entry.

## Executive recommendation

PuzzleScroll should not try to fill the library by copying a single large question bank. The defensible production stack is:

1. **Generate interaction-native trials in-app** for processing speed, working memory, attention/inhibition, and cognitive flexibility. These domains depend on exposure time, response latency, trial history, distractors, switching, and inhibition; a static question corpus cannot supply those mechanics.
2. **Ingest or generate only from rights-confirmed artifacts with independently checked answers.** DeepMind Mathematics Dataset, GSM8K, WordNet, and public-domain Dudeney formats are the strongest current candidates. SynLogic, PuzzleClone/PC-83K, and selected BIG-bench tasks are pilot inputs only until each task/seed family's upstream provenance is cleared. PlanningBench is a planning blueprint/evaluation source until PuzzleScroll has a deterministic checker and reference solutions; its checklist is not a canonical answer key.
3. **Use official GRE, GMAT, LSAT, SHL/Aon, Wall Street Quants, IBM, Jane Street, and Project Euler only as blueprint/reference material unless a separate written commercial license is obtained.** Public visibility, a free download, an email-gated answer, or purchase of a prep product does not grant redistribution or adaptation rights.
4. **Treat Fast/Slow and Easy/Medium/Hard as user-facing experience axes, never source collections.** Source names remain internal provenance. For reasoning, language, planning, and quantitative, Slow/Hard targets a 5–10 minute median correct solve time in the intended audience. For speed, memory, attention, and flexibility, Slow/Hard is a sustained multi-trial block; it must not be filled with generic logic questions and relabeled as a cognitive task.

The current generator inventory already follows the right basic split: reaction-time and memory paradigms dominate the first four domains, while logic grids, schedules, deductions, language constraints, and multi-step quantitative problems dominate the latter four. The major content gap is not raw volume. It is calibrated, independently validated Slow / Hard material with clean commercial rights.

## Axes and acceptance definitions

The two axes must remain independent.

| Axis | Operational definition | Product acceptance test |
|---|---|---|
| Fast | A single judgment or short trial, generally under 60 seconds; many cognitive trials should be under 10 seconds. | P80 completion time stays under the cell budget without excessive guessing or timeout effects. |
| Slow | A self-contained item or sustained block designed for deliberate work. | Easy/Medium can be 1–5 minutes. Hard should have a 5–10 minute median correct solve time for the target audience when the domain supports single-item reasoning. |
| Easy | One rule, short state, generous timing, obvious distractors. | High success after onboarding; no hidden convention. |
| Medium | Two or more operations, moderate distractors or state, or a meaningful speed/accuracy tradeoff. | Separates novice and practiced users without requiring obscure knowledge. |
| Hard | Long dependency chain, tight constraints, high interference, or short exposure under controlled conditions. | Validated difficulty comes from reasoning/state load, not ambiguity, cultural trivia, tiny touch targets, or arbitrary arithmetic bulk. |

For the four interaction-native domains, “Slow” describes **session/block duration**, not a long prose question:

- processingSpeed: repeated visual decisions with changing stimulus density;
- workingMemory: span/update trials with interference and delayed recall;
- attention: sustained target detection or inhibition across a sequence;
- flexibility: repeated rule switches, reversals, or alternating task sets.

## Rights and answer-quality legend

| Label | Meaning |
|---|---|
| `PROD` | Plausible for commercial production after notices, provenance checks, and QA. |
| `PILOT` | Suitable for an isolated technical/content spike, but not production ingestion until the named provenance or answer-validation blocker is closed. |
| `SA-REVIEW` | Reuse is offered under ShareAlike; architecture and attribution need legal/product review. |
| `NC-ONLY` | Noncommercial license; not suitable for a commercial app without separate permission. |
| `REF` | View/use as a design or benchmark reference; do not copy question text, art, explanations, or answer choices. |
| `PAID-REF` | Purchase grants access, not republication rights. |
| `PERMISSION` | Contact the rights holder and obtain a written commercial redistribution/adaptation license. |

License scope is artifact-specific. A code repository's license does not automatically license a separately hosted dataset, generated outputs, third-party prompts, seed puzzles, images, or per-item source material. Record `code_license`, `data_license`, and upstream/per-item provenance separately; when a release bundles them, retain evidence that the license actually applies to the files being staged.

Answer grades used below:

- **A — executable/formal:** a generator, symbolic solver, or deterministic verifier can recompute the answer;
- **B — worked:** publisher or author supplies a worked solution that can be independently checked;
- **C — keyed:** target answer exists but explanation or independent derivation may be absent;
- **D — community/uncertain:** accepted or supplied answer is useful evidence but not authoritative enough for shipping without re-solution.

Evidence terms used in this catalog:

- **Sampled:** at least one public item record was inspected, including its prompt/structured relation and answer/target where exposed. “Independently checked” means the stated target was recomputed or logically checked during this audit; it is not a statistically meaningful dataset audit.
- **Metadata-only:** counts, schema, license, or verifier claims were confirmed from publisher-controlled documentation, but an actual answer-bearing record was not both visible and checkable through the public interface reviewed. Metadata-only sources stay out of production until a staged sample is independently solved.

### Answer-bearing evidence spot-check

| Source | Evidence actually observed | Audit consequence |
|---|---|---|
| [DeepMind Mathematics Dataset README](https://github.com/google-deepmind/mathematics_dataset/blob/master/README.md) | **Sampled and independently checked.** The publisher README shows `Calculate -841880142.544 + 411127` with target `-841469015.544`; direct recomputation agrees. It also exposes several other question/answer pairs. | Confirms real canonical pairs, not merely a dataset description. Generated releases still need seed/version capture and a second implementation for production QA. |
| [GSM8K public test JSONL](https://raw.githubusercontent.com/openai/grade-school-math/master/grade_school_math/data/test.jsonl) | **Sampled and independently checked.** The first public JSONL record asks about 16 duck eggs less 3 eaten and 4 baked, sold at $2; the worked record ends `#### 18`, and `(16 - 3 - 4) × 2 = 18`. | Confirms worked answers and parseable final keys. This is one sampled record, not proof that all 8.5K are error-free. |
| [SynLogic publisher dataset viewer](https://huggingface.co/datasets/MiniMaxAI/SynLogic) | **Schema sampled; answer support not independently established.** The publisher viewer exposes actual rows and `data_source` values (including `arc_agi`), but the visible `reward_model` answer/solution fields are blank for those previewed rows. The README separately claims task-specific automatic verifiers. | Downgraded from unconditional production use to `PILOT`. Inspect executable verifier behavior and clear each `data_source`/task family before use. |
| [PuzzleClone / PC-83K publisher repository](https://github.com/puzzleClone/PuzzleCloneData) | **Metadata-only for answers in this audit.** The publisher exposes the JSONL schema (`problem`, `answer`, `config`, `eval_type`, `source`, `id`) and states that generated references are validated by solver or deterministic reproduction, but the large JSONL was not rendered by the public browser. | `PILOT` until staged records are sampled, re-solved, and their 86 seed identifiers are mapped to upstream rights. Apache-2.0 repository metadata alone does not clear seed content. |
| [PlanningBench README and evaluation release](https://github.com/Tencent-Hunyuan/PlanningBench) | **Metadata-only and non-canonical.** The repository exposes a 3.63 MB, 467-row evaluation file and says each item contains a verification checklist. Its construction used a Responder and Critic against that checklist; no canonical answer or deterministic checker is published in the README. | `PILOT`/reference only. A checklist or model-critic judgment is not answer grade A or B. Build a deterministic domain checker and reference feasible/optimal plans before any item can ship. |
| [Princeton WordNet overview](https://wordnet.princeton.edu/) | **Structured relation sampled.** Princeton gives `shut/close` and `car/automobile` synonym examples and a `furniture → bed → bunkbed` hierarchy. These are inspectable lexical facts, not ready-made puzzle answers. | Appropriate as a generation/validation substrate after sense and distractor review; do not mistake a synset edge for a publication-ready item. |
| [Dudeney, *Amusements in Mathematics*, public text](https://www.gutenberg.org/cache/epub/16713/pg16713.txt) | **Sampled and independently checked.** Puzzle 420 states three 3-inch volumes with 1/8-inch covers; its solution gives 3.5 inches because the first and last pages face the middle volume. Four covers total 0.5 inch, plus 3 inches of leaves. | Confirms that prompt/solution pairs exist, while also illustrating why old wording and diagram/layout assumptions require modernization and re-solution. |
| [BIG-bench `object_counting` task JSON](https://github.com/google/BIG-bench/blob/main/bigbench/benchmark_tasks/object_counting/task.json) | **Sampled and independently checked.** One public task record lists a violin, three trombones, two snails, accordion, piano, trumpet, and clarinet and targets `eight`/`8` musical instruments; counting only instruments agrees. | Confirms JSON target shape for this one generated family. It does not clear other BIG-bench tasks or justify shipping held-out benchmark text. |

All other catalog claims below are publisher-metadata findings unless a specific public record is cited. No gated, email-delivered, or purchased answer material was downloaded for this audit.

## Recommended production sources

### 1. DeepMind Mathematics Dataset — `PROD`, answer A

- **Exact source:** [google-deepmind/mathematics_dataset](https://github.com/google-deepmind/mathematics_dataset)
- **Access, count, format:** free generator code plus pre-generated text question/answer pairs. Version 1.0 contains **2 million pairs per module** and explicitly separates `train-easy`, `train-medium`, and `train-hard`. It covers arithmetic, algebra, calculus, comparison, measurement, numbers, polynomials, and probability. The repository also demonstrates generation to files.
- **Answers:** produced by code; short canonical answers are well suited to exact parsing and independent recomputation.
- **Rights:** the generator repository is [Apache-2.0](https://raw.githubusercontent.com/google-deepmind/mathematics_dataset/master/LICENSE), which permits commercial reproduction, modification, and distribution of covered repository material subject to license/notice obligations. The pre-generated corpus is separately hosted; capture its accompanying license evidence rather than assuming the code license travels with every bucket object. Locally generated pairs from the licensed generator are the cleaner first path.
- **Fit:** quantitative Fast/Easy through Fast/Hard, and Slow/Easy to Slow/Medium after composing related subproblems. It does **not by itself prove 5–10 minute Slow/Hard difficulty**; most prompts are school-level and short.
- **Ingestion note:** prefer running the generator with saved seeds and recomputing answers rather than bulk-shipping millions of pre-generated rows.

### 2. GSM8K — `PROD`, answer B

- **Exact source:** [openai/grade-school-math](https://github.com/openai/grade-school-math)
- **Access, count, format:** free, approximately **8.5K** human-written grade-school word problems split into about 7.5K train and 1K test. Raw files are JSONL with `question` and `answer`; answers contain calculation annotations and a final numeric result after `####`. The official README says problems take **2–8 steps**.
- **Answers:** contractor-written, worked derivations plus a final numeric key. The repository warns that separate model-generated example solutions contain occasional errors; those model outputs should not be treated as gold.
- **Rights:** the repository includes an [MIT license](https://raw.githubusercontent.com/openai/grade-school-math/master/LICENSE) permitting use, modification, distribution, sublicensing, and sale with the copyright/license notice.
- **Fit:** quantitative Slow/Easy and Slow/Medium, casual activation, and a starting point for original GRE-style word-problem structures. Usually too elementary for Slow/Hard GRE prep.
- **Ingestion note:** independently execute every arithmetic step and normalize units, rounding, and accepted-answer variants.

### 3. SynLogic — `PILOT`, publisher-claimed answer A

- **Exact sources:** [generator/verifier repository](https://github.com/MiniMax-AI/SynLogic), [dataset](https://huggingface.co/datasets/MiniMaxAI/SynLogic/tree/main)
- **Access, count, format:** free MIT-tagged Parquet dataset, about **49.3K rows** in the publisher account, split into easy and hard directories. The framework covers **35 tasks**, including Sudoku, Game of 24, cipher, Arrow Maze, Futoshiki, Minesweeper, Numbrix, object counting, time sequence, word sorting, and zebra puzzles. Generators accept scale/difficulty parameters.
- **Answers:** the framework README says every task has a rule-based verifier, but the visible dataset preview did not expose a nonblank answer/solution for the sampled rows. Treat the A grade as a publisher claim until PuzzleScroll runs a representative verifier sample and a second independent solver.
- **Rights:** the repository is [MIT-licensed](https://raw.githubusercontent.com/MiniMax-AI/SynLogic/main/LICENSE), and the separate Hugging Face dataset card declares MIT. Those are useful code/data metadata, not a substitute for row-level provenance: the live viewer exposes 27 `data_source` values and the sampled rows were labeled `arc_agi`. Clear or exclude every upstream-derived family.
- **Fit:** reasoning and planning across both speeds; quantitative and language for selected task families. Hard grid, path, cipher, and constraint instances are strong Slow/Hard candidates after human-time calibration.
- **Ingestion note:** whitelist individual task families. Prefer locally generated families whose templates and inputs are demonstrated original. Do not import benchmark-derived classes merely because the umbrella repository or dataset card says MIT; preserve a per-family upstream inventory.

### 4. PuzzleClone and PC-83K — `PILOT`, publisher-claimed answer A

- **Exact sources:** [PuzzleClone framework](https://github.com/HiThink-Research/PuzzleClone), [PC-83K data](https://github.com/puzzleClone/PuzzleCloneData)
- **Access, count, format:** free framework plus **83,657** procedurally generated logical reasoning puzzles from 86 seed specifications. PC-83K provides JSONL normal/hard splits, including 74,354 RL-training instances, 860 validation instances, and 8,443 test instances; entries contain problem, answer, parameters, config, question type, evaluation type, and seed source. Answer types include numerals, options, ordered/unordered arrays, and two-dimensional structures.
- **Answers:** the publisher says generation computes references and validates them by deterministic reproduction or a symbolic/SMT-like solver. The schema exposes `answer`, `config`, `eval_type`, and `source`, but this audit could not render an answer-bearing row from the large public JSONL. Independently sample and re-solve before promoting the answer grade.
- **Rights:** both the framework and data repositories declare **Apache-2.0**, but the data is derived from 86 seed puzzles and carries a per-row `source` identifier. A repository license cannot supply rights the publisher did not hold in an upstream seed. Map every seed identifier to origin and license; preserve separate framework/data notices.
- **Fit:** reasoning, planning, and quantitative, especially Slow/Medium and Slow/Hard. The released schema and examples are primarily Chinese, so production use needs controlled English rendering and bilingual review.
- **Ingestion note:** generate localized surface forms from configs rather than machine-translating final prompts. Re-run the verifier after rendering and reject any prompt whose linguistic constraints changed.

### 5. PlanningBench — `PILOT`, answer grade unassigned

- **Exact sources:** [Tencent-Hunyuan/PlanningBench](https://github.com/Tencent-Hunyuan/PlanningBench), [license](https://github.com/Tencent-Hunyuan/PlanningBench/blob/main/LICENSE.txt)
- **Access, count, format:** **467** synthetic evaluation instances in one JSONL file. The publisher describes six planning families and more than 30 task types: scheduling/timetabling, project/production, routing/travel, emergency response, allocation/matching, and workforce scheduling. Each self-contained prompt includes verification checklists for constraint satisfaction and objective quality.
- **Answers:** the release provides verification checklists, not canonical plans or worked solutions. Its documented construction uses a Responder and a Critic to assess outputs against the checklist. A checklist is a rubric, and a model/critic judgment is not a deterministic answer key. PuzzleScroll must derive and store at least one independently verified feasible plan, implement constraint checks, and separately prove or bound objective optimality before an item can ship.
- **Rights:** the dataset-specific license states **CC BY 4.0**, with no extra restriction beyond that license. Attribution is required; note that the license says it applies solely to the publicly released dataset.
- **Fit:** planning Slow/Medium and Slow/Hard. Some instances may exceed a phone-friendly 10-minute ceiling and will need reduction, not merely truncation.
- **Ingestion note:** use it first as a taxonomy and checker-design spike. Split a small sample into machine-readable constraints, feasible plans, objective score, and a short explanation; validate feasibility separately from optimality. Do not mark the 467 rows production-ready from checklist metadata alone.

### 6. Princeton WordNet 3.0 — `PROD`, answer A/C

- **Exact sources:** [WordNet overview](https://wordnet.princeton.edu/), [license and commercial use](https://wordnet.princeton.edu/license-and-commercial-use)
- **Access, count, format:** downloadable lexical database grouping nouns, verbs, adjectives, and adverbs into sense-specific synsets and explicit relations such as synonymy, antonymy, hypernymy, and morphosemantic links.
- **Answers:** relations are structured, but a relation alone does not make a polished puzzle. Generated clues and distractors require sense disambiguation and human review.
- **Rights:** Princeton explicitly says WordNet may be used in commercial applications. Its license permits use, copying, modification, and distribution for any purpose without fee, provided the copyright, permission, and disclaimer statements appear on all copies and modifications; Princeton's name may not be used in advertising.
- **Fit:** language Fast/Easy through Fast/Hard (synonym, antonym, category, analogy, odd-one-out), and as a validator/seed source for original Slow language puzzles.
- **Ingestion note:** never generate distractors from unrelated senses without checking the clue context. Filter offensive, archaic, specialist, multiword, and region-specific lemmas by audience.

### 7. Dudeney, *Amusements in Mathematics* — `PROD` in the United States, answer B/C

- **Exact sources:** [catalog](https://www.gutenberg.org/ebooks/16713), [plain text](https://www.gutenberg.org/cache/epub/16713/pg16713.txt), [Project Gutenberg license guidance](https://www.gutenberg.org/policy/license.html)
- **Access, count, format:** free ebook in HTML, EPUB, and plain text. It contains **430 numbered puzzles** and a solutions section. Categories include arithmetic/algebra, geometry, routes, moving counters, combinations/groups, weighing/packing, river crossings, games, magic squares, and mazes. The author notes that some entries have only final answers while others have extensive solutions.
- **Answers:** author-supplied, but old notation, old currency, diagrams, and occasional ambiguity mean every adapted item needs independent solution and uniqueness checks.
- **Rights:** the catalog marks the work public domain in the USA. Project Gutenberg explains that for a work unrestricted by U.S. copyright, removing its license/header and all Project Gutenberg trademark references leaves text unrestricted by U.S. intellectual-property law; international status must be checked separately. A link in acknowledgments does not itself invoke the trademark redistribution rules.
- **Fit:** reasoning, planning, and quantitative Slow/Easy through Slow/Hard after modernization; selected short forms can seed Fast/Medium. It is particularly useful because the app already cites Dudeney-derived formats.
- **Ingestion note:** adapt the underlying structure, names, units, and numbers; do not assume an old author's difficulty judgment matches a modern mobile audience.

### 8. Selected BIG-bench tasks — conditional `PILOT`, answer A/C

- **Exact sources:** [BIG-bench repository](https://github.com/google/BIG-bench), [214-task catalog](https://github.com/google/BIG-bench/blob/main/bigbench/benchmark_tasks/README.md), [Apache-2.0 repository license](https://raw.githubusercontent.com/google/BIG-bench/main/LICENSE)
- **Access, count, format:** **214 tasks** in the final task catalog. Approximately 80% are JSON tasks with `input` plus `target` or multiple-choice `target_scores`; the rest are programmatic. Useful families include object counting, logical deduction, logic grids, tracking shuffled objects, word sorting/unscrambling, operators, and unit conversion. Unit conversion alone has seven subtasks of 3,000 examples each.
- **Answers:** JSON targets or generated programmatic targets; explanations are usually absent. Contributor review makes this a benchmark, not a guarantee that every item is publication-ready.
- **Rights:** top-level repository is Apache-2.0, but BIG-bench is an aggregation. Some tasks incorporate or transform external datasets. **Only ingest task families whose README states original or automatically generated data with clean upstream rights.** Object Counting, for example, says it was automatically generated with no external data source.
- **Fit:** reasoning, language, and quantitative Fast cells; selected logic grids for Slow/Medium. Do not ship benchmark canary text, and do not train on held-out benchmark instances if future model evaluation matters.
- **Ingestion note:** maintain task-level provenance, not just a repository-level license field.

### 9. Puzzling Stack Exchange — `SA-REVIEW`, answer D

- **Exact sources:** [Stack Exchange Data Explorer](https://data.stackexchange.com/help), [content-license rules](https://stackoverflow.com/help/licensing)
- **Access, count, format:** query current Puzzling posts and answers through Data Explorer and export CSV; periodic site dumps use Stack Exchange's public schema. The live count changes, so this audit does not invent a fixed total.
- **Answers:** accepted answers and votes are useful filters, not official correctness proofs. Many puzzles have multiple valid interpretations, edits, embedded images, or external dependencies.
- **Rights:** each question/answer revision carries the CC BY-SA version applicable to its contribution date: 2.5 before 2011-04-08, 3.0 until 2018-05-02, and 4.0 thereafter. Reuse requires item-level attribution and ShareAlike compliance; the app must also avoid site chrome, logos, and other non-user content.
- **Fit:** broad Slow reasoning/language/planning discovery and originality research.
- **Ingestion note:** do not bulk-import into a closed proprietary corpus until counsel decides how per-item ShareAlike applies to the content bundle and app delivery. Safer near-term use is reference, taxonomy discovery, and contacting individual authors for a separate license.

## High-value sources that are not cleared for commercial ingestion

| Source | Verified offering and answer support | Rights/access decision | Best use |
|---|---|---|---|
| [Wall Street Quants `/ebook`](https://www.thewallstreetquants.com/ebook), [question list](https://www.thewallstreetquants.com/quant-question-list), and [starter-pack landing page](https://www.thewallstreetquants.com/download-starter-pack) | The requested `/ebook` URL was checked directly but exposed no readable catalog or answer content to the audit fetcher; no count, key, or rights claim is credited to that page. The public list separately shows **584** questions and “Updated 2026.” A sampled question page displayed only the prompt and required an email submission to unlock the “complete solution, explanation, and similar practice problems”; the form was not submitted. The same page says the question came from interviewees/public sources and may not reflect the named firm's process. | `REF` / `PERMISSION`. The [terms](https://www.thewallstreetquants.com/terms) restrict site and sold materials to personal noncommercial use and prohibit copying, modification, derivatives, exploitation, or distribution without authorization. Email access or purchase would not establish redistribution rights; interviewee/public-source provenance also prevents clean item-level clearance. | Recruitment-aptitude topic taxonomy and pacing only. Public prompts are not answer-bearing records, and gated solutions were not sampled. Write and solve new items from first principles; do not paraphrase this bank or imply a named-employer origin. |
| [ETS POWERPREP](https://www.ets.org/gre/test-takers/general-test/prepare/powerprep.html) | Free preview has 2 writing tasks, 7 verbal, and 11 quantitative questions; two free full practice tests provide correct answers, while paid POWERPREP PLUS adds explanations and difficulty. Paid official books provide 150 verbal or 150 quantitative questions with explanations. | `REF`, `PAID-REF`, or `PERMISSION`. ETS's [GRE licensing policy](https://www.ets.org/legal/permissions/licensing.html) says materials are protected, prohibits third-party website posting, lists commercial licensing at **$450 per question** for limited products, forbids adaptation, and says several official books and POWERPREP PLUS are not licensable. | Authoritative GRE blueprint and private benchmarking. Use the public [quantitative](https://www.ets.org/gre/test-takers/general-test/prepare/content/quantitative-reasoning.html) and [verbal](https://www.ets.org/gre/test-takers/general-test/prepare/content/verbal-reasoning.html) specifications to create original items. |
| [GMAT Official Prep](https://support.mba.com/hc/en-us/articles/16086220161051-GMAT-Official-Prep-Products-and-Study-Resources) | Free Starter Kit/practice exams and paid official questions provide authentic questions, answers, and analyses. | `REF`, `PAID-REF`, or `PERMISSION`. GMAC's [copyright guidance](https://www.gmac.com/about-us/gmac-legal-information/trademarks-and-copyrights/copyrights) says it owns assessment questions, does not allow reprinting without permission, prohibits posting questions online, and says modifying GMAT questions is infringement. | Data sufficiency, multi-source/table/graphics reasoning, verbal and quantitative pacing blueprints. |
| [LSAC LawHub official prep](https://www.lsac.org/lsat/prepare) | Free access to official LSAT prep; drill sets cover Logical Reasoning and Reading Comprehension. LSAC says each reading passage and its questions have hints and explanations. | `REF`, `PAID-REF`, or `PERMISSION`. [LawHub terms](https://www.lawhub.org/terms-and-conditions) say its content is LSAC property protected by copyright and related laws. | Original critical-assumption, argument-flaw, inference, and dense-reading item specifications. |
| [SHL practice/support](https://support.shl.com/viewArticle.html?c=10_91_12_&d=SHL-Candidate-Article-221&hl=en) | Short examples immediately reveal correct answer and a short explanation; answers to full-length timed practice tests are not available, only score feedback. | `REF` / enterprise `PERMISSION`. SHL's published terms retain its IP and limit product/service use to licensed internal purposes. | Recruitment timing, distractor style, inductive/deductive/numerical/verbal/checking construct coverage. |
| [Aon practice tasks](https://www.aon.com/en/capabilities/talent-and-rewards/prepare-for-your-online-assessment) | Free practice PDFs for numerical, verbal, inductive, deductive, instructions, and concentration-style assessments. No stable corpus count is published. | `REF` unless written commercial permission is obtained; free practice access is not a redistribution license. | Recruitment UX and task-family comparison, never a source-text pool. |
| [IBM Research Ponder This](https://research.ibm.com/labs/israel/ponder-this) | Monthly challenges with an archive dating to 1998; most archived months link an official solution. | `REF` / `PERMISSION`. IBM's [site terms](https://www.ibm.com/legal/terms) grant limited noncommercial viewing and prohibit mirroring or commercial sale of site content without rights. | Excellent Slow/Hard research for mathematical reasoning and planning; derive only broad mechanisms or request a license. |
| [Jane Street puzzle archive](https://www.janestreet.com/puzzles/archive/) | Monthly puzzle/solution pairs, often high-quality visual, word, probability, or combinatorial problems. The publisher does not state a stable total on the archive page. | `REF` / `PERMISSION`; no commercial redistribution license was found on the puzzle archive during this audit. | Slow/Hard quality bar and explanation style. Do not copy text, graphics, data, or solution paths. |
| [Project Euler](https://projecteuler.net/archives) | Large numbered archive of mathematical/computational problems with answer checking for members; explanations are not generally public as a reusable answer bank. | `NC-ONLY`. Its [copyright page](https://projecteuler.net/copyright) applies CC BY-NC-SA 4.0 to main problem content and explicitly prohibits commercial use; derivatives must use the same license. | Internal difficulty and mechanism research only, unless PuzzleScroll obtains separate commercial permission. |
| [Puzzled Pint archive](https://puzzledpint.org/puzzle-archive/) / [PuzzleWorld](https://github.com/MIT-MI/PuzzleWorld) | Monthly puzzle sets with hints and solutions; PuzzleWorld packages **667** real puzzlehunt problems with final answers, human reasoning traces, skill labels, difficulty, modalities, and source URLs. | `NC-ONLY`. Puzzled Pint's [authoring policy](https://puzzledpint.org/volunteering/write-puzzles/) says all puzzles are CC BY-NC-SA 4.0. PuzzleWorld's derived collection does not erase that noncommercial restriction. | Best reference for genuine 5–10+ minute language/reasoning “aha” puzzles. Commission original equivalents from authors. |
| [MATH / competition_math](https://github.com/hendrycks/math) | **12,500** competition problems, 7,500 train/5,000 test, seven subjects, full step-by-step solutions, difficulty levels 1–5. | **Quarantine.** The repository is MIT-tagged, but problems were collected from competition sources, and a 2025 [Hugging Face takedown record](https://huggingface.co/datasets/huggingface-legal/takedown-notices/commit/63dd4016e7841925ecd672eee57fec63f10ddf21) names many hosted copies. A repository license cannot grant rights the publisher does not own. Do not ingest without item-level provenance and clearance. | Private benchmark only; replace with commissioned or procedurally generated competition-style items. |

## Cognitive-task libraries: paradigm references, not question banks

### PEBL Test Battery

The [PEBL repository](https://github.com/stmueller/pebl) implements Flanker, Stroop, Go/No-Go, Trail Making, Wisconsin Card Sort, Digit Span, Corsi Blocks, N-Back, and Tower of London/Hanoi, spanning PuzzleScroll's first four domains plus planning. It is GPL-2.0. That is useful for studying task definitions and experimental parameters, but copying/adapting its code into a closed commercial app would create GPL obligations. Treat PEBL as a `REF` implementation; build independent Expo-native stimulus engines and document the scientific references for each paradigm.

### PsyToolkit experiment library

The [PsyToolkit library](https://www.psytoolkit.org/library/) lists more than 50 browser experiments, including mobile-friendly Stroop and N-back, Flanker, Go/No-Go, Corsi, Digit Span, operation span, visual search, task switching, Tower of Hanoi, and Wisconsin Card Sorting. Its [copyright page](https://us.psytoolkit.org/copyright.html) allows its material for noncommercial research/education with acknowledgment and requires formal permission for commercial use; individual experiments may also belong to other authors. Treat all code/assets as `REF` or `PERMISSION`, not a production asset pool.

These libraries reinforce the key product conclusion: the first four PuzzleScroll categories need generators and trial controllers. They do not offer static “questions with answers” that can simply be imported.

## Honest 48-cell coverage matrix

Legend: `G` = generate in PuzzleScroll with deterministic scoring; `I` = ingest/adapt a cleared source after QA; `P` = isolated pilot only, not production content; `C` = commission/original authoring; `R` = reference-only source; `GAP` = no current source can honestly satisfy the cell without new work.

The 48 rows/columns below are the fixed product classification: eight categories × Fast/Slow × Easy/Medium/Hard. A source name in a cell is only an internal provenance lead for content that might satisfy that cell after rights, answer, editorial, and timing gates. It must never appear as, replace, or redefine a user-facing mode, category, speed, or difficulty.

| Domain | Fast / Easy | Fast / Medium | Fast / Hard | Slow / Easy | Slow / Medium | Slow / Hard |
|---|---|---|---|---|---|---|
| Processing Speed | `G` simple match/scan | `G` denser scan/peripheral catch | `G` brief exposure + distractors | `G` short repeated scan block | `G` sustained mixed-density block | `GAP → G` 5–10 min adaptive block; must measure speed across trials, not use a logic puzzle |
| Working Memory | `G` short forward span | `G` reverse/update span | `G` dual-track/short exposure | `G` multi-round span | `G` operation span + interference | `GAP → G` 5–10 min progressive block with delayed recall; a single static item is invalid |
| Attention & Inhibition | `G` congruent target detection | `G` Flanker/Stroop/Go-No-Go | `G` conflict, rare targets, stop cues | `G` short vigilance sequence | `G` mixed inhibition sequence | `GAP → G` 5–10 min sustained block with lapse/error metrics; generic deduction would be mislabeled |
| Cognitive Flexibility | `G` single rule reversal | `G` alternating rule sets | `G` rapid unpredictable switches | `G` short card-sort/reversal block | `G` multi-rule cascade block | `GAP → G` sustained adaptive switching; long logic grids measure reasoning, not flexibility |
| Reasoning & Logic | `G/P` BIG-bench generated-task pilot | `G/P` SynLogic pilot, original deduction | `G/P` SynLogic/PuzzleClone compact-constraint pilots | `I` Dudeney/simple grids | `G/P` BIG-bench/SynLogic/PuzzleClone pilots | `G/C/P` solver-backed originals plus cleared PuzzleClone/SynLogic pilots; require 5–10 min pilot median |
| Language & Verbal | `G` WordNet synonym/category | `G/P` WordNet + clean BIG-bench word-task pilot | `G` timed analogy/constraint clue | `G/C` multi-clue word chains | `C` original critical-assumption/cryptic sets; official exams only `R` | `GAP → C` original puzzlehunt/cryptic/argument sets; Puzzled Pint/PuzzleWorld only `R`/NC |
| Planning & Strategy | `G` short route/tower next move | `G` resource choice/short dependency | `G/P` compact SynLogic plan/path pilot | `G` complete small route/tower | `G/P` original reduced cases informed by PlanningBench/PuzzleClone | `G/C/P` original solver-backed cases; PlanningBench/PuzzleClone/SynLogic remain pilots until checker and provenance gates pass |
| Quantitative Reasoning | `G/I` DeepMind arithmetic/comparison | `G/I` DeepMind algebra/ratio | `G/I` DeepMind hard generators | `I` GSM8K 2–3 step | `I/G` GSM8K 4–8 step + composed DeepMind | `GAP → G/C` verified generated/commissioned competition-style items; MATH and exam banks remain quarantined/reference |

### What the matrix says plainly

- **Fast coverage is already structurally strong.** It is a generator/UX problem, not a dataset-acquisition problem.
- **The first four Slow/Hard cells are not missing prose questions.** They need sustained trial blocks, device-timing QA, and behavioral calibration. Marking them “complete” based on a logic dataset would corrupt the category model.
- **Reasoning Slow/Hard has a promising open-source pilot path** through SynLogic and PuzzleClone, but both still need source-family clearance and independent solver sampling. PlanningBench contributes planning taxonomies and constraints, not a canonical key; planning items remain pilots until PuzzleScroll has deterministic feasibility/optimality checks.
- **Language Slow/Hard is the weakest commercially cleared cell.** The best public models of the experience are noncommercial or proprietary. Budget original puzzle authorship and two-pass editorial/solver review.
- **Quantitative Slow/Hard is also incomplete.** MATH has the right difficulty and solution shape but unresolved provenance; official GRE/GMAT material is tightly controlled. Use generated formal problems plus commissioned originals.

## Audience fit

| Audience | Appropriate source layer | What not to claim |
|---|---|---|
| Casual brain activation | In-app generated cognitive trials; WordNet; modernized Dudeney; approachable SynLogic/PuzzleClone subsets; GSM8K easy items. | Do not claim clinical assessment, cognitive improvement, or comparability to a standardized battery without validation. |
| GRE preparation | Original items built to ETS's published content and response formats; private comparison against POWERPREP/official books; GSM8K and DeepMind as raw mechanism pools only. | Do not call generated questions “official,” reproduce ETS wording, imply endorsement, or equate a game difficulty label with GRE score. |
| Recruitment aptitude | Original timed checking, numerical, verbal, inductive/deductive, switching, and data-interpretation formats; SHL/Aon/Wall Street Quants used only to study constructs and pacing. | Do not claim a question appeared at a named employer or reproduce “real/leaked” interview questions without provenance and permission. |

## Corpus targets are owned by the consolidated plan

[The consolidated implementation plan](../plan.md#diversity-and-corpus-targets) is authoritative; this source catalog does not define a competing rollout. Its current targets are:

- **Pilot:** 144 independently reviewed authored/imported items across the 24 reasoning-heavy cells (six per category × pace × tier cell), plus 24 verified protocols/configurations across the 24 cognitive-task cells.
- **Slow/Hard depth:** at least 24 independently solvable novel cases total across reasoning, quantitative, planning, and language, with at least six per domain. These cases are included within the 144-item pilot rather than added to it, and linked parts count as one case.
- **Expansion:** 720 reviewed independent items across the 24 reasoning-heavy cells (30 per cell), plus at least 48 calibrated cognitive protocols/templates and solver-checked seeded variants.

Quality gates take precedence over counts. Maintain a rights manifest, immutable source snapshot/hash, answer validator, difficulty hypothesis, independent-item/template identity, and per-cell approved/quarantined counts. Grow by new mechanisms and templates rather than number substitutions; reserve held-out seeds/templates, monitor exposure and answer disputes, and leave unsupported cells explicit. A source's own easy/hard label cannot establish PuzzleScroll's Easy/Medium/Hard tier.

## Ingestion and QA pipeline

### 1. Rights gate

Before downloading or transforming content, create one manifest row per artifact:

```text
source_id, canonical_url, publisher, artifact_type,
access_tier, data_license, code_license, license_url,
commercial_use, adaptation, redistribution, attribution,
sharealike, noncommercial, third_party_provenance,
snapshot_date, snapshot_hash, reviewer, decision
```

Reject or quarantine sources with missing license text, “research only,” noncommercial restrictions, unclear contest/book provenance, leaked interview claims, or a license that covers code but not the dataset. Purchasing access never changes the reuse field unless the contract says so.

### 2. Immutable raw snapshot

- Store the original artifact, retrieval date, canonical URL, cryptographic hash, declared version/commit, and license file.
- Do not silently refresh. A changed dataset or license becomes a new source version and must pass review again.
- Preserve upstream item IDs and per-item source URLs so takedowns and corrections can be applied precisely.

### 3. Normalize without losing provenance

Recommended canonical item fields:

```text
item_id, source_id, upstream_id, domain, mechanic,
speed_tier, difficulty_hypothesis, prompt, stimulus,
response_type, choices, canonical_answer, accepted_answers,
solution_steps, validator_id, generation_seed,
estimated_seconds, audience_tags, locale,
rights_status, attribution_text, review_status
```

Keep `source_id` on derivatives. Never flatten CC attribution, author, license-version, or change notices out of the export.

### 4. Answer validation ladder

Run the strongest applicable checks:

1. **Executable recomputation:** arithmetic with rational/decimal precision rules, graph/path solver, CSP/SMT/SAT solver, schedule feasibility checker, or lexical-relation lookup.
2. **Independent implementation:** validate with a second solver or algorithm not used by the generator. Shared code can reproduce the same bug.
3. **Uniqueness test:** for single-answer and MCQ items, enumerate or solve for alternate valid answers. A valid keyed answer is insufficient if another choice is also valid.
4. **Distractor audit:** prove each distractor is wrong under the exact wording; tag the misconception it represents.
5. **Human dual review:** one reviewer solves blind; a second checks wording, explanation, accessibility, and source compliance. Disagreement sends the item back, never to majority vote by convenience.
6. **Pilot telemetry:** flag unusually high wrong-choice concentration, long tail time, repeated answer disputes, or high abandon rate.

For open answers, normalize formatting separately from mathematical/semantic equivalence. Do not use an LLM as the sole grader. If no deterministic or tightly bounded equivalence checker exists, use structured intermediate inputs or convert the task to carefully designed multiple choice.

### 5. Difficulty calibration

- Start source labels only as priors. DeepMind “hard,” SynLogic-Hard, PC-83K hard, and MATH level 5 are not interchangeable human difficulty measures.
- Record accuracy, correct-response time, abandon rate, hint use, and repeat exposure by audience.
- Fit difficulty separately for casual, GRE-prep, and recruitment cohorts; one global Easy/Medium/Hard label will hide large differences.
- Promote to Slow/Hard only when median **correct** first-attempt time is 5–10 minutes and ambiguity/technical-failure rates are low. Overall time can look long merely because users are stuck.
- For cognitive blocks, calibrate accuracy and latency jointly and cap device/network effects. Difficulty must not come from dropped frames or imprecise touch timing.

### 6. Editorial and safety pass

- Plain-language rewrite without changing constraints; rerun the validator after every substantive edit.
- Accessibility review for color-only cues, small targets, motion, audio, screen readers, dyscalculia/dyslexia load, and one-handed mobile use.
- Bias/culture review for names, assumptions, regional vocabulary, and knowledge not intended by the construct.
- Duplicate and near-duplicate detection across sources and generated seeds.
- Trademark and endorsement review for named tests, employers, companies, or puzzle brands.

### 7. Release controls

- Ship an in-app/source-credits view generated from the manifest.
- Keep kill switches by source, template, and individual item.
- Version answer keys and explanations; corrections should be traceable to affected attempts.
- Maintain a dispute workflow with reproducible solver evidence.

## Immediate acquisition plan

1. **Start answer-bearing ingestion spikes:** DeepMind Mathematics Dataset, GSM8K, WordNet, and a 20-item modernized Dudeney sample; independently solve, test uniqueness, and record the exact data/license artifact for each.
2. **Run isolated provenance/verifier pilots:** SynLogic, PuzzleClone/PC-83K, and selected BIG-bench families. No row leaves staging until its task/seed ancestry is cleared and its claimed verifier is checked against an independent solver.
3. **Use PlanningBench for taxonomy/checker design:** structure a small sample into constraints and derive reference feasible/optimal plans, but do not count checklist-only rows toward the production corpus.
4. **Commission the gaps:** an initial batch of 30 original Language Slow/Hard and 30 Quantitative Slow/Hard items, each with a worked solution and an independent formal or numerical check where possible.
5. **Build sustained-block specifications:** one Slow/Hard block each for speed, memory, attention, and flexibility, based on independently implemented paradigms; validate timing on representative iOS and Android devices.
6. **Quarantine rather than ingest:** Wall Street Quants, official test/recruitment banks, IBM/Jane Street, Project Euler, Puzzled Pint/PuzzleWorld, Puzzling Stack Exchange pending its specific ShareAlike packaging decision, and MATH pending item-level provenance clearance.

This plan produces credible coverage without pretending that 48 labels equal 48 validated content pools. It also concentrates expensive original authoring exactly where the open ecosystem is weakest: commercially usable, human-calibrated Slow/Hard language and quantitative problems.
