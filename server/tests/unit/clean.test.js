import { describe, expect, it } from 'vitest';
import { cleanColor, cleanSize } from '../../db/seed-lib/clean.js';

describe('cleanColor', () => {
  it.each([
    ['BLACK/MAUVE', 'Black/Mauve'],
    ['  Ash mocha ', 'Ash Mocha'],
    ['AS SHOWN', 'As Shown'],
    ['navy-blue', 'Navy-Blue'],
  ])('%s -> %s', (input, expected) => {
    expect(cleanColor(input)).toBe(expected);
  });
});

describe('cleanSize', () => {
  it.each([
    ['One size', 'One Size'],
    ['onesize', 'One Size'],
    ['XXL', '2XL'],
    ['XXXL', '3XL'],
    ['SM', 'S/M'],
    ['ML', 'M/L'],
  ])('fixes %s -> %s', (input, expected) => {
    expect(cleanSize(input)).toBe(expected);
  });

  it.each(['M', '8', '0(24)', '16W', '2XL/3XL', '1X'])('keeps %s as it is', (size) => {
    expect(cleanSize(` ${size} `)).toBe(size);
  });
});
