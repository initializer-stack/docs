// 랜딩 손글씨(개구쟁이체 Gaegu, SIL OFL)를 랜딩에 쓰는 글자만 뽑아 public/fonts 에 둔다.
// 랜딩 문구를 바꾼 뒤: pnpm build && node scripts/sketch-font.mjs   (구글 폰트에서 그 글자만 받는다. 다시 pnpm build)
// --check: dist/index.html 에 받아 둔 글자 밖의 글자가 있으면 실패한다 (pnpm build 가 돌린다)
import { readFileSync, writeFileSync } from 'node:fs'

const list = 'public/fonts/sketch.txt'
const html = readFileSync('dist/index.html', 'utf8')
const text = html
  .replace(/<(script|style)[\s\S]*?<\/\1>/g, ' ')
  .replace(/data-chapter="([^"]*)"/g, '>$1<') // 장면 모서리의 그림 이름(FIG. 01 — …)은 스크립트가 이 값으로 쓴다
  .replace(/<[^>]*>/g, ' ')
  .replace(/&[a-z0-9#]+;/gi, ' ')
const ascii = Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i)).join('')
const chars = [...new Set(ascii + '—·→' + text.replace(/\s+/g, ''))].sort().join('')

if (process.argv.includes('--check')) {
  const have = new Set(readFileSync(list, 'utf8'))
  const missing = [...new Set(chars)].filter((c) => !have.has(c))
  if (missing.length) {
    console.error(`랜딩 손글씨에 없는 글자 ${missing.length}개: ${missing.join('')}\n→ node scripts/sketch-font.mjs 로 다시 받는다`)
    process.exit(1)
  }
  console.log(`랜딩 손글씨: 글자 ${have.size}개`)
} else {
  // 브라우저처럼 물어야 woff2 를 준다
  const headers = { 'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36' }
  for (const weight of [400, 700]) {
    const css = await (await fetch(`https://fonts.googleapis.com/css2?family=Gaegu:wght@${weight}&text=${encodeURIComponent(chars)}`, { headers })).text()
    const url = css.match(/url\((https:[^)]+)\)/)?.[1]
    if (!url) throw new Error(`글꼴 주소가 없다:\n${css}`)
    const font = Buffer.from(await (await fetch(url)).arrayBuffer())
    writeFileSync(`public/fonts/sketch-${weight}.woff2`, font)
    console.log(`sketch-${weight}.woff2 ${(font.length / 1024).toFixed(1)}KB`)
  }
  writeFileSync(list, chars)
  console.log(`글자 ${chars.length}개`)
}
