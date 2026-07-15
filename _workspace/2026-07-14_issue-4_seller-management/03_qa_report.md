---
issue_id: 4
kind: qa
title: 사장님 메뉴/주문 관리 — QA 검증 결과
---

## 검증 결과: PASS

> 최종 판정 기준: 명령 재실행 결과(전부 확인) + 코드 리딩 기반 스펙/경계면/보안 검증.
> SKIP_TESTS 사용자 오버라이드로 01_test_plan.md 없음 → 테스트 파일 자동 생성/실행(Step 0) 생략, 기존 테스트 스위트 + 정적 분석 + 마이그레이션 실동작 검증으로 대체.

## 명령 재실행 결과 (implementer 주장 검증)

| 명령 | implementer 주장 | 실제 재실행 결과 | 일치 |
|------|------|------|------|
| `npx tsc --noEmit` | PASS (에러 0) | 출력 없음 = 에러 0 | ✅ |
| `npx vitest run` | PASS (7 파일 / 58 테스트) | `Test Files 7 passed (7)` / `Tests 58 passed (58)` | ✅ |
| `npx next build` | PASS (10 라우트, `/seller`·`/seller/menu`·`/seller/orders` 포함) | `✓ Generating static pages (10/10)`, 라우트 테이블에 `/seller`, `/seller/menu`, `/seller/orders` 모두 존재 | ✅ |

3종 명령 전부 직접 재실행하여 보고서 수치와 100% 일치함을 확인. 조작/과장 없음.

---

## 항목별 검증

### 1. tsc/vitest/next build 재실행
위 표 참조. 전부 통과 확인.

### 2. `mapOrder` 버그 수정 + 상태 전이 단방향 강제
- `services/order-service.ts:34` — `status: row.status as OrderStatus` (하드코딩 제거 확인, 스펙 §"주의사항" 회귀 버그 실제 수정됨).
- `services/order-service.ts:178-195` `updateOrderStatus`:
  - 소유권 서브쿼리로 조회(`WHERE o.id = ? AND o.restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = ?)`) → 없으면 조기 `return`(no-op).
  - `ORDER_STATUS_NEXT[current] !== next`이면 무시 → 역방향/건너뛰기/`completed` 재전이(`ORDER_STATUS_NEXT.completed === null`) 모두 차단됨을 로직상 확인.
- `types/order.ts:14-18` `ORDER_STATUS_NEXT`가 `pending→cooking→completed→null` 단방향 체인으로 정의됨.

