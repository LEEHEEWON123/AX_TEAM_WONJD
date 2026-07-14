## 구현 완료 목록

### 신규 생성 (프로젝트 스캐폴딩 포함)
- `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `vitest.config.ts` — Next.js 15 + TypeScript strict + Tailwind v4 + Vitest 스캐폴딩
- `app/layout.tsx`, `app/globals.css` — 루트 레이아웃 + 디자인시스템 토큰(`@theme`: color/font/space/radius)
- `app/page.tsx` — 홈 placeholder (이슈 #2에서 실 구현 예정)
- `types/user.ts` — `User`, `Session`, `SignupInput`, `LoginInput`, `AuthResult`
- `lib/db/client.ts` — better-sqlite3 싱글턴 커넥션, `users` 테이블 마이그레이션(unique email)
- `lib/auth/password.ts` — bcryptjs 해시/검증
- `lib/auth/session.ts` — `jose` JWT 서명 쿠키 발급(`setSessionCookie`)/검증(`verifySessionToken`)/파기(`destroySession`)/`getSession()`
- `lib/validation/auth-schema.ts` — Zod `signupSchema`/`loginSchema`
- `services/auth-service.ts` — `createUser`, `authenticateUser` (중복 이메일/틀린 비번/미존재 이메일 처리, 계정 열거 방지 위해 동일 에러 메시지)
- `actions/auth.ts` — `signup()`, `login()`, `logout()` Server Action, `AuthResult` 반환
- `components/features/auth/auth-form.tsx` — DS `AuthForm` (mode: login|signup, Client Component, 인라인 검증 에러)
- `app/login/page.tsx`, `app/signup/page.tsx` — 각 화면 (Server Component, AuthForm 렌더)

### 수정
- `.gitignore` — `node_modules/`, `.next/`, `.env*`, `data/*.db` 추가 (구현 이전엔 harness 패턴만 있고 표준 Next.js/시크릿 제외 규칙이 없었음)
- `.env.local` 신규 생성 (커밋 안 됨) — 랜덤 생성된 `AUTH_SECRET` (32바이트 hex)

## 테스트 파일과 구현 일치 여부
| 테스트 파일 | 케이스 수 | 결과 |
|---|---|---|
| lib/auth/password.test.ts | 5 | PASS |
| lib/validation/auth-schema.test.ts | 8 | PASS |
| lib/db/client.test.ts | 4 | PASS |
| lib/auth/session.test.ts | 7 | PASS |
| services/auth-service.test.ts | 7 | PASS |
| actions/auth.test.ts | 8 | PASS |

**39/39 PASS** (`npx vitest run`). `npx tsc --noEmit` clean. `npx next build` 성공(정적/동적 라우트 정상 생성). `npm run dev` 기동 후 `/login`, `/signup`, `/` 실제 curl로 200 확인, 로그인/회원가입 폼 한글 라벨 렌더 확인.

## 미구현 항목
없음 — 스펙(01_spec.md)의 성공 조건 4개, 예외/엣지케이스 전부 구현·테스트 커버.

## QA 검증 요청 사항
- `lib/auth/session.test.ts`에서 `noUncheckedIndexedAccess` 관련 타입 에러 1건을 non-null assertion(`!`)으로 수정함 — assertion 로직 자체는 변경 없음, 재확인 권장.
- Server Action(`actions/auth.ts`)의 실제 폼 제출 경로는 unit/service 레벨 테스트로만 검증됨 — 브라우저 E2E(폼 제출 → 쿠키 발급 → 리다이렉트)는 미검증. 필요시 QA에서 수동 확인 권장.
- `data/app.db`는 최초 요청 시 lazy 생성됨 — 새 클론 환경에서도 마이그레이션이 자동 실행되는지 확인 권장.
