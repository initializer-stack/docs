const escape = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char])

const flows = {
  testing: {
    title: 'API 통합 테스트',
    steps: [
      ['HTTP · gRPC', '요청 전송', '테스트가 실제 서버에 HTTP 또는 gRPC 요청을 보냅니다. 서버는 랜덤 포트에서 실행합니다.'],
      ['api', '입력 검증', '본문을 검증한 뒤 HTTP 라우트 또는 gRPC 서비스가 공통 업무 로직을 호출합니다.'],
      ['domain', '업무 로직', 'api · domain · storage 는 실제 구현을 사용합니다. 업무 로직이 저장소와 외부 클라이언트를 호출합니다.'],
      ['storage · clients', '실제 DB 와 Fake', 'storage 는 docker 의 테스트용 Postgres 에 연결합니다. 외부 시스템을 호출하는 clients 만 Fake 로 바꿉니다.'],
      ['응답', '결과 검증', '응답과 저장 상태를 확인합니다. HTTP 오류는 400/502 등의 JSON 응답으로, gRPC 오류는 해당 status 로 변환됩니다.'],
    ],
    branches: [['storage', '테스트 DB', '실제 Postgres'], ['clients', 'Fake', '외부 시스템 대역']],
    branchStep: 3,
    note: '실제 외부 서비스 · 브라우저 · 프록시는 이 테스트 범위 밖입니다.',
  },
  contracts: {
    title: 'HTTP 계약 생성',
    steps: [
      ['서버 코드', 'API 구현', '각 서버가 자기 코드에서 OpenAPI 문서를 생성합니다. 별도의 계약 문서를 손으로 작성하지 않습니다.'],
      ['OpenAPI', '<서버>.json', 'pnpm gen 이 서버별 API 문서를 contract/openapi/<서버>.json 에 저장합니다.'],
      ['TypeScript', '<서버>.ts', 'OpenAPI 문서에서 클라이언트가 사용할 경로 · 요청 · 응답 타입을 생성합니다.'],
      ['@app/client', '타입으로 API 호출', 'createClient<서버.paths>() 로 해당 서버의 타입을 사용합니다. 문서와 호출이 다르면 typecheck 에서 확인합니다.'],
    ],
    note: '생성물은 코드와 함께 커밋합니다. CI 가 누락된 변경을 검사합니다.',
  },
  layers: {
    title: '서버 안의 호출 방향',
    steps: [
      ['api', '진입점과 검증', 'HTTP 라우트 · gRPC 서비스 · 보안을 담당합니다. 요청을 검증하고 domain 을 호출합니다.'],
      ['domain', '공통 업무 로직', 'HTTP 와 gRPC 가 함께 사용하는 업무 로직입니다. 필요한 storage 와 clients 를 호출합니다.'],
      ['storage · clients', '저장소와 외부 연결', 'storage 는 DB 를, clients 는 외부 시스템과의 통신을 담당합니다. 외부 시스템마다 클라이언트를 하나 둡니다.'],
    ],
    branches: [['storage', 'DB', '데이터 저장과 조회'], ['clients', '외부 시스템', '교체 가능한 연결 지점']],
    branchStep: 2,
    note: 'support 에는 오류 형식 · 라우트 도구처럼 레이어와 무관한 코드를 둡니다.',
  },
}

