## 검증 결과: PASS_WITH_WARNINGS

> 최종 판정 기준: 테스트 실행 결과 우선 → 정적 분석 보완
> 진행 중 [치명] 2건을 QA 단계에서 직접 수정했다 (아래 "수정 완료 항목" 참조). 수정 후 재검증 결과 테스트/타입체크/빌드 모두 정상이며, 잔여 [주의]/[확인] 항목은 기능 동작을 막지 않으므로 PASS_WITH_WARNINGS로 판정한다.

## 테스트 실행 결과
- 실행 여부: 실행됨
- 실행 명령어: `npx vitest run`
- 소요 시간: 약 1.2~1.3s (재검증 2회 포함)

| 상태 | 케이스 |
|------|--------|
| ✅ PASS | 39개 |
| ❌ FAIL | 0개 |
| 전체 | 39개 (6개 파일) |

### FAIL 케이스 상세
없음.

### 원본 실행 로그 (요약, 수정 후 재실행)
```
✓ lib/validation/auth-schema.test.ts (8 tests)
✓ actions/auth.test.ts (8 tests)
✓ lib/db/client.test.ts (4 tests)
✓ lib/auth/session.test.ts (7 tests)
✓ lib/auth/password.test.ts (5 tests)
✓ services/auth-service.test.ts (7 tests)

Test Files  6 passed (6)
     Tests  39 passed (39)
```

`npx tsc --noEmit` → 출력 없음 (clean, 수정 전/후 동일).
`npx next build` → 수정 전/후 모두 성공. 라우트: `/`(dynamic), `/login`(dynamic), `/signup`(dynamic), `/_not-found`(static).

## 스펙 달성 여부 (Phase 1 성공 조건 기준)
| 성공 조건 | 상태 | 근거 (파일:라인) |
|----------|------|-----------------|
| 회원가입 시 계정 생성 + 인증 세션 진입 | ✅ (QA 수정 후) | `actions/auth.ts:20-27`, `services/auth-service.ts:15-38`. **단, 수정 전에는 실제 앱 구동 시 실패했음** — 아래 [치명] 참조 |
| 로그인 성공 시 세션 발급 + 보호 페이지 이동 | ✅ | `actions/auth.ts:40-47`, `components/features/auth/auth-form.tsx:82-87` (`router.push('/')`) |
| 세션 유지(HttpOnly 쿠키, 새로고침/재방문 보존) + 로그아웃 파기 | ✅ | `lib/auth/session.ts:48-65` |
| 비밀번호 해시 저장(평문 금지) | ✅ | `lib/auth/password.ts` (bcryptjs), `services/auth-service.ts:24,35` |
| 중복 이메일 → 인라인 에러 | ✅ | `services/auth-service.ts:18-21`, `actions/auth.ts:28-30` |
| 비밀번호/확인 불일치, 이메일 형식, 최소 길이 → 필드별 검증 에러 | ✅ | `lib/validation/auth-schema.ts`, `actions/auth.ts:12-18` |
| 존재하지 않는 이메일/비번 불일치 → 동일 일반 에러(계정 열거 방지) | ✅ (메시지 레벨) / ⚠️ (타이밍 레벨, 아래 확인 참조) | `services/auth-service.ts:44-58`, `actions/auth.ts:8,34-50` |
| 로그인 세션 사용자의 `/login`·`/signup` 접근 시 `/`로 리다이렉트 | ✅ | `app/login/page.tsx:5-9`, `app/signup/page.tsx:5-9` |
| 로딩 상태 처리 | ✅ | `auth-form.tsx:47,165-175` (`isPending` + disabled + 텍스트 전환) |
| 에러 상태 처리 | ✅ | `auth-form.tsx:74-88,109,124,142,158,163` (필드별 인라인 + 폼 상단 일반 에러) |
| 빈 상태 처리 | 해당 없음 (입력 폼) | — |

