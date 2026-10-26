// 손으로 그린 선을 빌드 때 SVG 경로로 만든다 (랜딩 그림). 자를 대고 그은 곧은 선 대신
// - 변은 가운데가 살짝 휜 곡선이고, 꼭짓점은 조금씩 어긋난다
// - 상자는 펜을 떼지 않고 두 바퀴 돌아 겹친 선이 되고, 끝은 첫 변을 조금 넘는다
// - 선은 양 끝이 조금 넘친다
// 브라우저는 점선(그리기 모션)을 조각(M)마다 처음부터 다시 긋기 때문에, 겹친 선도 한 조각으로 이어 긋는다.
// 씨앗이 같으면 모양도 같다 (빌드마다 같은 그림)
export function sketch(seed = 1) {
  let state = seed
  const rand = () => {
    state = (state * 16807) % 2147483647
    return (state / 2147483647) * 2 - 1 // -1..1
  }
  const n = (v) => Math.round(v * 10) / 10
  const shake = ([x, y], amount) => [x + rand() * amount, y + rand() * amount]

  let at = [0, 0]
  const move = ([x, y]) => {
    at = [x, y]
    return `M${n(x)} ${n(y)}`
  }
  // 지금 자리에서 (x, y) 로: 가운데가 길이에 비례해(1.5 안) 옆으로 휜다
  const curve = ([x, y]) => {
    const [ax, ay] = at
    const len = Math.hypot(x - ax, y - ay) || 1
    const bow = rand() * Math.min(3, len * 0.025)
    at = [x, y]
    return `Q${n((ax + x) / 2 - ((y - ay) / len) * bow)} ${n((ay + y) / 2 + ((x - ax) / len) * bow)} ${n(x)} ${n(y)}`
  }

  // 상자: laps 바퀴(기본 두 바퀴). 바퀴마다 꼭짓점을 따로 흔들어 겹친 선이 조금씩 어긋난다
  function box(x, y, w, h, laps = 2) {
    const corners = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]]
    const points = []
    for (let lap = 0; lap < laps; lap++) points.push(...corners.map((c) => shake(c, 1.6)))
    const [sx, sy] = shake([x, y], 1.6)
    points.push([sx, sy], [sx + Math.min(w * 0.1, 12), sy + rand()]) // 시작 꼭짓점을 지나 첫 변을 조금 더 긋고 끝난다
    return move(points[0]) + points.slice(1).map(curve).join('')
  }

  // 선: M · L · H · V 로만 된 경로를 손으로 긋는다. 조각(M)마다 양 끝이 조금 넘친다
  function line(path) {
    return path
      .match(/M[^M]+/g)
      .map((part) => {
        const points = []
        let [x, y] = [0, 0]
        for (const [, command, args] of part.matchAll(/([MLHV])([^MLHV]+)/g)) {
          const v = args.trim().split(/[\s,]+/).map(Number)
          if (command === 'H') x = v[0]
          else if (command === 'V') y = v[0]
          else [x, y] = v
          points.push(shake([x, y], 1))
        }
        const stretch = (p, q) => {
          const len = Math.hypot(p[0] - q[0], p[1] - q[1]) || 1
          const over = Math.min(3, len * 0.08) * (0.5 + Math.abs(rand()) / 2)
          return [p[0] + ((p[0] - q[0]) / len) * over, p[1] + ((p[1] - q[1]) / len) * over]
        }
        points[0] = stretch(points[0], points[1])
        points[points.length - 1] = stretch(points.at(-1), points.at(-2))
        return move(points[0]) + points.slice(1).map(curve).join('')
      })
      .join('')
  }

  return { box, line }
}

// 칸 크기를 빌드 때 모르는 HTML 칸의 테두리 (문서 그림 · 구조 지도): 두 번 그은 상자를 CSS mask 로 칸 크기에 맞춰 늘려 쓴다.
// 늘려도 선 굵기는 그대로(non-scaling-stroke). CSS 의 url(...) 값
export function boxMask(seed) {
  const d = sketch(seed).box(3, 3, 194, 94)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100" preserveAspectRatio="none"><path d="${d}" fill="none" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></svg>`
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
}
