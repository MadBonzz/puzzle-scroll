const failures = [];

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function exactlyOne(values) {
  return values.filter(Boolean).length === 1;
}

function validateSuspectDeduction() {
  const suspects = ['Nora', 'Omar', 'Pia', 'Quinn'];
  const statements = [
    ['Pia: Quinn did not take it.', (culprit) => culprit !== 'Quinn'],
    ['Omar: Nora took it.', (culprit) => culprit === 'Nora'],
    ['Omar: Pia did not take it.', (culprit) => culprit !== 'Pia'],
    ['Quinn: Quinn took it.', (culprit) => culprit === 'Quinn']
  ];
  const falseCounts = Object.fromEntries(
    suspects.map((suspect) => [suspect, statements.filter(([, evaluate]) => !evaluate(suspect)).length])
  );
  assert(falseCounts.Nora === 1, `Suspect Deduction: Nora should produce exactly one false statement, got ${falseCounts.Nora}`);
  assert(
    suspects.filter((suspect) => falseCounts[suspect] === 1).length === 1,
    `Suspect Deduction: exactly one suspect should satisfy the false-count rule, got ${JSON.stringify(falseCounts)}`
  );
}

function validateSeatingDeduction() {
  const people = ['Eli', 'Dev', 'Ari', 'Bea', 'Cy'];
  const permutations = (items) =>
    items.length === 0 ? [[]] : items.flatMap((item, index) => permutations(items.filter((_, i) => i !== index)).map((rest) => [item, ...rest]));
  const valid = permutations(people).filter((order) => {
    const pos = (name) => order.indexOf(name);
    return pos('Eli') === 0 && pos('Dev') === pos('Eli') + 1 && pos('Cy') === pos('Bea') + 1 && pos('Ari') !== 0 && pos('Ari') !== 4;
  });
  assert(valid.length === 1, `Seating Deduction: expected one valid order, got ${valid.map((row) => row.join('-')).join(', ')}`);
  assert(valid[0]?.[2] === 'Ari', `Seating Deduction: expected Ari in the middle, got ${valid[0]?.[2]}`);
}

function validateDataSufficiency() {
  const solutionsFromI = [];
  const solutionsFromII = [];
  for (let x = -20; x <= 20; x += 1) {
    for (let y = -20; y <= 20; y += 1) {
      if (x + y === 10 && x - y === 2) solutionsFromI.push(x);
      if (x + y === 10 && y === 4) solutionsFromII.push(x);
    }
  }
  assert(new Set(solutionsFromI).size === 1 && solutionsFromI[0] === 6, `Data Sufficiency I should determine X=6, got ${solutionsFromI}`);
  assert(new Set(solutionsFromII).size === 1 && solutionsFromII[0] === 6, `Data Sufficiency II should determine X=6, got ${solutionsFromII}`);
}

function validateResourceSchedule() {
  const tasks = {
    Scan: { time: 2, energy: 2, value: 3 },
    Sort: { time: 3, energy: 1, value: 4 },
    Solve: { time: 4, energy: 3, value: 7 },
    Review: { time: 2, energy: 1, value: 2 }
  };
  const combos = [
    ['Scan', 'Sort'],
    ['Sort', 'Solve'],
    ['Scan', 'Review', 'Sort'],
    ['Solve', 'Review']
  ];
  const scored = combos.map((combo) => ({
    combo,
    score: combo.reduce((sum, taskName) => {
      const task = tasks[taskName];
      return { time: sum.time + task.time, energy: sum.energy + task.energy, value: sum.value + task.value };
    }, { time: 0, energy: 0, value: 0 })
  }));
  const best = scored
    .filter(({ score }) => score.time <= 6 && score.energy <= 4)
    .sort((a, b) => b.score.value - a.score.value)[0];
  assert(best?.combo.join(' + ') === 'Solve + Review', `Resource Schedule: expected Solve + Review, got ${best?.combo.join(' + ')}`);
}

function validateRoutePlanner() {
  const routes = [
    { name: 'A-C-D', time: 7, risk: 3, reward: 4 },
    { name: 'A-B-D', time: 6, risk: 5, reward: 3 },
    { name: 'A-E-D', time: 9, risk: 1, reward: 6 }
  ];
  const bestFor = (limit) => routes.filter((route) => route.time <= limit).sort((a, b) => b.reward - a.reward || a.risk - b.risk)[0].name;
  assert(bestFor(9) === 'A-E-D', `Route Planner: expected A-E-D for limit 9, got ${bestFor(9)}`);
  assert(bestFor(8) === 'A-C-D', `Route Planner: expected A-C-D for limit 8, got ${bestFor(8)}`);
}

function validateQuant() {
  assert(Math.abs(1 / (1 / 10 + 1 / 15) - 6) < 1e-9, 'Work Rate: A+B should take 6 hours');
  assert((20 + 40) / 2 === 30, 'Mixture: equal 20% and 40% should yield 30%');
  assert(3 * 2 + 4 === 10, 'Symbolic Pattern: triangle x circle + square should equal 10');
}

function validateWeighingPuzzle() {
  const coins = ['Coin 1', 'Coin 2', 'Coin 3', 'Coin 4', 'Coin 5'];
  const valid = coins.filter((heavy) => {
    const weight = (coin) => (coin === heavy ? 2 : 1);
    return (
      weight('Coin 1') + weight('Coin 2') === weight('Coin 4') + weight('Coin 5') &&
      weight('Coin 1') + weight('Coin 3') > weight('Coin 2') + weight('Coin 4')
    );
  });
  assert(valid.length === 1 && valid[0] === 'Coin 3', `Weighing Puzzle: expected only Coin 3, got ${valid.join(', ')}`);
}

function validateRiverCrossingPlan() {
  const answer = ['Guard+A -> far', 'Guard -> near', 'Guard+B -> far', 'Guard -> near', 'Guard+C -> far'];
  const near = new Set(['Guard', 'A', 'B', 'C']);
  const far = new Set();
  for (const move of answer) {
    const [actors, direction] = move.split(' -> ');
    const group = actors.split('+');
    assert(group.includes('Guard'), `River Plan: move must include guard: ${move}`);
    assert(group.length <= 2, `River Plan: boat capacity exceeded: ${move}`);
    const from = direction === 'far' ? near : far;
    const to = direction === 'far' ? far : near;
    for (const actor of group) {
      assert(from.has(actor), `River Plan: ${actor} not on correct bank before ${move}`);
      from.delete(actor);
      to.add(actor);
    }
  }
  assert(['A', 'B', 'C'].every((actor) => far.has(actor)), 'River Plan: all passengers should end on far side');
}

function validateRuleCascade() {
  const colors = ['red', 'blue', 'green', 'yellow', 'purple', 'black'];
  const shapes = ['circle', 'square', 'triangle'];
  for (const number of [2, 3, 4, 5]) {
    for (const color of colors) {
      for (const shape of shapes) {
        const firstRule = number % 2 === 0 ? 'color' : 'shape';
        const finalRule = color.length > 4 ? 'number' : firstRule;
        const answer = finalRule === 'color' ? color : finalRule === 'shape' ? shape : number % 2 === 0 ? 'even' : 'odd';
        assert(answer !== undefined && answer !== '', `Rule Cascade: empty answer for ${number} ${color} ${shape}`);
      }
    }
  }
}

validateSuspectDeduction();
validateSeatingDeduction();
validateDataSufficiency();
validateResourceSchedule();
validateRoutePlanner();
validateQuant();
validateWeighingPuzzle();
validateRiverCrossingPlan();
validateRuleCascade();

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log('Hard puzzle validation passed.');
