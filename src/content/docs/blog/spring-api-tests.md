---
description: Spring Boot 서버의 API 통합 테스트에서 무엇을 실제로 실행하고 무엇을 Fake 로 바꿀지, Fake · 이름 · 공통 설정 · 격리를 어떻게 쓰는지 정리한 글입니다.
---

# Spring API 통합 테스트의 실행 경계와 Fake 작성 규칙

*실제 HTTP 요청과 업무 로직, 저장 결과를 검증하고 외부 의존성은 테스트 목적에 맞게 통제한다*

백엔드 테스트 기술 공유에서 발표한 내용을 글로 옮겼습니다.
[테스트는 왜 이렇게 됐나](/concepts/testing/)와 같은 생각을 Spring Boot 서버에 적용할 때의 규칙입니다.

## 실행 경계

### 테스트가 보장할 범위를 먼저 정한다

테스트가 통과했을 때 무엇을 보장할지 먼저 정하고, 그에 맞춰 실행 경계와 대역을 고릅니다.

- 모든 의존성을 실행하면 테스트마다 외부 상태와 실행 비용이 섞입니다.
- 내부 로직까지 대역으로 바꾸면 검증하려던 처리 흐름이 사라집니다.
- 인증 구성, DB 엔진, 교체한 Bean 이 무엇인지 테스트마다 분명히 합니다.

### 피라미드의 가운데 층

| 층 | 성격 |
|---|---|
| 배포 환경 E2E | 느리고 취약합니다. 핵심 시나리오만 적게 둡니다. |
| **API 통합 테스트** | 요청 검증 · 업무 처리 · 저장 결과를 한 번에 확인합니다. 이 글의 주제입니다. |
| 단위 테스트 | 빠르고 많습니다. 분기와 계산 로직을 다룹니다. |

아래 층은 빨라서 많이 두고, 위 층은 느려서 적게 둡니다.
가운데 층은 실행 비용을 감당할 수 있는 범위에서 여러 계층의 연결을 함께 검증하는 자리입니다.

### E2E 에 가까울수록 비싸지만 얻는 것이 있다

**비용.** 웹 서버와 DB 를 띄우므로 단위 테스트보다 느립니다. 외부 상태와 타이밍에 영향을 받아 간헐적으로 실패하고, 실패했을 때 원인 위치를 좁히기 어렵습니다.

**이점.** 계층 사이의 조립을 검증합니다. 요청 매핑, 인증, 직렬화, 트랜잭션 경계, 예외의 오류 응답 변환은 단위 테스트가 전부 통과해도 확인되지 않는 지점입니다.

그래서 개수를 늘리는 대신, 대역으로 외부 조건을 통제해 실행 비용을 낮추고 남은 검증 범위를 기록합니다.

### 기본 구성은 서비스 범위의 API 통합 테스트

```
HTTP client ──랜덤 포트──▶ 웹 서버 (요청 검증) ──▶ Controller ──▶ Service ──▶ Repository ──▶ 테스트 DB
                                                                  └──▶ 외부 client ──▶ Fake
```

랜덤 포트로 웹 서버를 띄우고 HTTP 요청을 보냅니다. Controller · Service · Repository 는 실제 구현을 쓰고, 외부 클라이언트만 Fake 로 바꿉니다.
DB 접근과 외부 호출은 Service 가 쓰는 별개의 경계입니다.

### 실제 구현과 대역을 나누는 기준

- **실제 구현을 쓴다.** 요청 검증, Controller, Service, Repository, 예외 처리기, 전용 테스트 DB.
  서비스의 업무 흐름을 검사할 때는 내부 흐름을 그대로 둡니다.
- **대역으로 바꾼다.** 외부 API client, 메일 발송, 스토리지처럼 테스트마다 실행하기 어려운 의존성.
  SSE 전송처럼 좁은 계층을 검사할 때는 Service 대역도 쓰지만, 결과도 그 범위로만 해석합니다.

이 테스트는 운영 환경 전체를 관통하는 E2E 가 아닙니다. 브라우저 · Ingress · 외부 인증 제공자까지 확인해야 하는 시나리오는 따로 둡니다.

## 테스트 대역

### Fake 는 외부 조건을 통제하는 도구다

