# 테스트 계획 — 이슈 #1 회원가입/로그인

## 테스트 환경
- 테스트 러너: **vitest** (감지 안 됨 → 스택 기준 선택. Next.js 15 + TS, React Query 미사용, 서버 액션/서비스 단위 테스트 중심이라 vitest가 자연스러운 기본값. jsdom/E2E 불필요 — 이번 레이어는 DOM 렌더링 없이 서버 로직만 검증)
- @testing-library/react: 미설치 (이번 이슈 테스트 범위에 컴포넌트 렌더 테스트 없음 — `auth-form.tsx`/페이지는 이번 스펙에서 서버 로직에 집중, UI 컴포넌트 테스트는 범위 밖)
- msw: 미설치 (해당 없음 — 스펙 확정상 API 엔드포인트 대신 Server Action 사용, fetch 기반 통신 없음)
- 모킹 전략: `vi.mock()` — 레이어 간 경계(action → service → db/session)를 모킹으로 격리
- **RUN: false** — package.json/vitest 설정이 아직 없는 완전 greenfield 저장소. Phase 2가 스캐폴딩을 마친 뒤에만 실행 가능 (spec의 "주의사항" 항목과 동일한 이유)

## Phase 2가 준비해야 할 것
1. **프로젝트 스캐폴딩** (spec 주의사항에 이미 명시): `package.json`, `tsconfig.json`(`"paths": { "@/*": ["./*"] }` 포함), Next.js App Router 구조.
2. **의존성 설치**
   - `vitest`, `vite-tsconfig-paths`(또는 vitest.config에서 직접 alias 설정) — 테스트가 `@/lib/...`, `@/services/...`, `@/actions/...`, `@/types/user` alias를 사용함
   - `better-sqlite3`, `@types/better-sqlite3` — `services/auth-service.test.ts`가 실제 `better-sqlite3`로 격리된 in-memory DB를 직접 생성해 사용함
   - `jose` — JWT 서명/검증 (spec 확정)
   - 비밀번호 해시 라이브러리: `bcrypt`(+`@types/bcrypt`) 또는 `argon2` 중 택1 (spec은 "bcrypt/argon2" 명시, 미확정. 함수 시그니처만 아래 계약을 지키면 테스트는 라이브러리 선택에 무관)
   - `zod` — 입력 검증
3. **package.json script**: `"test": "vitest run"` (또는 `"test:unit"`), `"test:watch": "vitest"`
4. **vitest.config.ts**: `resolve.alias`에 `@` → 프로젝트 루트 매핑 (tsconfig paths와 동일하게)
5. **환경변수**: `.env.local`에 `AUTH_SECRET` (테스트는 `process.env.AUTH_SECRET`이 없으면 자체적으로 32자 이상 더미 값을 주입하므로 테스트 실행 자체엔 `.env.local` 불필요하지만 실제 앱 구동엔 필요)

## 테스트가 가정하는 함수 시그니처 계약 (Phase 2 구현 시 반드시 일치)
테스트는 아직 존재하지 않는 구현 파일을 import한다 (TDD Red). Phase 2는 아래 계약을 그대로 만족해야 테스트가 그린으로 전환된다.

| 파일 | export | 계약 |
|------|--------|------|
| `lib/db/client.ts` | `getDb(): Database.Database` | `process.env.DB_PATH` 경로로 커넥션 생성(테스트는 `:memory:` 주입), 싱글턴, 최초 호출 시 `users` 테이블(id, email UNIQUE, password_hash, nickname, created_at) 생성 |
| `lib/auth/password.ts` | `hashPassword(plain: string): Promise<string>` | 매 호출 다른 해시(salt) |
| | `verifyPassword(plain: string, hash: string): Promise<boolean>` | 틀린 값/빈 문자열은 false |
| `lib/validation/auth-schema.ts` | `signupSchema`, `loginSchema` (Zod) | email 형식 검증, password 최소 길이, passwordConfirm 일치 `refine`, nickname 필수 |
| `lib/auth/session.ts` | `createSessionToken(session: Session): Promise<string>` | JWT 서명 |
| | `verifySessionToken(token: string): Promise<Session \| null>` | 위조/오류 시 null |
| | `setSessionCookie(session: Session): Promise<void>` | `next/headers` `cookies()`(async) → `.set(name, value, { httpOnly: true, sameSite: 'lax', ... })` |
| | `destroySession(): Promise<void>` | `cookies().delete(...)` 호출 |
| | `getSession(): Promise<Session \| null>` | 쿠키 없음/위조 시 null |
| `services/auth-service.ts` | `createUser(input: SignupInput): Promise<User>` | `lib/db/client`의 `getDb()`만 사용, 중복 이메일 시 Error throw, 비밀번호는 해시로 저장 |
| | `authenticateUser(input: LoginInput): Promise<User>` | 이메일 없음/비번 불일치 모두 **동일한 Error.message**로 throw (계정 열거 방지) |
| `actions/auth.ts` | `signup(input: SignupInput): Promise<AuthResult>` | zod 검증 실패 시 서비스 호출 없이 `{ ok:false, field, error }` 반환. 성공 시 `createUser` → `setSessionCookie` → `{ ok:true }` |
| | `login(input: LoginInput): Promise<AuthResult>` | 실패 시 `field` 없는 동일 일반 에러 메시지, 성공 시 `setSessionCookie` 호출 |
| | `logout(): Promise<void>` | `destroySession()` 호출 |

