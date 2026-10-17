// /llms.txt (https://llmstxt.org): 사이드바 순서의 페이지 목록과 원문(.md) 주소. 원문 전체는 /llms-full.txt
import type { APIRoute } from 'astro'
import { getCollection } from 'astro:content'
import { tabs } from '../sidebar'

export const GET: APIRoute = async ({ site }) => {
  const entries = [...(await getCollection('docs')), ...(await getCollection('template'))]
  const line = ({ label, link }: { label: string; link: string }) => {
    const description = entries.find((e) => `/${e.id}/` === link)?.data.description
    return `- [${label}](${new URL(`${link.replace(/\/$/, '')}.md`, site)})${description ? `: ${description}` : ''}`
  }
  const sections = tabs.flatMap((tab) => tab.groups.map((g) => `## ${tab.label} · ${g.label}\n\n${g.items.map(line).join('\n')}`))
  const text = [
    '# iStack',
    '> 여러 언어의 서버 · 클라이언트를 contract/ 하나로 잇는 모노레포 템플릿 iStack 의 가이드입니다. 각 링크는 그 페이지의 마크다운 원문입니다.',
    ...sections,
  ].join('\n\n')
  return new Response(`${text}\n`, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}
