// 템플릿의 문서를 src/content/template/ 로 옮긴다. 원본은 템플릿 하나라 여기서 고치지 않는다
//   docs/concepts · docs/guides → /concepts/... · /guides/... (가이드 탭), 나머지 docs/ · DESIGN.md · 서버 · 앱의 AGENTS.md → /reference/...
// template/ 은 initializer-stack/template 의 git submodule (올리려면 git submodule update --remote template)
// 커밋 전의 템플릿을 미리 보려면 TEMPLATE=<템플릿 폴더> pnpm dev
// 옮긴 문서끼리의 링크는 이 사이트 주소로, 나머지 템플릿 파일을 가리키는 링크는 GitHub 의 같은 커밋 파일로 바꾼다
import { execFileSync } from 'node:child_process'
import { existsSync, globSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, posix } from 'node:path'

const root = process.env.TEMPLATE ?? 'template'
const out = 'src/content/template'
if (!existsSync(`${root}/docs`)) {
  console.error(`${root}/docs 가 없다. git submodule update --init 을 먼저 돌린다`)
  process.exit(1)
}

// 템플릿이 가리키는 커밋 (없으면 main)
let ref = 'main'
try {
  ref = execFileSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
} catch {}
const github = `https://github.com/initializer-stack/template/blob/${ref}/`

/** 템플릿 파일 → 이 사이트 주소 (사이트에 없는 파일이면 undefined). README.md 는 그 폴더의 첫 페이지다 */
function site(path) {
  if (path === 'DESIGN.md') return '/reference/design/'
  const agents = path.match(/^(servers|clients\/apps)\/([^/]+)\/AGENTS\.md$/)
  if (agents) return `/reference/${agents[1] === 'servers' ? 'servers' : 'apps'}/${agents[2]}/`
  if (!path.startsWith('docs/') || !path.endsWith('.md')) return undefined
  const rest = path.slice('docs/'.length).replace(/(^|\/)README\.md$/, '$1').replace(/\.md$/, '/')
  return /^(concepts|guides)\//.test(rest) ? `/${rest}` : `/reference/${rest}`
}

function rewrite(text, file) {
  return text.replace(/\]\(([^)\s#]+)(#[^)\s]*)?\)/g, (link, path, hash = '') => {
    if (/^[a-z]+:/.test(path) || path.startsWith('/')) return link
    let target = posix.normalize(posix.join(dirname(file), path))
    if (target.startsWith('docs/') && target.endsWith('/')) target += 'README.md'
    return `](${site(target) ?? github + target}${hash})`
  })
}

if (process.argv[2] !== '--check') {
  const files = [
    ...globSync('docs/**/*.md', { cwd: root }),
    'DESIGN.md',
    ...globSync(['servers/*/AGENTS.md', 'clients/apps/*/AGENTS.md'], { cwd: root }),
  ]
  rmSync(out, { recursive: true, force: true })
  for (const file of files) {
    let text = readFileSync(`${root}/${file}`, 'utf8')
    // DESIGN.md 앞의 YAML(토큰)은 페이지에 보이도록 끝의 코드 블록으로 옮긴다
    if (file === 'DESIGN.md') {
      const [, tokens, body] = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
      text = `${body.trim()}\n\n## Tokens\n\n\`\`\`yaml\n${tokens}\n\`\`\`\n`
    }
    // 주소 그대로의 폴더에 둔다 (id = 주소). source 는 GitHub 에서 고치는 곳
    const dest = `${out}${site(file)}index.md`
    mkdirSync(dirname(dest), { recursive: true })
    writeFileSync(dest, `---\nsource: ${file}\n---\n${rewrite(text, file)}`)
  }
  console.log(`${out}/ ← ${root} 문서 ${files.length}개 (${ref})`)
} else {
  // node scripts/sync.mjs --check: 주소 · 링크 바꾸기 규칙 확인
  const { equal } = await import('node:assert/strict')
  equal(site('docs/README.md'), '/reference/')
  equal(site('docs/decisions/README.md'), '/reference/decisions/')
  equal(site('docs/guides/add-app.md'), '/guides/add-app/')
  equal(site('docs/concepts/testing.md'), '/concepts/testing/')
  equal(site('servers/notes/AGENTS.md'), '/reference/servers/notes/')
  equal(site('clients/apps/web/AGENTS.md'), '/reference/apps/web/')
  equal(site('servers/notes/src/main.ts'), undefined)
  equal(rewrite('[a](contracts.md#x)', 'docs/README.md'), '[a](/reference/contracts/#x)')
  equal(rewrite('[a](decisions/)', 'docs/README.md'), '[a](/reference/decisions/)')
  equal(rewrite('[a](../testing.md)', 'docs/guides/add-endpoint.md'), '[a](/reference/testing/)')
  equal(rewrite('[a](add-app.md)', 'docs/guides/add-server.md'), '[a](/guides/add-app/)')
  equal(rewrite('[a](../../DESIGN.md)', 'docs/guides/add-app.md'), '[a](/reference/design/)')
  equal(rewrite('[a](../../servers/activity/AGENTS.md)', 'docs/guides/add-endpoint.md'), '[a](/reference/servers/activity/)')
  equal(rewrite('[a](../package.json)', 'docs/development.md'), `[a](${github}package.json)`)
  equal(rewrite('[a](https://x.dev/a.md)', 'docs/README.md'), '[a](https://x.dev/a.md)')
  console.log('ok')
}