## 타입 경계면 검증
| 경계면 | 상태 | 상세 |
|--------|------|------|
| `types/user.ts` ↔ `lib/db/client.ts` | ✅ | DB row(snake_case) → `services/auth-service.ts`에서 `User`(camelCase)로 명시적 매핑, 타입 캐스팅(`as UserRow`) 1곳만 사용, 범위 한정적 |
| Service ↔ Action | ✅ | `createUser`/`authenticateUser` 반환 `User` → `actions/auth.ts`에서 `Session` 서브셋(`userId/email/nickname`)만 추출해 `setSessionCookie`에 전달. `passwordHash`는 액션 밖으로 나가지 않음 |
| Action ↔ Component | ✅ | `AuthResult` 타입이 `signup/login` 반환값과 `auth-form.tsx`의 분기 처리(`result.ok`, `result.field`)에서 정확히 일치 |
| Zod 스키마 ↔ 타입 | ✅ | `signupSchema`/`loginSchema`가 `SignupInput`/`LoginInput` 필드와 1:1 대응 |
| Server/Client 경계 | ✅ | `page.tsx`(Server, async) → `AuthForm`(`'use client'`, leaf)만 클라이언트. Server Action을 client에서 직접 import해 호출(§5-5 패턴 준수), `cookies()`는 전 구간 `await` 처리(Next 15 async API 준수) |

## CSS 스타일 검증 (CSS_CONVENTIONS.md §13)
| 항목 | 상태 | 상세 |
|------|------|------|
| 스타일 모드 일관성 | ✅ | Tailwind v4 확정(`@import "tailwindcss"` + `@theme`), 프로젝트 전체 Tailwind utility만 사용, Pure CSS/CSS Module 혼재 없음 |
| `cn()` 사용 | ✅ | `lib/utils.ts` (`clsx` + `tailwind-merge`), `auth-form.tsx` 전역에서 문자열 concat 없이 `cn()` 사용 |
| conflicting utility | ✅ | 육안 검토 결과 충돌 조합 없음 |
| 반복 class 컴포넌트/상수 추출 | ✅ | `labelClass`/`inputClass`/`errorTextClass` 상수로 3개 필드 이상 공유 (`auth-form.tsx:37-43`) |
| arbitrary value / inline style | ✅ | `style={{}}` 사용 없음, arbitrary bracket(`[...]`) className 없음 |
| a11y — focus-visible | ✅ | `inputClass`에 `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary` — outline 단독 제거 아님(대체 표시 있음) |
| a11y — touch target ≥44px | ⚠️ [주의] | input/button이 `py-sm`(8px)+`text-md` 조합으로 실측 높이가 44px 미만으로 추정됨 (아래 [주의] 참조) |
| CSS 금지사항(`!important`, ID 선택자 등) | ✅ | 해당 없음 |

## 잠재적 위험
### [치명] (수정 필요) — QA 단계에서 직접 수정 완료
- `lib/db/client.ts:20-29` (수정 전) — **기본 DB 경로(`data/app.db`)의 상위 디렉터리를 생성하지 않아, 저장소를 새로 clone하거나 `data/` 폴더가 없는 환경에서 첫 `getDb()` 호출(회원가입/로그인) 시 `Cannot open database because the directory does not exist` 예외로 서버가 500 에러를 반환함.**
  - 발생 조건: 신규 clone/배포 환경 + `DB_PATH` 미설정(기본값 사용) + `data/` 폴더 부재
  - 검증 방법: 동일한 `Database('data/app.db')` 호출을 `data/` 없는 디렉터리에서 재현 → `FAILURE: Cannot open database because the directory does not exist` 확인. 전체 vitest 스위트는 `:memory:` 또는 `getDb()` 모킹만 사용해 이 경로를 전혀 검증하지 않음(테스트 커버리지 공백).
  - 구현 보고서(`02_implementation.md`)에도 "새 클론 환경에서도 마이그레이션이 자동 실행되는지 확인 권장"으로 명시적으로 QA에 확인을 요청한 항목이었음.

