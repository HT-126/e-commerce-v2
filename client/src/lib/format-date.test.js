import { describe, expect, it } from 'vitest';
import { formatDate } from './format-date.js';

describe('formatDate', () => {
  it('shows an ISO date as month, day and year', () => {
    expect(formatDate('2026-10-25T12:00:00.000Z')).toBe('Oct 25, 2026');
  });
});