const folderRoles = {
  'contract/': '서버와 클라이언트가 공유하는 API 계약입니다.',
  'servers/': 'API 와 업무 로직을 구현합니다. 서버 하나에 폴더 하나를 둡니다.',
  'clients/': '웹 · 모바일 · 데스크톱 앱과 공통 API 클라이언트를 둡니다.',
  'docker/': 'Postgres 와 전체 스택의 실행 환경을 모읍니다.',
  'docs/': '구조 · 계약 · 테스트 · 개발 규칙과 작업 절차, 설계 결정을 기록합니다.',
  '.github/': 'CI 워크플로와 PR 템플릿을 둡니다.',
  '.agents/skills/': '에이전트의 리뷰 · 검증 · 테스트 절차를 둡니다.',
  '.claude/': '에이전트 설정과 편집 hook 을 둡니다.',
  'DESIGN.md': '색 · 글자 · 간격 · 컴포넌트의 기준입니다.',
  'pnpm-workspace.yaml': '패키지 목록 · 의존성 카탈로그 · 설치 정책을 관리합니다.',
  'tsconfig.base.json': 'TypeScript 패키지가 공유하는 설정입니다.',
  'packages/client/': '각 앱이 서버의 타입으로 API 를 호출하는 공통 클라이언트입니다.',
  '.oxlintrc.json · .oxfmtrc.json': '클라이언트 앱과 패키지가 공유하는 린트 · 포맷 설정입니다.',
  'nginx.conf.template': '정적 웹 파일을 제공하고 /api 요청을 서버로 전달합니다.',
  'docker-compose.middleware.yaml': '개발 · 테스트 · CI 가 함께 사용하는 Postgres 를 실행합니다.',
  'docker-compose.yaml': '서버 · 웹 앱 이미지와 공통 인프라를 함께 실행합니다.',
  'postgres/init.sql': '서버마다 개발 DB 와 테스트 DB 를 만듭니다. 볼륨을 처음 만들 때 실행됩니다.',
  'smoke.sh': '전체 스택의 API · 웹 화면 · 프록시 연결을 확인합니다.',
  '.env.example': 'docker/.env 로 복사해 DB 와 서버의 포트를 설정합니다.',
}