- **응답 제어.** 정상 · 빈 결과 · 오류를 필요한 조건으로 재현합니다.
- **시간 제어.** 완료를 보류해 중간 상태나 스트리밍을 확인합니다.
- **부수 효과 관찰.** 전달한 인자와 헤더, 발송 요청을 검사합니다.
- **격리.** 외부 상태와 실행 비용이 결과에 섞이는 범위를 줄입니다.

### Test Double 은 역할로 구분한다

| 대역 | 역할 | 테스트에서 쓰는 방식 |
|---|---|---|
| Stub | 고정 응답을 제공한다 | 정해진 값을 돌려주는 조회 경로 |
| Fake | 간소화된 동작을 구현한다 | 연결 성공 · 실패와 발송 이력을 메모리로 재현 |
| Spy | 호출을 기록한다 | 인자 · 헤더 · 호출 횟수를 나중에 조회 |
| Mock | 기대한 상호작용을 검증한다 | 호출 순서와 횟수 자체가 계약일 때 |

대역 하나가 여러 역할을 가질 수 있습니다. 클래스 이름보다 무엇을 어디까지 대체했는지를 봅니다.

### Fake 안에 업무 정책을 다시 구현하지 않는다

Fake 에는 테스트에 필요한 외부 동작만 작게 구현합니다. 재시도나 정책 판단은 넣지 않습니다.

재시도를 검증한다면 첫 호출은 실패, 다음 호출은 성공하도록 설정만 하고, 재시도는 검사 대상의 실제 로직이 하게 합니다.
Fake 가 카운터만 올린 결과를 재시도 검증으로 취급하지 않습니다.

```java
// 외부 조건만 설정한다 — 재시도 로직은 Service 가 수행한다
fakeMcpToolExecutor.failNextListTools();
```

## 이름과 공통 설정

### 이름은 리소스와 HTTP 메서드를 나타낸다

```
domain/mcpserver/
├── GET_specs.java          # 목록 조회
├── POST_specs.java         # 생성
└── id/                     # 경로 변수 {id}
    ├── GET_specs.java      # 단건 조회
    ├── PUT_specs.java      # 수정
    ├── DELETE_specs.java   # 삭제
    └── tools/              # /{id}/tools
        └── GET_specs.java  # 도구 목록 조회
```

파일 · 클래스 이름은 `{METHOD}_specs` 형식으로 쓰고 HTTP 메서드는 대문자로 적습니다.
경로 변수는 `id` 같은 하위 폴더로 나타내고, `@DisplayName` 에는 HTTP 메서드와 엔드포인트를 적습니다.

### 메서드 이름은 조건과 기대 결과를 나타낸다

```
올바른_요청으로_MCP_서버를_생성하면_201_Created를_반환한다
MCP_서버_연결_검증에_실패하면_400_Bad_Request를_반환한다
GROUP_visibility와_groupId로_생성하면_매핑_테이블에_저장된다
```

상태 코드가 핵심이면 상태 코드를, 저장 관계가 핵심이면 저장 결과를 이름에 넣습니다. 모든 이름을 상태 코드로 끝낼 필요는 없습니다.

### 테스트 서버와 Fake Bean 을 어노테이션 하나로 묶는다

```java
// 실행 환경
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.TYPE)
@SpringBootTest(webEnvironment = RANDOM_PORT)
@AutoConfigureTestRestTemplate
@Import(IntegrationTestConfig.class)
public @interface CoreApiTest { }

// 공통 대역 등록
@TestConfiguration
class IntegrationTestConfig {
    @Bean @Primary
    FakeMcpToolExecutor executor() {
        return new FakeMcpToolExecutor();
    }
}
```

API 테스트마다 fixture 와 Fake 구성을 되풀이하지 않고 같은 테스트 컨텍스트를 재사용합니다.
설정 클래스를 불필요하게 나누지 않으면 Spring 의 컨텍스트 캐시도 쓰기 쉽습니다.

### @Primary 는 Bean 을 삭제하지 않는다

`@Primary` 는 단일 의존성 주입에서 우선 후보를 고를 뿐입니다. 실제 Bean 은 컨텍스트에 그대로 남고, 생성과 초기화도 그대로 실행됩니다.
`@Qualifier` 로 이름을 지정한 주입 지점은 `@Primary` 를 따르지 않으므로 따로 확인합니다.