### 3. 마이그레이션 안전성 (`lib/db/client.ts` `ensureColumn`/`migrateSellerColumns`)
- 실 DB 파일(`data/app.db`) 자체는 건드리지 않고, **복사본**에 대해 `getDb()`를 실제로 두 번(별도 프로세스) 실행해 검증:
  - 마이그레이션 전: `data/app.db`(원본) 확인 결과 `users`에 `role` 없음, `restaurants`에 `owner_id` 없음 (기존 이슈 #1~#3 상태 그대로), `users` 1행 · `restaurants` 5행.
  - 1차 실행: `role`/`owner_id` 컬럼 추가됨, 기존 1 user는 `role='customer'`(DEFAULT), 기존 5 restaurants는 `owner_id=null` — 데이터 손실 없음.
  - 2차 실행(같은 파일에 재실행, 컬럼 이미 존재): 에러 없이 종료(`exit code 0`), 컬럼 중복 추가 없음 → **멱등성 확인**.
- 결론: `PRAGMA table_info` 확인 후 조건부 `ALTER TABLE`이 실제로 안전하게 동작함. 원본 `data/app.db`는 검증 과정에서 수정하지 않았음(복사본 사용).

### 4. 소유권 스코프
- `services/menu-service.ts` `updateMenuItem`/`deleteMenuItem`: `WHERE id = ? AND restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = ?)` 서브쿼리로 스코프. 매칭 0건이면 `run()`이 그냥 0 rows affected로 종료(no-op), 예외 없음 — 타 사장님 리소스 조작 시 조용히 무시됨.
- `deleteMenuItem`은 트랜잭션 내에서 소유 확인 후에만 `cart_items`/`menu_items` 삭제 — 소유 아니면 트랜잭션 전체가 조기 return.
- `services/order-service.ts` `updateOrderStatus`도 동일 패턴의 스코프 서브쿼리.
- `lib/auth/guard.ts` `requireOwner()`: 비로그인 → `/login`, `role !== 'owner'` → `/`. 통과 시 세션 반환.
- **주의**: `actions/seller.ts`에 `requireOwnerSession()`이라는 거의 동일한 로직이 `lib/auth/guard.ts`의 `requireOwner()`와 별개로 중복 정의되어 있음(코드 중복, DRY 위반). 기능은 동일하나 향후 게이트 로직 변경 시 두 곳을 모두 고쳐야 하는 유지보수 리스크 — `[주의]`로 기록(기능 오류 아님).

### 5. role 기반 접근 제어
- `app/seller/page.tsx`, `app/seller/menu/page.tsx`, `app/seller/orders/page.tsx` 3개 페이지 모두 최상단에서 `await requireOwner()` 호출 — customer 접근 시 `/`로 리다이렉트, 비로그인은 `/login`.
- `lib/auth/session.ts` `verifySessionToken`: role 필드 누락/비정상 값이면 `USER_ROLES` 포함 여부 체크 후 `'customer'`로 폴백 — 이슈 #4 이전 발급 토큰도 안전하게 처리됨(로직 확인, 재로그인 불필요).

### 6. 테스트 픽스처 수정 — assertion 훼손 여부
- `git diff`로 4개 auth 관련 테스트 파일 확인: 전부 `role: 'customer'` 필드를 fixture 객체에 **추가**만 함. 기존 `expect(...)` assertion은 단 하나도 변경/삭제되지 않음. 순수 타입 호환을 위한 추가 필드.
- 새 테스트 케이스는 추가되지 않았다는 보고와 일치(SKIP_TESTS 준수).

### 7. `services/restaurant-service.test.ts` `result[0]!` 변경
- `git diff` 확인: 7곳 모두 직전 줄에 `expect(result).toHaveLength(1)`(배열 길이 보장)이 이미 존재하는 상태에서 `result[0]` → `result[0]!`로 non-null assertion만 추가. 그 외 assertion 내용(`.name`, `.category`, `.createdAt`, `toMatchObject`)은 전혀 변경되지 않음.
- 참고: 이 파일은 세션 시작 시점 스냅샷에서는 untracked(`??`)로 표시되었으나, 실제로는 `git ls-tree HEAD`에 존재(이슈 #2 커밋 `75d0b3c`에서 이미 추적 중이던 파일). implementer 보고서의 "untracked 파일" 표현은 부정확하나(세션 시작 시점 상태를 오인한 것으로 추정), 실제 diff 내용 자체(단언 강화 없이 타입 단언만 추가)는 사실과 일치. 버그를 숨기는 assertion 약화 아님.

### 8. CSS 컨벤션 — named `--spacing-*` 재도입 여부
- `grep -rn -- "--spacing-"` 신규/변경 seller 관련 파일에서 결과 없음.
- `app/globals.css`에 "커스텀 spacing 토큰 미정의" 주석이 유지되고 있으며, seller 컴포넌트들은 전부 Tailwind 기본 숫자 스케일(`p-4`, `gap-6`, `px-4`, `py-2`, `gap-1`, `gap-2` 등)만 사용. 재도입 없음 확인.
- `cn()`(`@/lib/utils`) 조건부 클래스 일관 사용 확인(`menu-manager.tsx`, `menu-item-form.tsx`, `create-restaurant-form.tsx`).

### 9. Server/Client 경계
- `'use client'` 컴포넌트 4개(`menu-manager.tsx`, `menu-item-form.tsx`, `create-restaurant-form.tsx`) 전부 `@/actions/seller`(Server Action)만 import, `getDb`/`@/services/*`/`@/lib/db` 직접 import 없음 확인(grep 결과 0건).
- `seller-order-card.tsx`는 `'use client'` 없는 Server Component로 `OrderSummary` 재사용 + form action만 사용 — 적절.
- 3개 페이지(`app/seller/*`)는 RSC로 서비스 직접 호출, 뮤테이션은 Server Action + `revalidatePath` 패턴 일관 유지.

---

## 스펙 달성 여부 (Phase 1 성공 조건 기준)

| 성공 조건 | 상태 | 근거 (파일:라인) |
|----------|------|-----------------|
| 1. owner만 `/seller` 접근, customer/비로그인 리다이렉트 | ✅ | `lib/auth/guard.ts:11-20`, 3개 `app/seller/*/page.tsx`에서 `requireOwner()` 호출 |
| 2. 메뉴 CRUD 즉시 반영(`revalidatePath`) | ✅ | `actions/seller.ts:37-43` `revalidateSeller()` — `/seller`, `/seller/menu`, `/seller/orders`, `/restaurants/[id]` 전부 재검증 |
| 3. 주문 최신순 + 단방향 전이(소유 한정) | ✅ | `services/order-service.ts:149-171`(ORDER BY o.id DESC), `:178-195`(스코프+단방향) |
| 4. 소유 음식점 없으면 1개 생성 후 진입(1:1) | ✅ | `services/restaurant-service.ts:137-166`(`RESTAURANT_EXISTS` 가드), `app/seller/page.tsx:17-29`(분기) |
| 엣지: 타 음식점 조작 no-op | ✅ | `services/menu-service.ts:52-57, 65-83`, `order-service.ts:181-189` 스코프 서브쿼리 |
| 엣지: completed 재전이 차단 | ✅ | `types/order.ts:17` `completed: null` + `order-service.ts:192` 비교 |
| 회귀: `mapOrder` status 하드코딩 | ✅ (수정 확인) | `services/order-service.ts:34` |
| 로딩 상태 처리 | ✅ | `useTransition`의 `isPending`으로 버튼 disabled(`menu-item-form.tsx:102`, `create-restaurant-form.tsx:93`, `menu-manager.tsx:84`) |
| 에러 상태 처리 | ✅ | `SellerActionResult` union + 인라인 에러 메시지(`menu-item-form.tsx:97`, `create-restaurant-form.tsx:89`) |
| 빈 상태 처리 | ✅ | "아직 등록된 메뉴가 없어요"(`menu-manager.tsx:45`), "들어온 주문이 없어요"(`app/seller/orders/page.tsx:32`) |

## 타입 경계면 검증

| 경계면 | 상태 | 상세 |
|--------|------|------|
| API/DB Row ↔ Service | ✅ | `OrderRow.status: string` → `mapOrder`에서 `as OrderStatus`로 명시 좁힘, `RestaurantRow.owner_id: string \| null` → `mapRestaurant`에서 `ownerId: row.owner_id ?? null` |
| Service ↔ Action | ✅ | `actions/seller.ts`의 파라미터/반환 타입이 서비스 시그니처와 일치(`MenuItemInput`, `RestaurantInput`, `OrderStatus`) |
| Action ↔ Client Component | ✅ | `SellerActionResult` union을 폼에서 `if (result.ok)` 분기로 정확히 소비 |
| Session ↔ Guard | ✅ | `Session.role: UserRole`(non-null, `verifySessionToken`에서 항상 폴백 보장) → `requireOwner`에서 안전하게 `session.role !== 'owner'` 비교 |
| Server/Client 경계 | ✅ | Client 컴포넌트는 Server Action만 import, `getDb`/서비스 유입 없음(§9 확인) |

## CSS 스타일 검증

| 항목 | 상태 | 상세 |
|------|------|------|
| 스타일 모드 일관성 | ✅ | Tailwind v4 유틸리티 + DS 토큰 클래스만 사용 |
| named `--spacing-*` 재도입 여부 | ✅ (재도입 없음) | grep 0건, 기본 숫자 스케일만 사용 |
| cn() 사용 | ✅ | 조건부 클래스 전부 `cn()` 경유 |
| a11y (focus-visible) | ✅ | 입력 필드에 `focus-visible:ring-2 focus-visible:ring-primary` 일관 적용 |

## 잠재적 위험

### [치명] (수정 필요)
없음.

### [주의] (검토 권장)
- `actions/seller.ts:26-35` `requireOwnerSession()` — `lib/auth/guard.ts:11-20`의 `requireOwner()`와 로직이 완전히 동일하게 중복 정의됨. 기능상 문제는 없으나(현재는 두 구현이 일치), 향후 게이트 조건이 바뀔 때 한쪽만 수정하면 불일치가 발생할 수 있음. `actions/seller.ts`가 `guard.ts`의 `requireOwner`를 재사용하도록 리팩토링 권장(이번 QA에서는 기능 영향 없어 직접 수정하지 않음).
- `implementer` 보고서의 "restaurant-service.test.ts는 이전 세션이 남긴 untracked 파일" 표현은 실제 git 이력과 다름(이슈 #2 커밋에 이미 tracked 상태). 다만 diff 내용(순수 타입 단언 추가) 자체는 사실과 일치하므로 보고 정확도의 사소한 오류이며 기능/검증 결과에는 영향 없음.

### [확인] (사용자 확인 필요)
없음.

## 마이그레이션 실동작 검증 상세
- 검증 방법: `data/app.db`(+ `-wal`/`-shm`)를 스크래치 디렉토리로 복사 → `DB_PATH` 환경변수로 복사본을 가리키게 하여 `tsx`로 `getDb()`를 별도 프로세스에서 2회 순차 실행.
- 1회차: `role`/`owner_id` 컬럼 신규 추가, 기존 데이터(user 1건, restaurant 5건) 보존, 기본값(`role='customer'`, `owner_id=null`) 정상 적용.
- 2회차(멱등성 재확인): 동일 파일에 재실행 — 에러 없이 종료, 컬럼 중복 추가 없음.
- 원본 `data/app.db`는 이 검증 과정에서 전혀 수정되지 않음(복사본에서만 작업).

## 테스트 커버리지
- 테스트 파일 존재: 있음(기존 auth/db/restaurant 테스트 7개 파일, 58개 케이스 — 전부 이슈 #1~#3에서 작성된 것 + 이번 이슈의 타입 변경에 맞춘 픽스처 보정).
- 누락된 테스트: `menu-service`, `order-service`의 `updateOrderStatus`/`listOrdersByRestaurant`, `lib/auth/guard.ts`, `menu-schema.ts`에 대한 전용 테스트 없음 — **SKIP_TESTS 사용자 오버라이드에 따른 의도된 누락**이며 01_spec.md "테스트 전략" 섹션에 사전 고지되어 있음(스펙 위반 아님).

## 수정 완료 항목
없음(발견된 문제가 모두 [주의] 수준이며 기능적 결함이 아니어서 QA 단계에서 직접 수정하지 않음).

## 최종 판정: PASS

implementer가 보고한 3종 명령(tsc/vitest/next build) 결과는 전부 직접 재실행하여 수치까지 정확히 일치함을 확인했다. 스펙의 핵심 회귀 버그(`mapOrder` status 하드코딩)는 실제로 수정되었고, 상태 전이 단방향 강제·소유권 스코프·role 기반 접근 제어·세션 role 폴백·마이그레이션 멱등성 모두 코드 리딩과 별도 프로세스 실행을 통해 실동작 검증했다(마이그레이션은 원본 DB가 아닌 복사본으로 안전하게 검증). 테스트 픽스처 수정과 `restaurant-service.test.ts`의 non-null assertion 추가는 assertion 약화나 로직 변경 없이 순수 타입 호환/필드 추가에 그쳤음을 git diff로 확인했다. CSS 컨벤션(named spacing 미도입)과 Server/Client 경계(Client 컴포넌트의 getDb/서비스 미유입)도 위반 없음.

경미한 개선 권고(비차단): `actions/seller.ts`의 `requireOwnerSession()`을 `lib/auth/guard.ts`의 `requireOwner()`로 통합해 게이트 로직 중복 제거.