export function parseTree(source) {
  const lines = source.trim().split('\n')
  const root = { name: lines[0].trim(), children: [] }
  const stack = [root]
  for (const line of lines.slice(1)) {
    const match = line.match(/^((?:│   |    )*)(?:├── |└── )(.*)$/u)
    if (!match) continue
    const depth = match[1].length / 4
    if (!stack[depth]) return null
    const [name, ...comment] = match[2].split(/\s+#\s*/)
    // 설명: 정해 둔 역할 → 없으면 트리의 주석. 주석이 `역할 — 기술 · 버전` 이면 역할만 (버전 목록은 금방 낡는다)
    const node = { name: name.trim(), description: folderRoles[name.trim()] ?? comment.join(' # ').replace(/`/g, '').split(' — ')[0].trim(), children: [] }
    stack.length = depth + 1
    stack[depth].children.push(node)
    stack.push(node)
  }
  return root
}

// 연필로 그린 폴더: 뒤판은 옅은 선, 앞판은 선 + 옅은 칠
const folderIcon = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" aria-hidden="true"><path d="M3 5a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v11H3z" opacity=".55"/><path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" fill="currentColor" fill-opacity=".18"/></svg>'
const fileIcon = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M6 3h8l4 4v14H6zM14 3v5h4M9 12h6M9 16h6"/></svg>'

function renderTree(source) {
  const tree = parseTree(source)
  if (!tree?.children.length) return null
  const renderNodes = (nodes, parent = tree.name) => nodes.map((node) => {
    const path = `${parent}${parent.endsWith('/') ? '' : '/'}${node.name}`
    const attributes = `data-tree-path="${escape(path)}" data-tree-description="${escape(node.description || '이 폴더에서 해당 기능을 관리합니다.')}"`
    const label = `${node.children.length || node.name.endsWith('/') ? folderIcon : fileIcon}<span>${escape(node.name)}</span>`
    return node.children.length
      ? `<li><details class="di-tree-folder"><summary ${attributes}>${label}<span class="di-chevron" aria-hidden="true">›</span></summary><ul>${renderNodes(node.children, path)}</ul></details></li>`
      : `<li><button class="di-tree-file" type="button" ${attributes}>${label}</button><span class="di-static-description">${escape(node.description)}</span></li>`
  }).join('')
  const primary = tree.children.filter((node) => ['contract/', 'servers/', 'clients/', 'docker/', 'docs/'].includes(node.name))
  const extra = tree.children.filter((node) => !primary.includes(node))
  const nodes = tree.name === 'template/'
    ? `${renderNodes(primary)}<li><details class="di-tree-folder di-tools"><summary>${folderIcon}<span>자동화 · 설정</span><span class="di-chevron" aria-hidden="true">›</span></summary><ul>${renderNodes(extra)}</ul></details></li>`
    : renderNodes(tree.children)
  return `<section class="doc-diagram di-tree" data-doc-tree aria-label="${escape(tree.name)} 폴더 구조"><div class="di-heading"><span class="di-root">${folderIcon}${escape(tree.name)}</span><span class="di-heading-caption">폴더 구조</span></div><div class="di-tree-layout"><ul class="di-tree-list">${nodes}</ul><div class="di-tree-inspector" data-tree-inspector hidden><span class="di-inspector-label">선택한 경로</span><code data-tree-selected-path></code><p data-tree-selected-description></p></div></div></section>`
}

function renderFlow(kind) {
  const flow = flows[kind]
  const steps = flow.steps.map(([label, caption, description], index) => `<li><button type="button" class="di-step" data-di-step="${index}" data-di-description="${escape(description)}" ${index === 0 ? 'aria-current="step"' : ''}><span class="di-step-index">${String(index + 1).padStart(2, '0')}</span><span class="di-step-name">${escape(label)}</span><span class="di-step-caption">${escape(caption)}</span></button></li>`).join('')
  const branches = flow.branches ? `<div class="di-branches" data-branch-step="${flow.branchStep}">${flow.branches.map(([label, target, caption]) => `<div><span class="di-branch-source">${escape(label)}</span><span class="di-branch-arrow" aria-hidden="true">↓</span><strong>${escape(target)}</strong><span>${escape(caption)}</span></div>`).join('')}</div>` : ''
  const fallback = `<noscript><ol class="di-static-steps">${flow.steps.map(([label, , description]) => `<li><strong>${escape(label)}</strong> ${escape(description)}</li>`).join('')}</ol></noscript>`
  return `<section class="doc-diagram di-flow" data-doc-flow data-step="0" data-count="${flow.steps.length}" aria-label="${escape(flow.title)}"><div class="di-heading"><span>${escape(flow.title)}</span><button type="button" class="di-play" data-di-play hidden>흐름 재생</button></div><ol class="di-route" style="--di-steps:${flow.steps.length}">${steps}</ol>${branches}<div class="di-step-description"><span data-di-progress>1 / ${flow.steps.length}</span><p data-di-detail>${escape(flow.steps[0][2])}</p></div><p class="di-note">${escape(flow.note)}</p>${fallback}</section>`
}

// ── 화살표 흐름도 ─────────────────────────────────────────────────────────────
// 한 줄: `A ──라벨──▶ B ──▶ /경로 → C   메모`. 화살표마다 이음 하나, `/경로 → C` 의 경로는 그 이음의 라벨에 붙는다.
// `├──▶` · `└──▶` 로 시작하는 줄은 위 줄들에서 그 열(또는 그 왼쪽)에 가장 가까이 시작한 칸에서 갈라진다.
// 줄 끝의 두 칸 이상 띄운 글(괄호는 벗김)은 그 줄 마지막 이음의 메모. 칸 이름은 괄호 앞(`notes (Node)` → notes).
// `tags · activity` 처럼 이미 있는 칸을 · 로 늘어놓으면 칸마다 이음 하나, 메모도 · 로 나눠 짝짓는다
const ARROW = /[├└]?─+\s*([^─▶]*?)\s*─*▶/g
const WIDE = /[ᄀ-ᅟ⺀-꓏가-힣豈-﫿︰-﹏＀-｠￠-￦]/
// 고정폭 글꼴에서의 열 (한글은 두 칸)
const columnOf = (text, index) => [...text.slice(0, index)].reduce((n, ch) => n + (WIDE.test(ch) ? 2 : 1), 0)
const idOf = (text) => text.replace(/\s*\([^)]*\)\s*$/, '').trim()

function parseGraphLine(raw) {
  let body = raw.replace(/\s+$/, '')
  let note = ''
  const tail = body.match(/^(.*\S)\s{2,}(\S.*)$/)
  if (tail && !/[─▶→]/.test(tail[2])) {
    body = tail[1]
    note = tail[2].replace(/^\((.*)\)$/, '$1')
  }
  const branchAt = Math.max(body.lastIndexOf('├─'), body.lastIndexOf('└─'))
  const start = branchAt >= 0 ? branchAt : body.search(/\S/)
  const chain = body.slice(start)
  // texts[i] 다음에 labels[i] 화살표, 마지막 글자 뒤에는 화살표가 없다
  const texts = []
  const labels = []
  let last = 0
  for (const arrow of chain.matchAll(ARROW)) {
    texts.push({ text: chain.slice(last, arrow.index), at: start + last })
    labels.push(arrow[1].trim())
    last = arrow.index + arrow[0].length
  }
  texts.push({ text: chain.slice(last), at: start + last })
  return { body, note, labels, texts, branchColumn: branchAt >= 0 ? columnOf(body, branchAt) : null }
}

export function parseGraph(source) {
  const lines = source.split('\n').map(parseGraphLine).filter((line) => line.labels.length)
  if (!lines.length) return null
  const plain = new Set()
  for (const line of lines) for (const { text } of line.texts) if (!text.includes(' · ')) plain.add(idOf(text.split('→').pop()))
  const nodes = new Map()
  const edges = []
  const placed = [] // { line, column, id }: 갈라지는 줄이 찾는 칸의 자리
  const node = (text) => {
    const label = text.trim()
    const id = idOf(label)
    const known = nodes.get(id)
    if (!known) nodes.set(id, { id, label })
    else if (label.length > known.label.length) known.label = label // 처음 나온 곳이 짧아도 (Node) 같은 설명을 살린다
    return id
  }
  const place = (lineIndex, body, at, text, id) => placed.push({ line: lineIndex, column: columnOf(body, at + text.indexOf(text.trim())), id })

  for (const [index, line] of lines.entries()) {
    let from
    if (line.branchColumn !== null) {
      for (let up = index - 1; up >= 0 && from === undefined; up--) {
        const above = placed.filter((p) => p.line === up && p.column <= line.branchColumn)
        if (above.length) from = above.reduce((a, b) => (b.column > a.column ? b : a)).id
      }
      if (from === undefined) return null
    } else {
      const first = line.texts[0]
      if (!first.text.trim()) return null
      from = node(first.text)
      place(index, line.body, first.at, first.text, from)
    }
    let made = []
    for (const [step, arrowLabel] of line.labels.entries()) {
      const { text, at } = line.texts[step + 1]
      const [route, target] = text.includes('→') ? text.split('→').map((part) => part.trim()) : ['', text.trim()]
      if (!target) return null
      const label = [arrowLabel, route].filter(Boolean).join(' ')
      const targets = target.includes(' · ') && target.split(' · ').every((t) => plain.has(idOf(t))) ? target.split(' · ') : [target]
      const ids = targets.map(node)
      made = ids.map((to) => ({ from, to, label, note: '' }))
      edges.push(...made)
      const shown = text.includes('→') ? text.slice(text.indexOf('→') + 1) : text
      place(index, line.body, at + (text.length - shown.length), shown, ids[0])
      from = ids[0]
    }
    if (line.note) {
      const notes = line.note.split(' · ')
      made.forEach((edge, i) => (edge.note = made.length > 1 && notes.length === made.length ? notes[i] : line.note))
    }
  }
  if (edges.length < 2) return null

  // 단: 들어오는 이음을 따라 가장 긴 길. 고리가 있으면 그리지 않는다
  const rank = new Map()
  const visiting = new Set()
  const rankOf = (id) => {
    if (rank.has(id)) return rank.get(id)
    if (visiting.has(id)) throw new Error('cycle')
    visiting.add(id)
    const from = edges.filter((e) => e.to === id).map((e) => rankOf(e.from) + 1)
    visiting.delete(id)
    rank.set(id, Math.max(0, ...from))
    return rank.get(id)
  }
  try {
    for (const id of nodes.keys()) rankOf(id)
  } catch {
    return null
  }
  return { nodes: [...nodes.values()].map((n) => ({ ...n, rank: rank.get(n.id) })), edges }
}

// 칸은 단마다 한 줄(서버 마크업), 이음 · 라벨은 화면에서 칸의 자리를 재서 그린다(DocumentDiagrams.astro).
// 라벨의 . / 뒤에는 줄바꿈 자리(<wbr>)를 둔다: 좁은 그림에서 TagService.Suggest 가 낱말 가운데서 끊기지 않게
// 스크립트가 없으면 칸과 이음 목록이 보인다
function renderGraph(source) {
  const graph = parseGraph(source)
  if (!graph) return null
  const ranks = []
  for (const n of graph.nodes) (ranks[n.rank] ??= []).push(n)
  const cols = Math.max(...ranks.map((r) => r.length))
  const name = (label) => [idOf(label), label.match(/\(([^)]*)\)\s*$/)?.[1] ?? '']
  const nodesHtml = ranks.flatMap((row, r) => row.map((n, j) => {
    const [title, sub] = name(n.label)
    const column = row.length === 1 ? '1 / -1' : `${j + 1}` // 혼자인 칸은 가운데
    return `<div class="di-node" data-node="${escape(n.id)}" style="grid-row:${r + 1};grid-column:${column}"><strong>${escape(title)}</strong>${sub ? `<span>${escape(sub)}</span>` : ''}</div>`
  })).join('')
  const nameOf = (id) => idOf(graph.nodes.find((n) => n.id === id).label)
  const edgesHtml = graph.edges.map((e) => `<li data-from="${escape(e.from)}" data-to="${escape(e.to)}"${/^grpc/i.test(e.label) ? ' data-kind="grpc"' : ''}><span class="di-edge-route">${escape(nameOf(e.from))} → ${escape(nameOf(e.to))}</span>${e.label ? ` <span class="di-edge-label">${escape(e.label).replace(/([./])(?=\w)/g, '$1<wbr>')}</span>` : ''}${e.note ? ` <span class="di-edge-note">${escape(e.note)}</span>` : ''}</li>`).join('')
  return `<section class="doc-diagram di-graph" data-doc-graph aria-label="흐름도"><div class="di-graph-board" style="--di-cols:${cols}">${nodesHtml}<svg class="di-graph-lines" aria-hidden="true"></svg></div><ol class="di-graph-edges">${edgesHtml}</ol></section>`
}

export function renderCodeDiagram(source, language = '') {
  if (language && !['text', 'plaintext'].includes(language)) return null
  // 정해 둔 흐름(테스트 · 계약 · 레이어) → 화살표(▶) 흐름도 → 폴더 트리. 흐름도도 ├ └ 를 쓰므로 트리보다 먼저 본다
  if (source.includes('HTTP · gRPC') && source.includes('Fake')) return renderFlow('testing')
  if (source.includes('서버 코드') && source.includes('pnpm gen')) return renderFlow('contracts')
  if (source.includes('api (') && source.includes('domain (') && source.includes('support:')) return renderFlow('layers')
  if (source.includes('▶')) return renderGraph(source)
  if (/[├└]──/.test(source)) return renderTree(source)
  return null
}

// 화면에 표시할 때만 변환한다. 원문과 복사용 Markdown 은 동기화한 문서 그대로 둔다.
export const documentDiagrams = {
  name: 'document-diagrams',
  code(node) {
    const html = renderCodeDiagram(node.value, node.lang ?? '')
    if (html) return { raw: html, mdxExpressions: false }
  },
}
