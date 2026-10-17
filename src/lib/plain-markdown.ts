/** 복사 · 마크다운으로 보기에 넘기는 원문: MDX 의 import 줄과 컴포넌트 태그(<RepositoryMap /> 등)는 뺀다 */
export const plainMarkdown = (body = '') => body.replace(/^(import .*|<[A-Z]\w*[^>]*\/>)\n+/gm, '')
