---
description: 에이전트가 이 저장소의 규칙을 따르게 하는 지시 파일 · skill · hook, 도구별 설정, 일을 맡기는 요청과 이 문서를 AI 에 주는 방법입니다.
---

# AI 와 개발하기

에이전트에게 "메모 길이를 돌려주는 API 를 더해 줘"라고 요청하면 동작하는 코드는 금방 나옵니다. 하지만 이 저장소의 규칙을 모르는 에이전트는
`contract/openapi/` 를 손으로 고치거나, 테스트에서 DB 접근을 mock 으로 바꾸거나, 사용자가 띄운 8000 포트 서버에 확인 요청을 보냅니다.
코드는 동작해도 CI 와 리뷰에서 다시 고쳐야 합니다.

그래서 템플릿은 규칙을 세 곳에 둡니다. 에이전트가 읽는 **지시 파일**, 정해진 절차를 묶은 **skill**, 어기면 편집을 막는 **hook** 입니다.

## 지시 파일

- 지시는 `AGENTS.md` 에 씁니다. 같은 폴더의 `CLAUDE.md` 는 그 파일로 가는 심볼릭 링크라 Claude Code 와 다른 도구가 같은 지시를 읽습니다.
  새 `AGENTS.md` 를 만들면 `ln -s AGENTS.md CLAUDE.md`.
- 루트 `AGENTS.md` 에는 저장소 공통 규칙을, 서버 · 앱 폴더의 파일(`servers/<서버>/`, `clients/apps/<앱>/`)에는 그 영역의 구조 · 명령 · 도구 · 테스트 방법을 씁니다.
  지시가 서로 다르면 작업 폴더에서 가장 가까운 `AGENTS.md` 를 따릅니다.
- 채택된 ADR 과 서버 · 앱의 규칙이 다르면 ADR 을 따릅니다. 설계를 바꾸려면 관련 ADR 을 먼저 고칩니다. → [설계 결정](/reference/decisions/)
- 설명과 세부는 `docs/`(이 사이트의 가이드 · 레퍼런스)에 두고 `AGENTS.md` 에 되풀이하지 않습니다.
- 개인 지시는 `CLAUDE.local.md`(gitignore) 나 `~/.claude/CLAUDE.md` 에 둡니다.

## 도구별 설정

`AGENTS.md` 하나를 여러 도구가 읽습니다. 도구마다 다른 점은 아래 표와 목록이 전부입니다.
각 도구의 공식 문서로 2026-10-17 에 확인했고, — 는 문서에서 확인하지 못한 항목입니다.

