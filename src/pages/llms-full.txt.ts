// /llms-full.txt: 모든 페이지의 마크다운 원문을 사이드바 순서로 이어 붙인다. 페이지마다 원래 주소를 앞에 둔다
import type { APIRoute } from 'astro'
import { getCollection } from 'astro:content'
import { plainMarkdown } from '../lib/plain-markdown'
import { pagesOf, tabs } from '../sidebar'

export const GET: APIRoute = async ({ site }) => {
  const entries = [...(await getCollection('docs')), ...(await getCollection('template'))]
  const links = [...new Set(tabs.flatMap(pagesOf).map((p) => p.link))]
  const pages = links.flatMap((link) => {
    const entry = entries.find((e) => `/${e.id}/` === link)
    return entry ? [`Source: ${new URL(link, site)}\n\n${plainMarkdown(entry.body).trim()}`] : []
  })
  return new Response(`${pages.join('\n\n---\n\n')}\n`, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}
