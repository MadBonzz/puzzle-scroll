import { gradeNumericResponse, normalizeRational } from '../../src/content/answers';

describe('numeric answer normalization', () => {
  test.each(['1/2', '2/4', '0.5'])('Q10 accepts equivalent exact value %s', (input) => {
    expect(normalizeRational(input)).toEqual({ numerator: 1n, denominator: 2n });
  });

  test.each(['1/3', '', '1/0', 'NaN', 'Infinity'])('Q10 rejects %s for one half', (input) => {
    expect(gradeNumericResponse(input, { kind: 'exact', accepted: ['1/2'] })).toBe(false);
  });

  test.each(['9.9', '10', '10.1'])('Q10 accepts inclusive decimal tolerance %s', (input) => {
    expect(gradeNumericResponse(input, { kind: 'tolerance', target: '10', tolerance: '0.1' })).toBe(true);
  });

  test.each(['9.89', '10.11'])('Q10 rejects out-of-tolerance decimal %s', (input) => {
    expect(gradeNumericResponse(input, { kind: 'tolerance', target: '10', tolerance: '0.1' })).toBe(false);
  });

  test('Q10 keeps unitless, required-unit, and convertible-unit policies distinct', () => {
    expect(gradeNumericResponse('10 m', { kind: 'exact', accepted: ['10'] })).toBe(false);
    expect(gradeNumericResponse('10', { kind: 'exact', accepted: ['10'], units: { kind: 'required', unit: 'm' } })).toBe(false);
    expect(gradeNumericResponse('10 m', { kind: 'exact', accepted: ['10'], units: { kind: 'required', unit: 'm' } })).toBe(true);
    expect(gradeNumericResponse('100 cm', {
      kind: 'exact',
      accepted: ['1'],
      units: { kind: 'convertible', baseUnit: 'm', factorsToBase: { m: '1', cm: '0.01' } }
    })).toBe(true);
    expect(gradeNumericResponse('100 kg', {
      kind: 'exact',
      accepted: ['1'],
      units: { kind: 'convertible', baseUnit: 'm', factorsToBase: { m: '1', cm: '0.01' } }
    })).toBe(false);
  });
});