- `lib/auth/session.ts:8-12` (수정 전) — **`AUTH_SECRET` 미설정 시 소스코드에 하드코딩된 고정 문자열(`'test-only-secret-key-at-least-32-chars-long'`)로 JWT를 서명.** 이 값은 저장소에 커밋되어 공개되므로, 운영 환경에서 환경변수 설정 누락(배포 설정 실수 등)이 발생하면 공격자가 이미 알려진 시크릿으로 세션 토큰을 위조할 수 있음. 테스트(`lib/auth/session.test.ts:5`)는 자체적으로 `AUTH_SECRET`을 설정하므로 이 fallback은 테스트 통과에도 불필요했음(순수 보안 결함).

### [주의] (검토 권장)
- `actions/auth.ts:28-30` — `createUser`가 던지는 모든 에러(실제로는 이메일 중복만 예상되지만 DB 장애 등 다른 예외도 포함)를 무조건 "이미 사용 중인 이메일입니다"로 뭉뚱그려 사용자에게 표시함. 에러 원인(예: `EMAIL_TAKEN` 문자열)을 구분하지 않아, DB 오류 상황에서도 사용자에게 잘못된 안내가 노출될 수 있음. 기능 자체는 정상 동작하므로 심각도는 [주의]로 유지.
- 계정 열거 방지의 **타이밍 사이드채널** — `services/auth-service.ts:51-53`에서 이메일이 존재하지 않으면 `bcrypt.compare`를 호출하지 않고 즉시 throw하는 반면, 비밀번호가 틀린 경우는 `verifyPassword`(bcrypt 비교, 상대적으로 느림)를 거친 뒤 throw함. 에러 메시지는 동일하지만 응답 시간 차이로 이메일 존재 여부를 추정할 수 있는 여지가 있음(고전적 timing-based enumeration). 스펙의 "동일한 에러 메시지" 요구는 충족했으나 "계정 열거 방지"의 완전한 구현은 아님. 패턴 일탈이 아니라 누락이므로 사용자 확인 후 필요 시 더미 해시 비교 추가를 권장.
- `components/features/auth/auth-form.tsx:38-42,165-172` — input/button의 터치 타깃 높이가 `py-sm`(상하 8px) + `text-md`(16px, 별도 line-height 미지정) 조합으로 CSS_CONVENTIONS §10-2 권장 최소 44px에 못 미치는 것으로 추정됨(대략 32~35px). 디자인 토큰(`--spacing-sm`)이 프로젝트 확정 토큰이라 임의 변경은 지양했으며, 디자인 시스템 쪽에서 버튼/인풋 전용 min-height 토큰 도입 여부 확인 필요.
- 컴포넌트 파일명 `auth-form.tsx` (kebab-case) — REACT_NEXT_CONVENTIONS §3-1 기본 규칙(React 컴포넌트 `PascalCase.tsx`)과 다르지만, `01_spec.md`의 `patterns_applied`(team: `kebab-case-files`)에 따른 의도된 팀 패턴 적용이므로 수정하지 않음.
- 정적 분석 도구 중 ESLint 미설정(`.eslintrc*`/`eslint.config.*` 없음, `package.json`에 `eslint` 미설치) — `npx next build`가 "Linting and checking validity of types..." 메시지를 출력하지만 실제 ESLint 규칙 검사가 수행되는지는 확인 불가. TypeScript strict 모드로 상당 부분 대체되고 있으나, 컨벤션 문서가 요구하는 정적 분석 계층이 비어 있음.

### [확인] (사용자 확인 필요)
- `types/user.ts` — `User`에 `passwordHash`가 포함된 단일 타입만 존재하고, "클라이언트 노출 금지 응답 DTO"를 별도 타입으로 분리하지 않음(`01_spec.md` 주의사항: "응답 DTO(Session/공개 User)를 분리할 것"). 현재 코드는 `actions/auth.ts`가 `User`에서 필요한 필드만 추출해 사용하는 방식으로 실제 유출은 없으나, 타입 시스템이 이를 강제하지 않아 향후 실수로 `User` 전체를 반환/직렬화할 위험이 있음. 별도 `PublicUser`/DTO 타입 도입 여부는 사용자 판단 필요.
- `app/layout.tsx` — 디자인 스펙(`01_spec.md`)이 지정한 Pretendard 폰트가 `next/font`로 로드되지 않고 `globals.css`의 `font-family` 폴백 스택(`"Pretendard", ..., system-ui, ...`)으로만 선언되어 있음. 로컬 폰트 파일이 제공되지 않아 실제로는 대부분 사용자 환경에서 시스템 폰트로 렌더링됨(Google Fonts CDN `<link>` 사용은 아니므로 REACT_NEXT_CONVENTIONS §14 "금지 사항"에는 해당하지 않음). Pretendard 폰트 자산 확보 후 `next/font/local`로 교체할지 여부 확인 필요.

