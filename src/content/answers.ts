export interface Rational {
  numerator: bigint;
  denominator: bigint;
}

export type NumericAnswerPolicy =
  | { kind: 'exact'; accepted: string[]; units?: UnitPolicy }
  | { kind: 'tolerance'; target: string; tolerance: string; units?: UnitPolicy };

export type UnitPolicy =
  | { kind: 'required'; unit: string }
  | { kind: 'convertible'; baseUnit: string; factorsToBase: Record<string, string> };

function gcd(a: bigint, b: bigint): bigint {
  let left = a < 0n ? -a : a;
  let right = b < 0n ? -b : b;
  while (right) [left, right] = [right, left % right];
  return left || 1n;
}

export function normalizeRational(raw: string): Rational | undefined {
  const input = raw.trim();
  if (!input || /^(nan|[+-]?infinity)$/i.test(input)) return undefined;
  let numerator: bigint;
  let denominator: bigint;
  try {
    if (input.includes('/')) {
      const pieces = input.split('/');
      if (pieces.length !== 2 || !/^[+-]?\d+$/.test(pieces[0] ?? '') || !/^\d+$/.test(pieces[1] ?? '')) return undefined;
      numerator = BigInt(pieces[0]!);
      denominator = BigInt(pieces[1]!);
    } else {
      const match = input.match(/^([+-]?)(\d+)(?:\.(\d+))?$/);
      if (!match) return undefined;
      const decimals = match[3] ?? '';
      denominator = 10n ** BigInt(decimals.length);
      numerator = BigInt((match[2] ?? '0') + decimals) * (match[1] === '-' ? -1n : 1n);
    }
  } catch {
    return undefined;
  }
  if (denominator === 0n) return undefined;
  if (denominator < 0n) {
    numerator = -numerator;
    denominator = -denominator;
  }
  const divisor = gcd(numerator, denominator);
  return { numerator: numerator / divisor, denominator: denominator / divisor };
}

function equal(left: Rational, right: Rational) {
  return left.numerator === right.numerator && left.denominator === right.denominator;
}

function within(value: Rational, target: Rational, tolerance: Rational) {
  const differenceNumerator = value.numerator * target.denominator - target.numerator * value.denominator;
  const absoluteDifference = differenceNumerator < 0n ? -differenceNumerator : differenceNumerator;
  return absoluteDifference * tolerance.denominator <= tolerance.numerator * value.denominator * target.denominator;
}

function multiply(left: Rational, right: Rational): Rational {
  const divisor = gcd(left.numerator * right.numerator, left.denominator * right.denominator);
  return {
    numerator: (left.numerator * right.numerator) / divisor,
    denominator: (left.denominator * right.denominator) / divisor
  };
}

function normalizedInput(input: string, units?: UnitPolicy): Rational | undefined {
  const match = input.trim().match(/^([+-]?(?:\d+\/\d+|\d+(?:\.\d+)?))\s*([^\d\s].*)?$/);
  if (!match) return undefined;
  const value = normalizeRational(match[1] ?? '');
  if (!value) return undefined;
  const suppliedUnit = match[2]?.trim().toLowerCase();
  if (!units) return suppliedUnit ? undefined : value;
  if (!suppliedUnit) return undefined;
  if (units.kind === 'required') return suppliedUnit === units.unit.toLowerCase() ? value : undefined;
  const factorText = Object.entries(units.factorsToBase).find(([unit]) => unit.toLowerCase() === suppliedUnit)?.[1];
  if (!factorText) return undefined;
  const factor = normalizeRational(factorText);
  return factor ? multiply(value, factor) : undefined;
}

export function gradeNumericResponse(input: string, policy: NumericAnswerPolicy) {
  const value = normalizedInput(input, policy.units);
  if (!value) return false;
  if (policy.kind === 'exact') {
    return policy.accepted.some((accepted) => {
      const normalized = normalizeRational(accepted);
      return normalized ? equal(value, normalized) : false;
    });
  }
  const target = normalizeRational(policy.target);
  const tolerance = normalizeRational(policy.tolerance);
  return Boolean(target && tolerance && tolerance.numerator >= 0n && within(value, target, tolerance));
}
