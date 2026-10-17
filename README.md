# iStack 가이드

[iStack — Initializer Stack](https://github.com/initializer-stack/template) 템플릿의 가이드 사이트입니다. Astro 로 만들고 https://stack.initializer.org 에 배포합니다.

```bash
pnpm install
pnpm dev       # http://localhost:4321
pnpm build     # dist/ (깨진 링크가 있거나, 랜딩 손글씨에 없는 글자를 쓰면 실패)
node scripts/sketch-font.mjs  # 랜딩 문구를 바꾼 뒤: 쓰는 글자만 담은 손글씨를 다시 받는다 (pnpm build 다음에)
```

```
src/
├── content/docs/       이 저장소에서 쓰는 페이지: 소개 · 시작하기 (주소 = 파일 위치)
├── content/template/   템플릿 문서의 사본 (scripts/sync.mjs, gitignore, 폴더 = 주소)
├── pages/              랜딩(index.astro) · 문서 페이지([...slug].astro) · 마크다운 원문([...slug].md.ts)
├── layouts/ · components/ · lib/
├── styles/             tokens.css (색 · 글자 · 간격) · prose.css (본문)
└── sidebar.ts          사이드바 · 이전/다음 순서
```

## 템플릿 문서는 템플릿에서

저장소 안에서 일하는 법(규칙 · 가이드 · 설계 결정)은 코드와 같은 PR 에서 고치도록 템플릿에 두고, 여기서는 템플릿을 고르고 시작하는 법만 씁니다.
`template/` 은 템플릿 저장소의 git submodule 이고, `pnpm dev` · `pnpm build` 가 먼저 `scripts/sync.mjs` 로 템플릿 문서를 옮기며 링크를 이 사이트 주소로 바꿉니다.

| 템플릿 | 사이트 |
|---|---|
| `docs/concepts/*.md` · `docs/guides/*.md` | `/concepts/...` · `/guides/...` (가이드 탭) |
| 나머지 `docs/**`, `DESIGN.md` | `/reference/...` |
| `servers/*/AGENTS.md` · `clients/apps/*/AGENTS.md` | `/reference/servers/...` · `/reference/apps/...` |

```bash
git submodule update --init            # 처음 clone 한 뒤
git submodule update --remote template # 템플릿의 최신 문서로 올릴 때 (바뀐 커밋을 함께 커밋한다)
node scripts/sync.mjs --check          # 주소 · 링크 바꾸기 규칙 확인
TEMPLATE=../initializer-stack pnpm dev  # 커밋 전의 템플릿 문서를 미리 볼 때
```

템플릿에서 온 페이지의 "GitHub 에서 고치기" 는 템플릿 저장소의 원본으로 갑니다. 새 페이지는 `src/content/docs/` 에 쓰고 `src/sidebar.ts` 에 더합니다.

설명용 폴더 트리, 테스트 · 계약 · 레이어 흐름, 화살표(`──라벨──▶`)로 그린 서버 흐름은 렌더링할 때 시각화합니다(화살표 흐름은 연필 흐름도). 변환 규칙은 `src/lib/document-diagrams.mjs`, 스타일과 모션은 `src/components/DocumentDiagrams.astro` 에 있습니다.
동기화된 Markdown 과 페이지 복사에는 원문을 사용합니다. 변환 검사는 `node --test scripts/check-diagrams.test.mjs` 로 실행합니다.
변환 규칙을 바꾸면 그린 결과가 콘텐츠 캐시에 남아 있으니 `.astro/data-store.json` · `node_modules/.astro/data-store.json` 을 지우고 다시 띄운다.

## 로고 · 공유 이미지

`public/` 의 그림은 모두 연필 스케치다. `favicon.svg` · `logo.svg` 는 같은 그림(화면비만 다름)이고, PNG 는 SVG 를 찍은 것이다.

| 파일 | 쓰는 곳 | 원본 |
|---|---|---|
| `favicon.svg` | 탭 아이콘 | 직접 |
| `logo.svg` | 머리글 · 사이드바 로고 | `favicon.svg` 와 같은 그림 |
| `logo.png` (640×720) | 사이트 밖에서 쓰는 로고 | `logo.svg` 를 선만 가늘게 해 2배로 |
| `banner.png` (1280×640) | 링크 공유 이미지(og:image) | `banner.svg` |

`banner.svg` 는 사이트의 손글씨(`/fonts`)를 쓰므로 `pnpm dev` 에서 `/banner.svg` 를 열어 1280×640 으로 찍어 저장한다.

## 배포

`main` 에 push 하면 `.github/workflows/deploy.yml` 이 빌드해 GitHub Pages 로 올립니다. PR 에서는 빌드만 합니다.
저장소 Settings → Pages 에서 Source 를 GitHub Actions 로, 사용자 지정 도메인을 `stack.initializer.org` 로 둡니다
(DNS 는 `initializer-stack.github.io` 로 가는 CNAME).

## License

[Apache License 2.0](LICENSE)
