// 표는 원래의 table 레이아웃을 유지하고, 가로 스크롤과 둥근 테두리는 바깥 요소가 맡는다.
export const scrollTables = {
  name: 'scroll-tables',
  element: {
    filter: ['table'],
    visit(node, ctx) {
      const parent = ctx.parent(node)
      if (parent?.type === 'element' && parent.properties.className?.includes('table-scroll')) return
      ctx.wrapNode(node, {
        type: 'element',
        tagName: 'div',
        properties: { className: ['table-scroll'], role: 'region', ariaLabel: '표', tabIndex: 0 },
        children: [],
      })
    },
  },
}

// 표 칸 안의 긴 코드(경로 · 명령, 24자 이상)에 long-code 를 붙인다. 이것만 칸에 안 들어갈 때 줄을 바꾸고(prose.css),
// 짧은 코드(`CLAUDE.md` 같은)는 한 덩어리로 둔다. 전부 줄바꿈을 허용하면 짧은 코드까지 쪼개지고, 전부 막으면 긴 경로 하나가 표를 가로로 밀어낸다
const LONG = 24
export const longTableCode = {
  name: 'long-table-code',
  element: {
    filter: ['code'],
    visit(node, ctx) {
      if (ctx.textContent(node).length < LONG) return
      for (let up = ctx.parent(node), depth = 0; up && depth < 4; up = ctx.parent(up), depth++) {
        if (up.type !== 'element') return
        if (up.tagName === 'pre') return
        if (up.tagName === 'td') {
          ctx.setProperty(node, 'className', [...(node.properties.className ?? []), 'long-code'])
          return
        }
      }
    },
  },
}