## 테스트 파일 명령어

| stack | 실행 명령어 |
|-------|-----------|
| next (vitest) | `npx vitest run` |

```bash
# qa-validator가 Phase 2 완료 후 이 명령어를 그대로 실행한다
npx vitest run lib/auth/password.test.ts lib/validation/auth-schema.test.ts lib/db/client.test.ts lib/auth/session.test.ts services/auth-service.test.ts actions/auth.test.ts
```

## 생성된 테스트 파일

| 파일 경로 | 테스트 대상 | 케이스 수 |
|----------|-----------|---------|
| `lib/auth/password.test.ts` | `hashPassword` / `verifyPassword` | 5 |
| `lib/validation/auth-schema.test.ts` | `signupSchema` / `loginSchema` | 8 |
| `lib/db/client.test.ts` | `getDb` (싱글턴 + users 스키마) | 4 |
| `lib/auth/session.test.ts` | `createSessionToken` / `verifySessionToken` / `setSessionCookie` / `destroySession` / `getSession` | 7 |
| `services/auth-service.test.ts` | `createUser` / `authenticateUser` | 7 |
| `actions/auth.test.ts` | `signup` / `login` / `logout` Server Action | 8 |

## 스펙 → 테스트 케이스 매핑

| 성공 조건 / 엣지케이스 | 테스트 케이스 | 파일 |
|----------|------------|------|
| 회원가입 시 계정 생성 + 인증 세션 진입 | '유효한 입력으로 회원가입하면 계정을 생성하고 세션을 발급한 뒤 ok:true를 반환한다' | actions/auth.test.ts |
| 이미 가입된 이메일 → 409 상당 인라인 에러 | '이미 가입된 이메일로 재가입을 시도하면 에러를 throw한다' | services/auth-service.test.ts |
| " | '이미 사용 중인 이메일이면 ok:false와 email 필드 에러를 반환하고 세션을 발급하지 않는다' | actions/auth.test.ts |
| 비밀번호/비밀번호 확인 불일치 | '비밀번호와 비밀번호 확인이 일치하지 않으면 passwordConfirm 필드 에러와 함께 실패한다' | lib/validation/auth-schema.test.ts |
| " | '비밀번호와 비밀번호 확인이 일치하지 않으면 서비스 호출 없이 ok:false를 반환한다' | actions/auth.test.ts |
| 이메일 형식 오류 | '이메일 형식이 아니면 email 필드 에러와 함께 실패한다' | lib/validation/auth-schema.test.ts |
| " | '이메일 형식이 올바르지 않으면 서비스 호출 없이 ok:false를 반환한다' | actions/auth.test.ts |
| 비밀번호 최소 길이 미달 | '비밀번호가 최소 길이 미만이면 password 필드 에러와 함께 실패한다' | lib/validation/auth-schema.test.ts |
| " | '비밀번호가 최소 길이 미만이면 서비스 호출 없이 ok:false를 반환한다' | actions/auth.test.ts |
| 로그인 성공 시 세션 발급 + 보호 페이지 진입 | '올바른 이메일/비밀번호로 로그인하면 세션을 발급하고 ok:true를 반환한다' | actions/auth.test.ts |
| 세션 유지(HttpOnly 쿠키, 새로고침/재방문 보존) | '유효한 세션 쿠키가 있으면 세션 정보를 반환한다' | lib/auth/session.test.ts |
| 로그아웃 시 세션 파기 | '세션 쿠키를 삭제(파기)한다' (session.ts) / '세션을 파기한다' (auth.ts) | lib/auth/session.test.ts, actions/auth.test.ts |
| 비밀번호 평문 미저장(해시 저장) | '비밀번호를 평문이 아닌 해시로 저장한다' | services/auth-service.test.ts |
| 존재하지 않는 이메일/비밀번호 불일치 → 동일 일반 에러(계정 열거 방지) | '존재하지 않는 이메일과 틀린 비밀번호는 동일한 에러 메시지를 반환한다' | services/auth-service.test.ts |
| " | '존재하지 않는 이메일과 잘못된 비밀번호는 동일한 일반 에러 메시지를 반환한다' | actions/auth.test.ts |
| HttpOnly·Secure·SameSite=Lax 쿠키 | 'HttpOnly, Secure, SameSite=Lax 옵션으로 세션 쿠키를 설정한다' | lib/auth/session.test.ts |

## 범위 밖 (이번 test-writer 산출물에 포함하지 않음)
- `components/features/auth/auth-form.tsx`, `app/login/page.tsx`, `app/signup/page.tsx`: 렌더링/인터랙션 테스트 미작성. 스펙의 성공 조건이 서버 로직(세션/검증/저장) 중심이고, `@testing-library/react`가 미설치 상태이며, 컴포넌트 인터랙션 명세(버튼 클릭 등 구체 시나리오)가 스펙에 명시적으로 없어 test-writer 에러 핸들링 규칙("스펙에 훅/인터랙션 정보 없음")에 따라 생략함. 필요 시 Phase 2 또는 별도 요청으로 추가 가능.
- `types/user.ts`: 타입 전용 파일이라 런타임 테스트 대상 아님(다른 테스트 파일들이 import하며 간접 검증됨).