그래서 실제 Bean 이 생성되면서 외부에 접속을 시도하면 컨텍스트 로딩이 느려지거나 실패합니다. `@Qualifier` 주입이 남아 있으면 Fake 가 아니라 실제 client 가 호출됩니다.
어느 쪽이든 외부 서버 상태에 따라 통과와 실패가 갈리는 테스트가 됩니다. 확실히 통제하려면 실제 Bean 을 등록하지 않거나, 컨텍스트의 정의를 바꿉니다.

```java
// 실제 Bean 을 아예 등록하지 않는다
@ConditionalOnProperty("mcp.enabled")
class RealMcpToolExecutor { ... }

// 또는 컨텍스트의 정의를 대체한다
@MockitoBean ChatService chatService;
```

어느 방법을 쓰든 왜 교체했는지 테스트 설정에 한 줄로 남깁니다.

## 검증과 격리

### 본문은 Arrange → Act → Assert 순서로 쓴다

- **Arrange.** fixture 와 데이터, Fake 조건을 준비합니다. 준비 코드는 `{Domain}TestFixture`, 값 생성은 `UuidGenerator` 처럼 역할을 드러내는 이름을 씁니다.
- **Act.** 테스트용 HTTP client 로 실제 엔드포인트에 요청합니다. Controller 메서드를 직접 부르지 않습니다.
- **Assert.** 응답과 필요한 상태 변화를 확인합니다. 테스트 하나는 시나리오 하나를 다루되, 그것을 증명하는 assertion 은 여러 개여도 됩니다.

### 외부 실패를 주입하고 실제 API 계약을 검사한다

```java
// Arrange: 외부 연결 실패를 주입한다
fakeMcpToolExecutor.failNextListTools();

// Act: 실제 API 로 요청한다
var response = client.exchange(fixture.basePath(), HttpMethod.POST,
        new HttpEntity<>(request, fixture.authHeaders(accessToken)), MAP_TYPE);

// Assert: 애플리케이션의 오류 변환 결과를 확인한다
assertThat(response.getStatusCode().value()).isEqualTo(400);
assertThat(response.getBody()).containsEntry("title", "VALIDATION_ERROR");
```

오류 응답은 문자열 조각보다 JSON 필드로 비교합니다. 성공했을 때도 HTTP 201 만 보지 말고 저장 결과까지 확인합니다.

### Fake 상태와 DB 데이터를 따로 격리한다

```java
@Autowired FakeMcpToolExecutor fakeMcpToolExecutor;

@BeforeEach @AfterEach
void resetFakeMcpToolExecutor() {
    fakeMcpToolExecutor.reset(); // 횟수 · 예외 · 세션 · 마지막 인자
}
```

컨텍스트가 재사용되면 singleton 인 Fake Bean 도 재사용됩니다. 실패 플래그 · 카운터 · 발송 이력을 테스트 전후로 초기화합니다.

테스트 메서드의 `@Transactional` 은 서버가 저장한 데이터를 rollback 하지 않습니다. 랜덤 포트의 서버는 다른 스레드에서 자기 트랜잭션으로 커밋하기 때문입니다.
전용 테스트 DB 에 정리 전략을 따로 둡니다.

## 보완 테스트

### 종류별로 남는 검증 범위를 기록한다

| 테스트 | 검증 범위 | 남는 범위 |
|---|---|---|
| Fake 기반 API 테스트 | 요청 검증, 업무 처리, 오류 변환, 상태 변화 | 대상 DB 엔진, 외부 계약 |
| DB 통합 테스트 | 대상 엔진의 쿼리 · 제약 · 트랜잭션 · 마이그레이션 | 애플리케이션 오류 계약 |
| 외부 계약 테스트 | client adapter 의 요청 · 응답 · 오류 · 인증 처리 | 내부 업무 흐름 |
| 배포 환경 E2E | 실제 인증 · Ingress · 서비스 연결 | 세부 실패 분기 |

H2 의 MySQL 호환 모드는 MySQL 과 같은 엔진이 아닙니다.

## 정리

1. 서비스의 업무 흐름을 검사할 때는 내부 흐름을 유지하고, 외부 의존성만 대역으로 바꿉니다.
2. HTTP 응답과 저장 상태, 필요한 부수 효과를 함께 검사합니다.
3. 각 테스트의 실제 실행 경계와 남은 검증 범위를 함께 기록합니다.

기존 테스트 한 건을 골라 실행 경계와 남은 검증 범위를 적어 보는 것부터 시작하면 됩니다.