## 테스트 커버리지
- 테스트 파일 존재: 있음 (`lib/auth/password.test.ts`, `lib/validation/auth-schema.test.ts`, `lib/db/client.test.ts`, `lib/auth/session.test.ts`, `services/auth-service.test.ts`, `actions/auth.test.ts` — 총 39 케이스)
- 누락된 테스트:
  - `lib/db/client.ts`의 **실제 파일 경로(비-`:memory:`) 동작** — 이번에 발견된 [치명] 버그가 테스트로 잡히지 않은 근본 원인. `DB_PATH`를 임시 디렉터리 경로로 지정하는 통합 테스트 추가를 권장.
  - `components/features/auth/auth-form.tsx`, `app/login/page.tsx`, `app/signup/page.tsx` — `01_test_plan.md`에서 명시적으로 범위 밖 처리(테스트 라이브러리 미설치, 스펙에 인터랙션 명세 없음). 실제 브라우저 제출→쿠키 발급→리다이렉트 경로는 여전히 미검증(구현 보고서에도 명시).

## 수정 완료 항목
- `lib/db/client.ts:1-2,20-24` — `mkdirSync(dirname(dbPath), { recursive: true })`를 `:memory:`가 아닌 경로에 대해 DB 연결 전에 호출하도록 추가. 신규 clone/배포 환경에서 `data/` 디렉터리가 없어도 회원가입/로그인이 정상 동작하도록 수정.
- `lib/auth/session.ts:8-14` (`getSecretKey`) — `AUTH_SECRET` 미설정 또는 32자 미만이면 하드코딩된 fallback을 사용하는 대신 명시적으로 `Error`를 throw하도록 변경. 운영 환경에서 시크릿 미설정을 "조용한 보안 저하"가 아니라 "즉시 실패"로 전환.
- 두 수정 모두 `npx vitest run`(39/39 PASS), `npx tsc --noEmit`(clean), `npx next build`(성공)로 재검증 완료. 로직/시그니처 변경 없음(부수 효과만 추가: 디렉터리 생성, 시크릿 부재 시 예외).

## 최종 권고
핵심 성공 조건은 모두 코드로 구현되어 있고 39개 테스트가 전부 통과하지만, 테스트 스위트가 전부 `:memory:`/모킹 기반이라 "새 환경에서 첫 실행" 경로(파일 기반 SQLite 디렉터리 부재)를 검증하지 못해 치명적 런타임 버그가 숨어 있었다. QA 단계에서 이를 재현·수정했고, 동시에 하드코딩된 JWT 시크릿 fallback이라는 보안 결함도 함께 제거했다. 두 수정 모두 국소적이며(파일 2개, 함수 내부 로직만 변경) 기존 테스트/빌드에 회귀를 일으키지 않았다.

남은 [주의]/[확인] 항목(에러 메시지 뭉뚱그림, 타이밍 기반 계정 열거 가능성, 터치 타깃 크기, DTO 타입 분리, 폰트 로딩 방식)은 기능을 막지 않는 개선/확인 사항이므로 **PASS_WITH_WARNINGS**로 판정한다. 오케스트레이터는 이슈 #1을 다음 단계로 진행해도 무방하나, 타이밍 사이드채널과 DTO 타입 분리는 보안/유지보수 관점에서 후속 이슈로 트래킹하는 것을 권장한다.
