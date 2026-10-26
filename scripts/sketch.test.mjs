import assert from 'node:assert/strict'
import { test } from 'node:test'
import { sketch } from '../src/lib/sketch.mjs'

const numbers = (d) => d.match(/-?[\d.]+/g).map(Number)

test('same seed draws the same picture', () => {
  assert.equal(sketch(7).box(28, 62, 120, 56), sketch(7).box(28, 62, 120, 56))
  assert.notEqual(sketch(7).box(28, 62, 120, 56), sketch(8).box(28, 62, 120, 56))
})

test('a box is one continuous stroke near its edges', () => {
  const d = sketch(3).box(72, 174, 320, 66)
  assert.equal(d.match(/M/g).length, 1) // 조각이 나뉘면 그리기 모션이 조각마다 따로 시작한다
  const xs = numbers(d).filter((_, i) => i % 2 === 0)
  const ys = numbers(d).filter((_, i) => i % 2 === 1)
  assert.ok(Math.min(...xs) > 72 - 4 && Math.max(...xs) < 392 + 4)
  assert.ok(Math.min(...ys) > 174 - 4 && Math.max(...ys) < 240 + 4)
})

test('a line keeps its pieces and ends near the given points', () => {
  const d = sketch(5).line('M88 118V146H376V118M232 118V174')
  assert.equal(d.match(/M/g).length, 2)
  const [x, y] = numbers(d)
  assert.ok(Math.abs(x - 88) < 2 && Math.abs(y - 118) < 5)
  const end = numbers(d).slice(-2)
  assert.ok(Math.abs(end[0] - 232) < 2 && Math.abs(end[1] - 174) < 5)
})
