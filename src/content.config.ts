import { defineCollection } from 'astro:content'
import { glob } from 'astro/loaders'

// id = 파일 경로 그대로 (a/index.md 는 a). 주소가 곧 파일 위치다. 맨 위 index.md 는 빈 id 를 쓸 수 없어 index
const generateId = ({ entry }: { entry: string }) => entry.replace(/\.mdx?$/, '').replace(/\/index$/, '')

export const collections = {
  // 이 저장소에서 쓰는 페이지
  docs: defineCollection({ loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/docs', generateId }) }),
  // 템플릿 문서의 사본 (scripts/sync.mjs, gitignore). 폴더가 곧 주소다: /guides/... · /reference/...
  template: defineCollection({ loader: glob({ pattern: '**/*.md', base: './src/content/template', generateId }) }),
}
