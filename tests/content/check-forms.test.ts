import { buildCheckItems, checkFormCoverage } from '../../src/content/checkForms';
import { stableChoiceId } from '../../src/content/catalog';

describe('independent progress-check forms', () => {
  test('A06: a quick check covers only 2–3 selected domains with two versioned trials each', () => {
    const items = buildCheckItems(['reasoning', 'planning', 'quantitative', 'language'], 7);
    expect(items).toHaveLength(6);
    expect(new Set(items.map((item) => item.domain))).toEqual(new Set(['reasoning', 'planning', 'quantitative']));
    expect(items.every((item) => item.protocolId === 'quick-check-v1')).toBe(true);
    expect(items.every((item) => item.contentId.startsWith('check-v1-'))).toBe(true);
    expect(items.some((item) => item.contentId === 'implication-chain')).toBe(false);
    expect(checkFormCoverage).toEqual({
      processingSpeed: 2,
      workingMemory: 2,
      attention: 2,
      flexibility: 2,
      reasoning: 2,
      language: 2,
      planning: 2,
      quantitative: 2
    });
  });

  test('Q01/Q05/Q06: fixed check keys agree with independent known results', () => {
    const items = buildCheckItems(['reasoning', 'planning', 'quantitative'], 9);
    const expected = new Map([
      ['check-v1-reasoning-1', 'P and Q are false'],
      ['check-v1-reasoning-2', 'Ben'],
      ['check-v1-planning-1', 'Test'],
      ['check-v1-planning-2', 'A, B, C, D'],
      ['check-v1-quantitative-1', '6'],
      ['check-v1-quantitative-2', '15']
    ]);
    for (const item of items) {
      const answer = expected.get(item.contentId);
      expect(answer).toBeDefined();
      expect(item.correctChoiceIds).toEqual([stableChoiceId(answer!)]);
      expect(item.choices.filter((choice) => item.correctChoiceIds.includes(choice.id))).toHaveLength(1);
    }
  });
});
