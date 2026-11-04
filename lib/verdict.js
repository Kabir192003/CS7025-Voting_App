const { MIN_VOTES_TO_CALL, CLOSE_MARGIN_PTS, LANDSLIDE_PCT } = require('./constants')

/**
 * Call a two-sided poll the way an election desk would.
 * @param {number} a votes for option A (THIS)
 * @param {number} b votes for option B (THAT)
 */
function verdict(a, b) {
  const n = a + b
  if (n === 0) return { code: 'early', label: 'Too early to call', leader: null, margin: 0, pctA: 0, pctB: 0, n }
  const pctA = Math.round((a / n) * 100)
  const pctB = 100 - pctA
  const margin = Math.abs(pctA - pctB)
  const leader = pctA === pctB ? null : pctA > pctB ? 'a' : 'b'
  const side = leader === 'a' ? 'THIS' : 'THAT'
  const lead = Math.max(pctA, pctB)

  let code, label
  if (n < MIN_VOTES_TO_CALL) { code = 'early'; label = 'Too early to call' }
  else if (margin <= CLOSE_MARGIN_PTS) { code = 'close'; label = 'Too close to call' }
  else if (lead >= LANDSLIDE_PCT) { code = 'landslide'; label = `Landslide · ${side}` }
  else { code = 'leaning'; label = `Leaning ${side}` }
  return { code, label, leader, margin, pctA, pctB, n }
}

module.exports = { verdict }
