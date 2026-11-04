process.env.NODE_ENV = 'test'
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { verdict } = require('../lib/verdict')
const { wilsonLowerBound } = require('../lib/wilson')

test('verdict: too early below 10 votes', () => {
  assert.equal(verdict(6, 3).code, 'early')
  assert.equal(verdict(0, 0).code, 'early')
})
test('verdict: too close within 6 points', () => {
  assert.equal(verdict(53, 47).code, 'close')   // margin 6
  assert.equal(verdict(603, 601).code, 'close')
})
test('verdict: leaning below 70, landslide at 70 or more', () => {
  const lean = verdict(60, 40)
  assert.equal(lean.code, 'leaning'); assert.equal(lean.label, 'Leaning THIS')
  const slide = verdict(30, 70)
  assert.equal(slide.code, 'landslide'); assert.equal(slide.label, 'Landslide · THAT'); assert.equal(slide.leader, 'b')
  assert.equal(verdict(54, 46).code, 'leaning') // margin 8
})
test('verdict: percentages always sum to 100', () => {
  for (let a = 0; a <= 40; a++) for (let b = 0; b <= 40; b++) { const v = verdict(a, b); if (v.n) assert.equal(v.pctA + v.pctB, 100) }
})
test('wilson: evidence beats raw share', () => {
  assert.ok(wilsonLowerBound(100, 101) > wilsonLowerBound(2, 2))
  assert.equal(wilsonLowerBound(0, 0), 0)
  assert.ok(wilsonLowerBound(5, 5) <= 1)
})
