import { createMonotonicClock } from '../../src/session/clock';

describe('foreground monotonic clock', () => {
  test('T01/T04: wall-clock rollback cannot reduce or inflate foreground elapsed time', () => {
    let wall = 10_000;
    let monotonic = 500;
    const clock = createMonotonicClock(() => wall, () => monotonic);
    expect(clock.now()).toBe(10_000);
    wall = -1_000_000;
    monotonic = 1_000;
    expect(clock.now()).toBe(10_500);
    monotonic = 2_500;
    expect(clock.now()).toBe(12_000);
  });
});
