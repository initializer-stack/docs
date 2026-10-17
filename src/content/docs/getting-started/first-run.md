---
description: 필요한 도구를 갖추고 인프라 · 개발 서버 · 테스트를 처음 실행합니다.
---

# 처음 실행하기

서버 넷(notes · tags · activity · templates)과 web 앱으로 시작합니다. 메모를 저장할 때 notes 가 tags 에 태그를 묻고 activity 에 기록을 남기고,
web 은 notes 와 templates 를 부르므로 서버 넷이 함께 뜹니다. 필요한 도구는 Node 24 · pnpm 12 · Docker · Java 25(activity) · uv(tags) · Go 1.25(templates)이고, desktop 은 Rust 가 더 필요합니다.
버전을 고정한 파일은 [레퍼런스 · 개발 → 명령](/reference/development/#명령)에 있습니다.

도구를 설치하기 전에 화면부터 보고 싶다면 Docker 만으로 둘러볼 수 있습니다.

## Docker 만으로 둘러보기

서버와 web 앱은 이미지를 빌드할 때 그 안에서 Node · Java · uv · Go 를 쓰므로, 이 컴퓨터에는 Docker 만 있으면 됩니다.
저장소 루트에서 실행합니다.

```bash
docker compose -f docker/docker-compose.yaml up -d --build --wait web   # Postgres · 서버 넷 · web
```

web 하나만 적어도 compose 의 `depends_on` 을 따라 web 이 부르는 notes · templates, notes 가 부르는 tags · activity, 서버들이 쓰는 Postgres 가 함께 뜹니다.

http://localhost:5280 에서 `내일 회의` 라는 메모를 만들면 `회의` 태그가 붙습니다. 끄려면 `docker compose -f docker/docker-compose.yaml down` 입니다.
처음 빌드는 서버마다 의존성을 받느라 몇 분 걸립니다. 코드를 고치며 다시 띄우거나 테스트 · 타입 검사를 하려면 아래처럼 도구를 갖추고 `pnpm dev` 로 실행합니다.

## 최소 구성으로 시작하기

템플릿으로 만든 새 학습용 저장소에서 실행합니다. `drop` 은 지정한 예시 폴더와 연결 설정을 지우므로,
이미 그 안에 작업한 코드가 있다면 먼저 변경을 보관하거나 아래의 [전체 예시를 유지할 때](#전체-예시를-유지할-때)를 따릅니다.

```bash
node scripts/drop.mjs admin site lite mobile desktop
pnpm install
pnpm dev      # Postgres(docker) → 서버 넷 + web 앱, http://localhost:5280
```

삭제 스크립트를 `pnpm install` 전에 `node` 로 직접 실행하므로, 뺀 예시의 의존성은 설치하지 않습니다.
서버는 빼지 않습니다. tags · activity 는 notes 가, notes · templates 는 web 이 부르므로 서버를 적으면 `drop` 이 멈춥니다.

화면에서 `내일 회의` 라는 메모를 만들면 `회의` 태그가 붙습니다. notes 가 tags 서버에 물어 받은 태그입니다.
새로 고침한 뒤에도 남는지, 삭제하면 목록에서 없어지는지 확인합니다.
`템플릿으로 시작` 에서 `회의록` 을 고르면 입력칸이 그 내용으로 채워집니다. templates 서버가 내준 예시 템플릿입니다.

`pnpm dev` 를 둔 채 다른 터미널에서 다음을 실행합니다.

```bash
pnpm test       # 서버 넷의 HTTP · gRPC 테스트
pnpm typecheck  # 계약 생성 + 남은 패키지의 타입 검사
pnpm lint
```

테스트 이름과 성공 결과가 나오고, 타입 검사 · lint 가 종료 코드 0 으로 끝나면 첫 실행이 끝난 것입니다.
테스트는 서버마다 `<서버>_test` DB 와 랜덤 포트를 써서 개발 화면의 메모를 지우지 않습니다. notes 의 테스트는 tags · activity 를 띄우지 않고 Fake 로 바꿉니다.

`pnpm dev` · `pnpm test` 는 먼저 `pnpm infra`(docker 의 Postgres)를 띄웁니다. 개발 서버는 터미널에서 Ctrl+C,
Postgres 는 `pnpm infra:down` 으로 끕니다. DB 볼륨은 남아 있으므로 다음 실행에도 메모가 유지됩니다.

## 전체 예시를 유지할 때

`drop` 을 실행하지 않고 `pnpm install` 을 실행합니다. 기본 `pnpm dev` 는 그대로 서버 넷 + web 을 띄웁니다.
관리 화면은 `pnpm dev` 를 둔 채 `pnpm --filter @app/admin dev` 로 띄우고, http://localhost:5281 에서 태그 규칙 · 템플릿을 바꾸거나 활동 기록을 봅니다.

서버 하나의 테스트만 돌리려면 `pnpm infra` 다음 `pnpm --filter @app/notes test` 처럼 실행합니다.
다른 서버 · 앱도 `pnpm --filter @app/<패키지> <스크립트>` 로 고릅니다(예: `@app/activity dev`).

## 이미지로 실행하기

첫 테스트가 통과한 뒤 `pnpm stack` 으로 남은 서버 · 웹 앱의 이미지를 빌드하고 smoke 를 실행합니다.
smoke 는 메모 하나로 notes → tags · activity 가 실제 이미지끼리 이어지는지, 웹 앱마다 `/api/<서버>` 가 부르는 서버에 닿는지 봅니다.
개발 서버와 기본 포트가 같으므로 직접 띄운 `pnpm dev` 를 먼저 종료하거나, [포트 설정](/reference/development/#인프라-docker)으로 구분합니다.
끄려면 `pnpm stack:down` 입니다.

포트와 환경 변수는 [레퍼런스 · 개발 → 포트](/reference/development/#포트)에 있습니다.

## 다음

- API 를 바꾸면 `pnpm gen` 으로 계약을 다시 만들어 코드와 함께 커밋합니다. [엔드포인트 추가](/guides/add-endpoint/)가 그 흐름을 처음부터 끝까지 따라갑니다.
- 생성된 타입과 proto 호환 검사를 직접 실패시켜 보려면 [계약을 깨뜨려 보기](/guides/contract-lab/), 외부 실패를 재현하려면 [외부 서비스 실패 테스트](/guides/external-service-lab/)로 이어갑니다.
- 서버끼리 부르는 흐름은 [다른 서버 부르기](/guides/call-server/), 같은 일을 언어마다 어떻게 쓰는지는 [같은 일, 네 언어](/reference/languages/).
- 막히면 [자주 겪는 문제](/guides/troubleshooting/).