| 도구 | 지시 파일 | 하위 폴더의 지시 | skill 부르기 | hook |
|---|---|---|---|---|
| [Claude Code](https://code.claude.com/docs/en/memory) | `CLAUDE.md` | 그 폴더의 파일을 열 때 읽음 | `/이름` | 적용 |
| [Codex](https://learn.chatgpt.com/docs/agent-configuration/agents-md) | `AGENTS.md` | 루트부터 작업 폴더까지 이어 붙임 | `$이름` | — |
| [Cursor](https://cursor.com/docs/context/rules) | `AGENTS.md` | 상위와 합치고 하위가 우선 | — | — |
| [VS Code (Copilot)](https://code.visualstudio.com/docs/copilot/customization/custom-instructions) | `AGENTS.md` | 설정을 켜야 읽음 (실험 기능) | `/이름` | — |
| [Gemini CLI](https://geminicli.com/docs/cli/gemini-md/) | `AGENTS.md` (설정 필요) | 다루는 파일의 폴더와 상위를 읽음 | — | — |

skill 을 부르는 도구는 모두 `.agents/skills` 하나를 읽습니다. Codex 는 그 폴더를, Claude Code 는 그 폴더로 가는 링크인 `.claude/skills` 를, VS Code 는 둘 다 읽습니다.

- **Claude Code**: v2.1.277 부터는 `CLAUDE.md` 가 없으면 `AGENTS.md` 를 직접 읽지만, 링크가 있어 그 전 버전도 같은 지시를 읽습니다.
- **VS Code**: 하위 폴더의 `AGENTS.md` 는 `chat.useNestedAgentsMdFiles` 설정을 켜야 읽습니다.
- **Gemini CLI**: 기본으로 `GEMINI.md` 를 읽습니다. `.gemini/settings.json` 에 다음을 두면 `AGENTS.md` 를 읽습니다.

  ```json
  { "context": { "fileName": ["AGENTS.md", "GEMINI.md"] } }
  ```

- **hook** 은 Claude Code 에서만 동작합니다. 다른 도구는 같은 규칙을 루트 `AGENTS.md` 의 문장으로 지킵니다.

## Skills

세 skill 이 `.agents/skills/` 에 있습니다.

| skill | 하는 일 |
|---|---|
| `repo-review` | diff 를 이 저장소 기준(계약 · ADR · 레이어 · 테스트 · 재사용 · 군더더기)으로 보고 P0 ~ P3 로 적습니다 |
| `verify-local` | 바꾼 서버 · 앱을 개발 서버와 겹치지 않는 포트(+100)와 테스트 DB 로 띄워 실제 응답 · 화면 · 콘솔로 확인합니다 |
| `write-specs` | 엔드포인트 · RPC 를 더하거나 바꿀 때 `{METHOD}_specs` 를 쓰고 가장 좁은 테스트부터 돌립니다 |

## Hook

`.claude/hooks/check-patterns.py` 는 편집 전에 다음 변경을 막습니다.

- 생성물 수정 (`contract/openapi`, `contract/gen`, `servers/tags/gen`)
- `main` 에 들어간 Flyway 마이그레이션 수정
- API 문자열을 HTML 로 넣기 (`innerHTML` · `v-html` · `dangerouslySetInnerHTML`)
- 외부 클라이언트를 mock 으로 바꾸기

hook 의 규칙을 바꾸면 `.claude/hooks/check-patterns.test.sh` 로 확인합니다.

## 일을 맡기는 요청

"API 를 더해 줘" 한 줄에는 범위와 완료 기준이 없습니다. 에이전트는 범위를 스스로 정하고, 테스트를 돌리지 않고도 완료라고 보고할 수 있습니다.
요청에는 다음 네 가지를 적습니다.

| 항목 | 적을 것 |
|---|---|
| 목적 | 왜 필요한지. 범위 밖의 판단이 필요할 때 기준이 됩니다 |
| 변경 범위 | 어느 서버 · 앱의 어느 경로까지 바꾸는지, 무엇은 바꾸지 않는지 |
| 완료 기준 | 통과해야 할 `{METHOD}_specs`, 같은 커밋에 들어갈 `pnpm gen` 결과, 확인할 화면 |
| 확인 방법 | 에이전트가 실행할 명령과 사람이 볼 것. 통과 · 실패 · 실행하지 않음을 나눠 보고하게 합니다 |

```text
목적: 메모 화면에 글자 수를 보여 주려고 한다.
변경 범위: notes 서버에 GET /api/notes/{id}/length 를 더하고 web 앱에서 부른다. tags · activity 와 다른 앱은 바꾸지 않는다.
완료 기준: tests/notes/id/length/GET_specs.ts 가 통과하고, 생성된 계약이 같은 커밋에 있다.
확인: pnpm --filter @app/notes test 와 pnpm typecheck 를 실행하고, 화면은 verify-local 로 띄워 확인할 주소를 알려 준다.
실행하지 못한 확인은 이유와 함께 따로 적는다.
```

작업 순서는 [엔드포인트 추가](/guides/add-endpoint/)와 같습니다. 끝나면 `repo-review` 로 diff 를 저장소 기준에 맞춰 봅니다.
여러 서버에 걸치고 사람이 정할 것이 있는 작업은, [인증 붙이기](/guides/auth/)의 요청 예시처럼 결정을 ADR 로 제안하고 멈추게 합니다.

## 개발 서버와 분리된 검증

에이전트는 사람이 띄운 개발 서버를 끄거나 거기에 확인 요청을 보내지 않습니다. 확인용 서버는 개발 서버 포트에 100 을 더한 포트와 테스트 DB 로 띄웁니다.
끝나면 그 포트의 PID 로 찾은 확인용 프로세스와 직접 띄운 컨테이너만 끕니다.

## 이 문서를 AI 에 주기

템플릿으로 만든 저장소 안의 에이전트는 `AGENTS.md` 와 `docs/` 를 직접 읽으므로 따로 넣을 것이 없습니다.
이 사이트는 저장소 밖에서 AI 에 질문할 때 씁니다.

- 페이지마다 제목 옆의 **페이지 복사**로 마크다운 원문을 복사하거나, 그 옆 메뉴에서 ChatGPT · Claude 로 엽니다. 주소 끝에 `.md` 를 붙여도 원문이 열립니다.
- [`/llms.txt`](/llms.txt): 모든 페이지의 목록과 원문 주소입니다([llms.txt](https://llmstxt.org) 형식).
- [`/llms-full.txt`](/llms-full.txt): 모든 페이지의 원문을 한 파일로 이었습니다.
