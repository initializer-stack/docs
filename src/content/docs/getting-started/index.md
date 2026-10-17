---
description: 템플릿으로 새 저장소를 만들고 이름 · 쓰지 않는 예시 · README · LICENSE 를 정리합니다.
---

# 템플릿으로 저장소 만들기

## 1. 저장소 만들기

GitHub 의 [템플릿 저장소](https://github.com/initializer-stack/template)에서 **Use this template** 로 새 저장소를 만들고(커밋 기록 없이 시작합니다),
만든 저장소를 받습니다.

```bash
git clone https://github.com/<계정>/<저장소>.git
cd <저장소>
```

GitHub 에 저장소를 먼저 만들지 않고 템플릿을 바로 받아 쓴다면, 템플릿의 기록을 지우고 새로 시작합니다.

```bash
git clone https://github.com/initializer-stack/template.git my-app
cd my-app
rm -rf .git && git init
```

## 2. 이름 바꾸기

```bash
pnpm rename "My Shop"            # slug 는 이름에서 만듭니다 (my-shop)
pnpm rename "가계부" gagyebu      # 이름이 영문이 아니면 slug 를 줍니다
```

템플릿 이름 `iStack` 과 slug `initializer-stack` 이 쓰인 곳(README · AGENTS · DESIGN 제목, 앱 title · Tauri 창 이름 · Expo 앱 이름,
루트 `package.json`, compose 프로젝트, Expo slug, Tauri identifier)을 한 번에 바꾸고, 스크립트는 끝나면 스스로 지워집니다.

저장소 안에서만 쓰는 이름(`@app/*`, Java 패키지 `app`, DB 계정)은 그대로 둡니다. 밖에 보이지 않아 프로젝트 이름과 달라도 됩니다.
예외와 이유는 [레퍼런스 · 개발 → 이름 바꾸기](/reference/development/#이름-바꾸기)에 있습니다.

## 3. 쓰지 않는 예시 빼기

```bash
pnpm drop site lite mobile   # 적은 예시를 뺍니다
pnpm install                 # lockfile 정리
```

폴더와 함께 그것을 가리키는 설정 줄(gen · dev · contract · DB · compose · smoke · 포트)을 지웁니다. 남는 앱 · 서버가 부르는 서버는 빼지 않습니다.
tags · activity 는 notes 와 admin 이, templates 는 web 과 admin 이, notes 는 admin 을 뺀 앱이 부르므로 빼려면 그 호출을 먼저 고칩니다.
문서의 설명은 고치지 않고, 남은 언급이 있는 파일을 알려 줍니다.
→ [레퍼런스 · 개발 → 예시 빼기](/reference/development/#예시-빼기)

## 4. 남긴 예시 이름 바꾸기

폴더 이름은 그 서버 · 앱이 맡은 일입니다(`notes` · `tags` · `activity` · `templates`, `web` · `admin` · `site`). 남긴 예시가 프로젝트에서 다른 일을 맡으면 그 일의 이름으로 바꿉니다.
구현 언어 · 프레임워크는 이름에 넣지 않습니다. 이름이 들어간 곳을 찾는 명령과 순서는 [서버 추가 → 이름을 바꿀 때](/guides/add-server/#이름을-바꿀-때)에 있습니다.

## 5. README · LICENSE

- README 는 템플릿 소개입니다. 프로젝트에 맞게 고쳐 씁니다.
- 템플릿은 Apache License 2.0 입니다. 프로젝트의 라이선스는 직접 정하고, 템플릿 코드를 담아 배포할 때의 고지 조건은 Apache 2.0 을 따릅니다.

## 다음

- [처음 실행하기](/getting-started/first-run/)
