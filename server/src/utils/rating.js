// The shown rating mixes the dataset's rating with real reviews (business-rules.md: Ratings and reviews).
// It works in whole tenths, so rounding to one decimal (half up) has no floating point error.
export function computeRating({ seedAvg, seedCount, reviewSum, reviewCount }) {
  const count = seedCount + reviewCount;
  if (count === 0) return { ratingAvg: null, reviewCount: 0 };

  const totalTenths = Math.round(Number(seedAvg ?? 0) * 10) * seedCount + reviewSum * 10;
  const ratingAvg = Math.floor((2 * totalTenths + count) / (2 * count)) / 10;
  return { ratingAvg, reviewCount: count };
}
