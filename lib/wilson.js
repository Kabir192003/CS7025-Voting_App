/**
 * Lower bound of the Wilson score interval (95%), after Evan Miller's
 * "How Not To Sort By Average Rating". Ranks by evidence, not raw share:
 * 2 of 2 does not beat 100 of 101.
 */
function wilsonLowerBound(positive, total, z = 1.96) {
  if (total <= 0) return 0
  const phat = Math.min(positive, total) / total
  const z2 = z * z
  return (phat + z2 / (2 * total) - z * Math.sqrt((phat * (1 - phat) + z2 / (4 * total)) / total)) / (1 + z2 / total)
}

module.exports = { wilsonLowerBound }
