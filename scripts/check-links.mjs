// astro build 뒤: dist 의 모든 HTML 에서 사이트 안 링크(href · src)가 실제 파일과 #id 를 가리키는지 본다. 하나라도 없으면 실패
// 페이지 주소는 끝이 / 여야 한다 (trailingSlash: 'always' 라 / 없는 주소는 개발 서버에서 404)
import { existsSync, readdirSync, readFileSync } from 'node:fs'

const dist = 'dist'
const html = new Map(
  readdirSync(dist, { recursive: true })
    .filter((f) => f.endsWith('.html'))
    .map((f) => [f, readFileSync(`${dist}/${f}`, 'utf8')]),
)
const unescape = (s) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
const ids = new Map()
const idsOf = (file) => {
  if (!ids.has(file)) ids.set(file, new Set([...html.get(file).matchAll(/\sid="([^"]+)"/g)].map((m) => unescape(m[1]))))
  return ids.get(file)
}

const problems = []
for (const [file, text] of html) {
  const page = `/${file.replace(/index\.html$/, '')}`
  for (const [, raw] of text.matchAll(/\s(?:href|src)="([^"]*)"/g)) {
    const link = unescape(raw)
    if (/^([a-z]+:|\/\/)/i.test(link)) continue // https: · mailto: · data:
    if (link.startsWith('/pagefind/')) continue // 검색 색인 (pagefind 가 만든다)
    const url = new URL(link, `http://site${page}`)
    const path = decodeURIComponent(url.pathname)
    const hash = decodeURIComponent(url.hash.slice(1))
    let target
    if (path.endsWith('/')) target = `${path.slice(1)}index.html`
    else if (path.split('/').pop().includes('.')) target = path.slice(1) // 파일 (css · svg · png)
    else {
      problems.push(`${page} → ${link}: 끝에 / 가 없다`)
      continue
    }
    if (!existsSync(`${dist}/${target}`)) {
      problems.push(`${page} → ${link}: 없는 주소`)
      continue
    }
    if (hash && target.endsWith('.html') && !idsOf(target).has(hash)) problems.push(`${page} → ${link}: #${hash} 가 없다`)
  }
}

if (problems.length) {
  console.error(`깨진 링크 ${problems.length}개:\n  ${problems.join('\n  ')}`)
  process.exit(1)
}
console.log(`링크 확인: HTML ${html.size}개`)
