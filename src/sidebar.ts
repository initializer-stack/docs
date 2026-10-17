// 탭 · 사이드바 · 이전/다음 순서. 주소는 끝에 /
// 템플릿 문서(scripts/sync.mjs): docs/concepts · docs/guides 는 가이드 탭, 나머지 docs/ · DESIGN.md · 서버 · 앱 AGENTS.md 는 레퍼런스 탭
import { getCollection } from 'astro:content'

export type Link = { label: string; link: string }
export type Group = { label: string; items: Link[] }
export type Tab = { label: string; link: string; groups: Group[] }

const template = await getCollection('template')
/** 그 폴더와 아래의 템플릿 문서 (id 순) */
const under = (dir: string) =>
  template.filter((e) => e.id === dir || e.id.startsWith(`${dir}/`)).sort((a, b) => a.id.localeCompare(b.id))

// 결정(ADR)은 템플릿에 있는 파일 그대로: 목록 · 번호 순 · 템플릿. 이름은 각 문서의 # 줄 ("0001. …" → "0001 · …")
const adr = under('reference/decisions').map((e) => ({
  id: e.id,
  label: (e.body?.match(/^# (.+)$/m)?.[1] ?? e.id).replace(/^(\d{4})\. /, '$1 · '),
  link: `/${e.id}/`,
}))
// 서버 · 앱은 폴더 이름 그대로 (servers/notes/AGENTS.md → notes)
const folders = (dir: string) => under(dir).map((e) => ({ label: e.id.slice(dir.length + 1), link: `/${e.id}/` }))

export const tabs: Tab[] = [
  {
    label: '가이드',
    link: '/introduction/',
    groups: [
      { label: '소개', items: [{ label: 'iStack 소개', link: '/introduction/' }] },
      {
        label: '시작하기',
        items: [
          { label: '템플릿으로 저장소 만들기', link: '/getting-started/' },
          { label: '처음 실행하기', link: '/getting-started/first-run/' },
          { label: 'AI 와 개발하기', link: '/getting-started/agents/' },
        ],
      },
      {
        label: '이해하기',
        items: [
          { label: '구조는 왜 이렇게 됐나', link: '/concepts/structure/' },
          { label: '테스트는 왜 이렇게 됐나', link: '/concepts/testing/' },
        ],
      },
      {
        label: '엔지니어링 가이드',
        items: [
          { label: '엔드포인트 추가', link: '/guides/add-endpoint/' },
          { label: '계약을 깨뜨려 보기', link: '/guides/contract-lab/' },
          { label: '외부 서비스 실패 테스트', link: '/guides/external-service-lab/' },
          { label: '다른 서버 부르기', link: '/guides/call-server/' },
          { label: '서버 추가', link: '/guides/add-server/' },
          { label: '앱 추가', link: '/guides/add-app/' },
          { label: 'DB 바꾸기', link: '/guides/database/' },
          { label: '인증 붙이기', link: '/guides/auth/' },
        ],
      },
      { label: '문제 해결', items: [{ label: '자주 겪는 문제', link: '/guides/troubleshooting/' }] },
    ],
  },
  {
    label: '레퍼런스',
    link: '/reference/',
    groups: [
      {
        label: '규칙',
        items: [
          { label: '문서 목록', link: '/reference/' },
          { label: '구조', link: '/reference/architecture/' },
          { label: '계약', link: '/reference/contracts/' },
          { label: '같은 일, 네 언어', link: '/reference/languages/' },
          { label: '테스트', link: '/reference/testing/' },
          { label: '개발', link: '/reference/development/' },
        ],
      },
      { label: '디자인', items: [{ label: 'DESIGN.md', link: '/reference/design/' }] },
      { label: '서버', items: folders('reference/servers') },
      { label: '앱', items: folders('reference/apps') },
      {
        label: '결정 (ADR)',
        items: [
          ...adr.filter((d) => d.id === 'reference/decisions').map((d) => ({ label: '목록', link: d.link })),
          ...adr.filter((d) => /^reference\/decisions\/\d/.test(d.id)),
          ...adr.filter((d) => d.id === 'reference/decisions/template').map((d) => ({ label: '템플릿', link: d.link })),
        ],
      },
    ],
  },
  {
    label: '블로그',
    link: '/blog/spring-api-tests/',
    groups: [{ label: '글', items: [{ label: 'Spring API 통합 테스트의 실행 경계와 Fake', link: '/blog/spring-api-tests/' }] }],
  },
]

/** 이 주소가 든 탭 · 묶음 (없으면 첫 탭) */
export function locate(path: string) {
  for (const tab of tabs)
    for (const group of tab.groups) if (group.items.some((i) => i.link === path)) return { tab, group }
  return { tab: tabs[0], group: undefined }
}

/** 탭 안의 페이지를 위에서 아래로 편 순서 (이전/다음은 탭을 넘지 않는다) */
export const pagesOf = (tab: Tab): Link[] => tab.groups.flatMap((g) => g.items)
