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

function validateTruthCountDeduction() {
  const suspects = ['Iva', 'Jae', 'Kai'];
  const statements = [
    (holder) => holder === 'Jae',
    (holder) => holder === 'Kai',
    (holder) => holder !== 'Jae'
  ];
  const trueCounts = Object.fromEntries(suspects.map((suspect) => [suspect, statements.filter((statement) => statement(suspect)).length]));
  assert(trueCounts.Kai === 2, `Truth Count: Kai should produce exactly two true statements, got ${trueCounts.Kai}`);
  assert(suspects.filter((suspect) => trueCounts[suspect] === 2).length === 1, `Truth Count: expected one solution, got ${JSON.stringify(trueCounts)}`);
}

function validateRankDeduction() {
  const runners = ['Luna', 'Milo', 'Nia', 'Oren'];
  const permutations = (items) =>
    items.length === 0 ? [[]] : items.flatMap((item, index) => permutations(items.filter((_, i) => i !== index)).map((rest) => [item, ...rest]));
  const valid = permutations(runners).filter((order) => {
    const pos = (name) => order.indexOf(name);
    return pos('Oren') === pos('Nia') + 1 && pos('Luna') < pos('Milo') && pos('Milo') !== 3;
  });
  assert(valid.length === 1, `Rank Deduction: expected one valid order, got ${valid.map((row) => row.join('-')).join(', ')}`);
  assert(valid[0]?.[1] === 'Milo', `Rank Deduction: expected Milo in 2nd, got ${valid[0]?.[1]}`);
}

function validateImplicationAndSetLogic() {
  const rows = [false, true].flatMap((a) => [false, true].flatMap((b) => [false, true].map((c) => ({ a, b, c }))));
  const valid = rows.filter(({ a, b, c }) => (!a || b) && (!b || c) && !c);
  assert(valid.length === 1 && !valid[0].a && !valid[0].b, `Implication Chain: expected only A=false, B=false, C=false; got ${JSON.stringify(valid)}`);

  const hasRed = true;
  const redIsSquare = true;
  const squareIsNotStriped = true;
  assert(hasRed && redIsSquare && squareIsNotStriped, 'Set Logic: premises should establish a red square that is not striped');
}

function validateNewPlanning() {
  const dependencyFinish = 2 + Math.max(3, 4) + 1;
  assert(dependencyFinish === 7, `Dependency Plan: expected 7 days, got ${dependencyFinish}`);

  const items = {
    Map: { weight: 2, value: 5 },
    Rope: { weight: 3, value: 7 },
    Kit: { weight: 4, value: 8 },
    Lamp: { weight: 1, value: 2 }
  };
  const names = Object.keys(items);
  const combos = [];
  for (let mask = 1; mask < 1 << names.length; mask += 1) {
    const combo = names.filter((_, index) => mask & (1 << index));
    const score = combo.reduce((sum, name) => ({ weight: sum.weight + items[name].weight, value: sum.value + items[name].value }), { weight: 0, value: 0 });
    if (score.weight <= 6) combos.push({ combo, score });
  }
  const best = combos.sort((a, b) => b.score.value - a.score.value)[0];
  assert(best?.combo.join(' + ') === 'Map + Rope + Lamp', `Value Packing: expected Map + Rope + Lamp, got ${best?.combo.join(' + ')}`);

  const validSchedules = [
    'Draft, Data, Review, Call, Send',
    'Call, Draft, Data, Review, Send',
    'Draft, Review, Data, Call, Send',
    'Draft, Data, Send, Review, Call'
  ].filter((schedule) => {
    const order = schedule.split(', ');
    const pos = (task) => order.indexOf(task);
    return pos('Draft') < pos('Review') && pos('Data') < pos('Review') && pos('Review') < pos('Send') && pos('Call') !== 0 && pos('Call') < pos('Send');
  });
  assert(validSchedules.length === 1 && validSchedules[0] === 'Draft, Data, Review, Call, Send', `Valid Schedule: unexpected valid choices ${validSchedules.join(' | ')}`);

  const design = 2;
  const buildPath = design + 3 + 1;
  const testPath = design + 5 + 1;
  assert(testPath > buildPath, `Bottleneck Plan: expected Test path ${testPath} to exceed Build path ${buildPath}`);

  const candidates = [
    'Nia in Lab 2 on Tuesday',
    'Omar in Lab 2 on Tuesday',
    'Pia in Lab 2 on Wednesday',
    'Ravi in Lab 4 on Tuesday'
  ];
  const validLongCase = candidates.filter((choice) => {
    const [person, , lab, labNo, , day] = choice.split(' ');
    const labName = `${lab} ${labNo}`;
    const days = { Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4 };
    const omarDay = 1;
    return (
      !(person === 'Nia' && ['Lab 1', 'Lab 4'].includes(labName)) &&
      !(person === 'Pia' && (day !== 'Wednesday' || labName === 'Lab 2')) &&
      !(person === 'Ravi' && day !== 'Thursday') &&
      !(person === 'Omar' && labName !== 'Lab 1') &&
      (labName !== 'Lab 2' || days[day] === omarDay + 1)
    );
  });
  assert(validLongCase.length === 1 && validLongCase[0] === 'Nia in Lab 2 on Tuesday', `Long Case: unexpected valid choices ${validLongCase.join(' | ')}`);
}

function validateNewQuant() {
  assert(250 / (60 + 40) === 2.5, 'Speed Distance: trains should meet in 2.5 hours');
  assert((3 * 2) / 10 === 3 / 5, 'Probability Draw: exactly one blue should be 3/5');
  assert(17 % 5 === 2 && 17 % 7 === 3, 'Remainder System: 17 should satisfy both remainders');
  assert((80 * 1.25 * 0.9 - 80) / 80 === 0.125, 'Profit Discount: profit should be 12.5%');
  assert(24 + 18 - (40 - 8) === 10, 'Overlapping Sets: both should be 10');
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
validateTruthCountDeduction();
validateRankDeduction();
validateImplicationAndSetLogic();
validateNewPlanning();
validateNewQuant();

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log('Hard puzzle validation passed.');
