import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { documentDiagrams, parseGraph, parseTree, renderCodeDiagram } from '../src/lib/document-diagrams.mjs'

const require = createRequire(import.meta.resolve('@astrojs/markdown-satteri'))
const { markdownToHtml } = await import(require.resolve('satteri'))
const render = async (source) => (await markdownToHtml(source, { mdastPlugins: [documentDiagrams] })).html

test('nested folders keep their paths and describe roles without version lists', () => {
  const source = 'template/\n├── servers/\n│   ├── activity/ # 활동 기록 — Spring Boot 4.1 · Java 25\n│   └── tags/ # 태그 규칙 · 태그 매기기 — FastAPI · Python 3.12 · uv\n└── docs/ # 규칙과 설계 결정'
  const tree = parseTree(source)
  assert.deepEqual(tree.children[0].children.map((node) => node.name), ['activity/', 'tags/'])
  assert.equal(tree.children[1].name, 'docs/')
  assert.deepEqual(tree.children[0].children.map((node) => node.description), ['활동 기록', '태그 규칙 · 태그 매기기'])
  const html = renderCodeDiagram(source)
  assert.match(html, /data-tree-path="template\/servers\/activity\/"/)
  assert.doesNotMatch(html, /Boot 4\.1|Java 25|Python 3\.12/)
})

test('code and commands keep their original code blocks', async () => {
  for (const language of ['bash', 'ts', 'sql', 'yaml']) {
    const source = `\`\`\`${language}\ntemplate/\n└── example/\n\`\`\``
    const html = await render(source)
    assert.match(html, /<pre><code/)
    assert.doesNotMatch(html, /data-doc-tree/)
  }
  assert.equal(renderCodeDiagram('pnpm install\npnpm dev'), null)
})

test('tree text is escaped before being rendered as HTML', async () => {
  const source = '```\nroot/\n└── <img src=x onerror=alert(1)> # "quoted" & literal\n```'
  const html = await render(source)
  assert.doesNotMatch(html, /<img\b|<script\b/)
  assert.match(html, /&lt;img/)
  assert.match(html, /&quot;quoted&quot; &amp; literal/)
})

test('unrecognized text and malformed trees remain readable code', async () => {
  assert.equal(renderCodeDiagram('root/\n│   └── missing-parent/'), null)
  const html = await render('```\nA → B\n```')
  assert.match(html, /<pre><code>A → B/)
})

test('reference diagrams render through the real Markdown processor', async () => {
  const expected = { architecture: [1, 1], development: [1, 0], contracts: [0, 1], testing: [0, 1] }
  for (const [file, [trees, flows]] of Object.entries(expected)) {
    const source = readFileSync(new URL(`../src/content/template/reference/${file}/index.md`, import.meta.url), 'utf8')
    const html = await render(source)
    assert.equal((html.match(/<section class="doc-diagram di-tree"/g) ?? []).length, trees, file)
    assert.equal((html.match(/<section class="doc-diagram di-flow"/g) ?? []).length, flows, file)
    assert.doesNotMatch(html.replace(/<pre\b[\s\S]*?<\/pre>/g, ''), /├──|└──/)
  }
})

test('test boundaries keep the real database and Fake as separate branches', async () => {
  const source = readFileSync(new URL('../src/content/template/reference/testing/index.md', import.meta.url), 'utf8')
  const html = await render(source)
  assert.match(html, /data-branch-step="3"/)
  assert.match(html, /<strong>테스트 DB<\/strong>/)
  assert.match(html, /<strong>Fake<\/strong>/)
  assert.match(html, /gRPC 오류는 해당 status/)
  assert.match(source, /HTTP · gRPC → 서버\(랜덤 포트\)/)
  assert.doesNotMatch(source, /data-doc-flow/)
})


const servers = [
  'admin (Vue) ──▶ tags (태그 규칙 · FastAPI)',
  '  ├──▶ activity (활동 기록 · Spring)',
  '  └──▶ templates (템플릿 · Go)',
  'web (React) ──▶ templates',
  '  └──▶ notes (메모 · Node)',
  'site (Next) ──▶ notes',
  'lite (순수 TS) ──▶ notes',
].join('\n')
const serverCalls = [
  'notes (Node) ──gRPC──▶ tags (FastAPI)        저장 전에 태그를 묻는다',
  '  └──gRPC──▶ activity (Spring)               저장 뒤 기록을 남긴다',
].join('\n')
const edgeList = (graph) => graph.edges.map((e) => `${e.from}>${e.to}|${e.label}|${e.note}`)

test('arrow flows become a graph: branches attach to the node above, routes and notes become edge labels', () => {
  // template/docs/architecture.md 의 흐름도 그대로 (sync 한 사본)
  assert.ok(readFileSync(new URL('../src/content/template/reference/architecture/index.md', import.meta.url), 'utf8').includes(servers))
  const graph = parseGraph(servers)
  assert.deepEqual(edgeList(graph), [
    'admin>tags||',
    'admin>activity||',
    'admin>templates||',
    'web>templates||',
    'web>notes||',
    'site>notes||',
    'lite>notes||',
  ])
  // 웹 앱 넷은 한 행, 서버 넷은 그 아래 한 행. 처음 나온 순서가 칸 순서라 선이 상자를 지나지 않는다
  assert.deepEqual(graph.nodes.map((n) => `${n.id}@${n.rank}`), ['admin@0', 'tags@1', 'activity@1', 'templates@1', 'web@0', 'notes@1', 'site@0', 'lite@0'])
  const html = renderCodeDiagram(servers)
  assert.match(html, /data-doc-graph/)
  assert.match(html, /data-node="notes" style="grid-row:2;grid-column:4"><strong>notes<\/strong><span>메모 · Node<\/span>/)
  assert.match(html, /data-node="lite" style="grid-row:1;grid-column:4"><strong>lite<\/strong><span>순수 TS<\/span>/)

  // 같은 문서의 서버끼리 그림: 화살표의 라벨(gRPC)과 줄 끝 메모가 이음의 라벨이 된다
  assert.ok(readFileSync(new URL('../src/content/template/reference/architecture/index.md', import.meta.url), 'utf8').includes(serverCalls))
  assert.deepEqual(edgeList(parseGraph(serverCalls)), ['notes>tags|gRPC|저장 전에 태그를 묻는다', 'notes>activity|gRPC|저장 뒤 기록을 남긴다'])
  assert.match(renderCodeDiagram(serverCalls), /data-from="notes" data-to="tags" data-kind="grpc"/)
})

test('a list of known nodes fans out and pairs its notes', () => {
  const graph = parseGraph([
    'web · site ──HTTP──▶ notes (Node) ──gRPC──▶ tags (FastAPI)',
    'admin ──HTTP──▶ tags · notes                  태그 규칙 · 메모',
  ].join('\n'))
  assert.deepEqual(edgeList(graph).slice(2), ['admin>tags|HTTP|태그 규칙', 'admin>notes|HTTP|메모'])
  assert.equal(graph.nodes[0].id, 'web · site')
})

test('fixed flows win over the arrow graph, and plain arrows without a chain stay code', () => {
  assert.match(renderCodeDiagram('서버 코드 ──(pnpm gen)──▶ contract/openapi/<서버>.json ──▶ <서버>.ts'), /data-doc-flow/)
  assert.equal(renderCodeDiagram('a ──▶ b'), null)
})
