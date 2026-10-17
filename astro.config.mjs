import { defineConfig } from 'astro/config'
import mdx from '@astrojs/mdx'
import { satteri } from '@astrojs/markdown-satteri'
import { documentDiagrams } from './src/lib/document-diagrams.mjs'
import { longTableCode, scrollTables } from './src/lib/markdown-tables.mjs'

// 마크다운의 첫 # 줄은 레이아웃의 제목 칸이 대신 그린다: 숨기고 검색 색인에서도 뺀다 (원본 문서는 # 줄을 그대로 둔다)
// 문서마다 새로 만든다 (첫 줄만 표시하는 상태가 문서끼리 섞이지 않게)
const hideTitle = () => {
  let done = false
  return {
    name: 'hide-title',
    element: {
      filter: ['h1'],
      visit(node, ctx) {
        if (done || ctx.parent(node)?.type !== 'root') return
        done = true
        ctx.setProperty(node, 'hidden', true)
        ctx.setProperty(node, 'dataPagefindIgnore', '')
      },
    },
  }
}

export default defineConfig({
  site: 'https://stack.initializer.org',
  integrations: [mdx()],
  // 페이지 주소는 /getting-started/ 처럼 끝에 / (GitHub Pages 의 폴더 index.html 과 같다)
  trailingSlash: 'always',
  build: { format: 'directory' },
  // 템플릿의 docs/clients.md 는 docs/architecture.md 의 클라이언트 절로 합쳐졌다. 옛 주소로 들어와도 그 절로
  redirects: { '/reference/clients/': '/reference/architecture/#클라이언트' },
  markdown: {
    processor: satteri({ mdastPlugins: [documentDiagrams], hastPlugins: [hideTitle, scrollTables, longTableCode] }),
    // 라이트 · 다크 두 벌을 CSS 변수로만 내보낸다 (--shiki-light · --shiki-dark). 고르는 건 src/styles/prose.css 의 light-dark()
    shikiConfig: { themes: { light: 'github-light', dark: 'github-dark' }, defaultColor: false },
  },
})
