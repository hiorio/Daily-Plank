import { describe, expect, it } from 'vitest';
import { calculateCompletionRate } from './duration';

describe('calculateCompletionRate', () => {
  it('calculates completion rate and caps it at 100 percent', () => {
    expect(calculateCompletionRate(150, 300)).toBe(50);
    expect(calculateCompletionRate(400, 300)).toBe(100);
  });

  it('returns zero for invalid planned duration', () => {
    expect(calculateCompletionRate(30, 0)).toBe(0);
  });
});
