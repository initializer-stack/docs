// 문서마다 마크다운 원문 (/guides/add-app/ → /guides/add-app.md). 페이지 메뉴의 "마크다운으로 보기" · AI 에서 열기가 가리킨다
import type { APIRoute } from 'astro'
import { getCollection } from 'astro:content'
import { plainMarkdown } from '../lib/plain-markdown'

export async function getStaticPaths() {
  const entries = [...(await getCollection('docs')), ...(await getCollection('template'))]
  return entries.map((entry) => ({ params: { slug: entry.id }, props: { body: plainMarkdown(entry.body) } }))
}

export const GET: APIRoute = ({ props }) =>
  new Response(props.body, { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } })
