---
issue_id: 1
parent_run_id: null
kind: initial
title: 회원가입/로그인
---

# TDD 스펙 초안

> **스택:** Next.js 15+ (App Router) · React 19 · TypeScript(strict). `harness.config.yaml`의 `stack: auto`는 아직 미해결이나, 설치된 컨벤션 문서(REACT_NEXT_CONVENTIONS.md §1, CSS_CONVENTIONS.md)가 모두 Next.js 전용으로 프로비저닝되어 있으므로 **Next.js App Router를 확정 스택으로 간주**한다.
>
> **첫 기능 안내:** 이 이슈(#1)는 프로젝트의 **첫 번째 기능**이다. `package.json`·`app/` 등 실제 앱 코드가 없고 하네스 스캐폴딩만 존재한다. 따라서 참조할 기존 앱 코드가 없으며, "기존 패턴" 섹션은 Next.js App Router 표준 컨벤션을 제안하는 형태로 작성했다.

## patterns_applied

`.harness/patterns/local/`은 비어 있고(`.gitkeep`만 존재), `.harness/patterns/team/`의 활성 패턴 2건을 참조했다.

| id | 적용 내용 |
|----|----------|
| kebab-case-files (team/naming.yaml) | 신규 소스 파일명을 kebab-case로 지정 (`auth-service.ts`, `login-form.tsx` 등) |
| api-error-throw (team/services.yaml) | 인증 API 레이어가 실패 시 `Error`를 throw하고 폼/라우터에서 처리하도록 데이터 섹션에 반영 |

> local 패턴: **없음** (첫 기능이라 아직 추출된 프로젝트 로컬 패턴이 없음. 정상)

## 기능
- **무엇을 만드는가:** 이메일+비밀번호 기반 자체 인증(회원가입/로그인)과 세션 유지 기능. `/signup`·`/login` 두 화면과 서버 인증 로직을 구현한다.
- **성공 조건:**
  1. `/signup`에서 이메일·비밀번호·비밀번호 확인·닉네임을 입력해 회원가입하면 계정이 생성되고 인증된 세션으로 진입한다.
  2. `/login`에서 올바른 이메일·비밀번호로 로그인하면 세션이 발급되고 보호 페이지로 이동한다.
  3. 세션이 유지되어(HttpOnly 쿠키) 새로고침·재방문 시에도 로그인 상태가 보존되며, 로그아웃 시 세션이 파기된다.
  4. 비밀번호는 평문 저장하지 않고 해시(bcrypt/argon2)로 저장한다.
- **예외/엣지케이스:**
  - 이미 가입된 이메일로 회원가입 시도 → "이미 사용 중인 이메일" 인라인 에러(409).
  - 비밀번호/비밀번호 확인 불일치, 이메일 형식 오류, 비밀번호 최소 길이 미달 → 필드별 인라인 검증 에러.
  - 존재하지 않는 이메일 또는 비밀번호 불일치 로그인 → "이메일 또는 비밀번호가 올바르지 않습니다"(정보 노출 방지 위해 사유 통합, 401).
  - 이미 로그인된 사용자가 `/login`·`/signup` 접근 → `/`(홈)으로 리다이렉트. 홈은 이슈 #2에서 구현 예정이므로 이번 이슈에서는 최소 placeholder 페이지로 대체.
- **OUT of scope:** 소셜 로그인, 실제 PG 결제 (이슈에서 명시적으로 제외).

## 디자인
- **UI 구조:** 화면 중앙 정렬된 단일 카드형 폼(centered form). `/login`은 이메일·비밀번호·기본 CTA 버튼, `/signup`은 이메일·비밀번호·비밀번호 확인·닉네임·기본 CTA 버튼. 두 화면 하단에 상호 전환 링크(로그인 ↔ 회원가입). (와이어프레임 issueId=1 기준 확인 완료 — 단순 중앙 폼)
- **주요 컴포넌트:** 디자인시스템의 **AuthForm** 컴포넌트(이메일+비밀번호 회원가입/로그인 공용 폼)를 재사용. 하위로 라벨드 인풋, 기본 CTA 버튼, 인라인 에러 텍스트. shadcn/ui 도입 시 `input`·`button`·`label`·`form` 매핑 가능.
- **로딩 상태:** 제출 버튼 인라인 로딩(스피너 + disabled). 폼 자체는 즉시 렌더되므로 페이지 Skeleton 불필요.
- **에러 상태:** 필드 검증·서버 인증 실패는 **인라인 메시지**(폼 상단/필드 하단), 예상치 못한 서버 오류는 `error.tsx` 또는 toast `[확인 필요: toast 라이브러리 도입 여부]`.
- **빈 상태:** 해당 없음(입력 폼).
- **디자인 토큰:** primary `#FF5A1F`(CTA), text `#1C1C1C`, textMuted `#7A7A7A`, border `#E7E5E1`, danger `#E5342A`(에러), surface `#F7F7F5`. font Pretendard, size md16(기본)/sm14(라벨·에러). space md16/lg24, radius md8. (프로젝트 디자인시스템 레코드 준수, 신규 토큰 생성 금지)

## 데이터
- **API 엔드포인트 / 서버 로직:**
  - 회원가입: Server Action `signup()` 또는 Route Handler `POST /api/auth/signup`
  - 로그인: Server Action `login()` 또는 Route Handler `POST /api/auth/login`
  - 로그아웃: Server Action `logout()` 또는 `POST /api/auth/logout`
  - 세션 확인: 서버에서 쿠키 → 세션 조회 유틸(`getSession()`)
  - **확정:** 컨벤션(§7-3 "Mutation 우선 Server Action")에 따라 **Server Action**으로 통일 (signup/login/logout).
- **HTTP 메서드:** POST (signup/login/logout), 세션 조회는 서버 컴포넌트 내 직접 조회.
- **핵심 타입:**
  ```typescript
  interface User {
    id: string;
    email: string;
    nickname: string;
    passwordHash: string;   // 평문 저장 금지, 응답 DTO에는 미포함
    createdAt: string;
  }

  interface SignupInput {
    email: string;
    password: string;
    passwordConfirm: string;
    nickname: string;
  }

  interface LoginInput {
    email: string;
    password: string;
  }

  interface Session {
    userId: string;
    email: string;
    nickname: string;
  }

  // Server Action 반환 (성공/실패 판별용)
  type AuthResult =
    | { ok: true }
    | { ok: false; error: string; field?: keyof SignupInput };
  ```
  > 입력은 Zod로 런타임 검증(컨벤션 §9). API 레이어는 실패 시 `Error` throw(team: api-error-throw), Server Action은 폼 표시용으로 `AuthResult`로 변환.
- **React Query 전략:** 해당 없음 — Server Action 사용으로 React Query 불필요. 이번 이슈에서는 TanStack Query 미도입.
- **queryKey 구조:** 해당 없음(서버 액션/쿠키 기반). 향후 클라이언트 세션 조회 훅이 필요해지면 `useQuery(['session'])` 형태 예상.
- **세션 저장:** **확정 — JWT 서명 쿠키(무상태)**. HttpOnly·Secure·SameSite=Lax. `next/headers`의 `cookies()`로 발급/파기. 서명은 `jose` 라이브러리 + `AUTH_SECRET` 환경변수.
- **영속 계층:** **확정 — SQLite (better-sqlite3)**. `lib/db/client.ts`에서 싱글턴 커넥션, `data/app.db` 파일(gitignore 대상). `users` 테이블: id, email(unique), password_hash, nickname, created_at.

## 구현 범위
### 신규 생성
- `lib/db/client.ts` — better-sqlite3 싱글턴 커넥션 + `users` 테이블 마이그레이션(최초 실행 시 생성)
- `lib/auth/session.ts` — JWT 서명 쿠키 발급/파기, `getSession()` 서버 유틸 (kebab-case)
- `lib/auth/password.ts` — 비밀번호 해시/검증 (bcrypt or argon2)
- `lib/validation/auth-schema.ts` — Zod `signupSchema`·`loginSchema`
- `services/auth-service.ts` — 사용자 조회/생성, 인증 검증 (실패 시 Error throw)
- `types/user.ts` — `User`·`Session`·`SignupInput`·`LoginInput`·`AuthResult`
- `actions/auth.ts` — `signup()`·`login()`·`logout()` Server Action (또는 `app/api/auth/*/route.ts`)
- `components/features/auth/auth-form.tsx` — DS **AuthForm** (mode: login|signup, Client Component)
- `app/login/page.tsx` — 로그인 화면 (`/login`)
- `app/signup/page.tsx` — 회원가입 화면 (`/signup`)

### 수정
- (해당 없음 — 기존 앱 파일 없음) / 스캐폴딩 후 `app/layout.tsx`에 Pretendard 폰트·글로벌 토큰 연결 필요 (아래 주의사항 참조)

## 기존 패턴 (구현 시 참조)
- **컴포넌트 방식:** 페이지(`page.tsx`)는 **Server Component** 기본, 폼(입력·상태·제출)은 `'use client'` **Client Component**로 분리 (컨벤션 §5 경계).
- **데이터 페칭/뮤테이션:** **Server Action** 우선(§7-3), 세션 조회는 서버 컴포넌트에서 `getSession()` 직접 호출.
- **훅 네이밍:** camelCase `useXxx` (현 이슈에선 커스텀 훅 미필요). 파일명은 kebab-case (team: kebab-case-files).
- **에러 처리:** API 레이어 실패 시 `Error` throw (team: api-error-throw) → Server Action에서 `AuthResult`로 변환해 인라인 표시.
- **스타일 모드:** **확정 — Tailwind v4** (컨벤션 §1 기본값). DS 토큰은 `globals.css`의 `@theme`/CSS 변수로 매핑.
- **스타일 패턴:** Tailwind utility + `cn()` 헬퍼. shadcn/ui 도입 시 cva() 변형 사용.

## 테스트 전략
- SKIP_TESTS: **false**
- 근거: 신규 파일·서버 액션(엔드포인트)·서비스·Zod 스키마를 다수 추가하는 브랜뉴 인증 기능. 비밀번호 해시/검증, 입력 검증, 세션 발급 로직은 회귀 위험이 커 단위·통합 테스트 필요.

## 주의사항
- **⚠️ 프로젝트 스캐폴딩 선행 필요:** 이 저장소는 완전 greenfield로 `package.json`·`app/`·빌드 설정이 없다. Phase 2 구현자는 이 이슈 착수 시 **Next.js 프로젝트 자체를 먼저 스캐폴딩**(package.json, tsconfig, app/ 디렉토리, globals.css, Pretendard next/font, Tailwind 설정 등)해야 한다. 인증 기능 구현이 실제로는 "앱 초기 세팅 + 인증"의 결합 작업임을 인지할 것.
- **✅ 컨벤션 vs 이슈 요구 충돌 — 사용자 확인 완료:** REACT_NEXT_CONVENTIONS §1은 관리형 인증(Clerk/Auth0)을 권장하지만, 이슈 #1의 기획 요구(이메일+비밀번호)를 우선해 **자체 구현**으로 확정. next-auth 패턴은 지양하고 Server Action + `cookies()` 기반 최소·명시적 구현을 택한다.
- **보안:** 비밀번호 평문 저장·로깅 금지. 로그인 실패 사유(이메일 없음 vs 비번 틀림)를 구분 노출하지 말 것(계정 열거 방지). 세션 쿠키는 HttpOnly·Secure·SameSite. CSRF 고려(Server Action은 기본 보호되나 Route Handler 채택 시 별도 방어). `AUTH_SECRET`은 `.env.local`(gitignore)에 보관.
- **타입 경계면:** `User.passwordHash`가 클라이언트로 유출되지 않도록 응답 DTO(`Session`/공개 User)를 분리할 것. Server Action 반환 `AuthResult`와 폼 컴포넌트가 기대하는 에러 shape을 일치시킬 것.
- **확정된 결정 (사용자 확인 완료):** 인증=자체 구현, DB=SQLite(better-sqlite3), 세션=JWT 서명 쿠키, 스타일=Tailwind v4.
