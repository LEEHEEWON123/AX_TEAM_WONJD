---
issue_id: 4
kind: implementation
title: 사장님 메뉴/주문 관리 — 구현 결과
---

# 구현 완료 보고 — 이슈 #4 사장님 메뉴/주문 관리

이전 세션에서 완료된 Model 레이어(types/*, lib/db/client.ts 마이그레이션)를 그대로 두고,
나머지 레이어(services → actions → components → app)를 MVVM 순서로 구현했다.

## 검증 결과 (요청 명령 3종)

| 명령 | 결과 |
|------|------|
| `npx tsc --noEmit` | PASS (에러 0) |
| `npx vitest run` | PASS (7 파일 / 58 테스트 통과) |
| `npx next build` | PASS (10 라우트 생성, `/seller`·`/seller/menu`·`/seller/orders` 포함) |

---

## 구현 완료 목록

### 신규 생성
- `services/menu-service.ts` — `createMenuItem`/`updateMenuItem`/`deleteMenuItem`. 전부 owner_id 소유 스코프(`WHERE ... restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = ?)`). 삭제는 트랜잭션으로 `cart_items` 고아 행까지 정리.
- `lib/validation/menu-schema.ts` — `menuItemSchema`(name 1자+, price 양의 정수), `restaurantSchema`(카테고리 닫힌 셋 + etaMin ≤ etaMax refine).
- `lib/auth/guard.ts` — `requireOwner()`: 비로그인 → `/login`, 손님 → `/`(홈). owner Session 반환.
- `actions/seller.ts` — `createRestaurantAction`/`createMenuItemAction`/`updateMenuItemAction`/`deleteMenuItemAction`/`updateOrderStatusAction`. 전부 `'use server'` + owner 세션 게이트 + zod 검증 + `revalidatePath`. 폼 에러 표시용 `SellerActionResult` union 반환(auth `AuthResult` 선례).
- `app/seller/page.tsx` — 대시보드. 소유 음식점 없으면 `CreateRestaurantForm`, 있으면 메뉴/주문 관리 링크 + 요약 카운트.
- `app/seller/menu/page.tsx` — 메뉴 관리(소유 음식점 없으면 `/seller`로 redirect).
- `app/seller/orders/page.tsx` — 주문 관리(최신순, 빈 상태 문구).
- `components/features/seller/create-restaurant-form.tsx` — Client, `useTransition` + `createRestaurantAction`.
- `components/features/seller/menu-item-form.tsx` — Client, 등록/수정 공용 폼. `item` prop 유무로 모드 분기.
- `components/features/seller/menu-manager.tsx` — Client, 목록 + 인라인 수정 토글 + 삭제(`useTransition` → `router.refresh()`).
- `components/features/seller/seller-order-card.tsx` — Server, `OrderSummary` 재사용 + `updateOrderStatusAction` form action(다음 단계 버튼).

### 수정
- `services/order-service.ts` — **[버그 수정] `mapOrder`가 `status: 'pending'` 하드코딩 → `row.status as OrderStatus`로 실제 매핑.** `listOrdersByRestaurant`(항목 포함 최신순), `updateOrderStatus`(소유권 스코프 + `ORDER_STATUS_NEXT` 단방향 검증) 추가.
- `services/restaurant-service.ts` — `RestaurantRow.owner_id` + `mapRestaurant` `ownerId` 매핑 추가. `getRestaurantByOwner`(1:1 소유 조회), `createRestaurant`(이미 소유 시 `RESTAURANT_EXISTS` throw) 추가.
- `services/auth-service.ts` — `UserRow.role` 추가, `createUser`가 `input.role` 저장, `authenticateUser`가 role 반환. 비정상 값 `'customer'` 폴백 헬퍼.
- `lib/auth/session.ts` — `createSessionToken`에 role 포함, `verifySessionToken`이 role 복원 + **누락/비정상 시 `'customer'` 폴백**(기존 발급 토큰 호환).
- `lib/validation/auth-schema.ts` — `signupSchema`에 `role: z.enum(USER_ROLES)` 추가.
- `actions/auth.ts` — signup/login의 `setSessionCookie`에 `role: user.role` 전달.
- `components/features/auth/auth-form.tsx` — 회원가입 시 가입 유형 라디오(손님/사장님, 기본 손님) 추가, role을 signup에 전달.
- `components/features/restaurants/top-header.tsx` — `role?` prop 추가, owner이면 `/seller` 진입 링크 노출.
- `app/page.tsx`, `app/restaurants/[id]/page.tsx` — TopHeader에 `role` 전달(owner 링크 노출용).

### 테스트 픽스처 유지보수 (신규 커버리지 아님)
이전 세션이 커밋한 타입 변경(`SignupInput.role`·`Session.role`이 required)으로 기존 테스트가 tsc/런타임에서 깨져, 통과 상태 복원을 위해 픽스처만 최소 수정했다. 새 테스트 케이스는 추가하지 않았다(사용자 SKIP_TESTS 오버라이드 준수).
- `services/auth-service.test.ts` — createTestDb users 테이블에 `role` 컬럼, `SIGNUP_INPUT`에 `role` 추가.
- `lib/auth/session.test.ts` — `SESSION`에 `role` 추가.
- `actions/auth.test.ts` — `VALID_SIGNUP`/`MOCK_USER`에 `role` 추가.
- `lib/validation/auth-schema.test.ts` — `VALID_SIGNUP`에 `role` 추가.
- `services/restaurant-service.test.ts` (이전 세션이 남긴 **untracked** 파일) — 내 변경과 무관하게 `noUncheckedIndexedAccess`로 tsc 6건 실패(스태시 검증으로 사전 확인). 빌드 언블록 위해 `result[0]` → `result[0]!` 6곳만 수정.

---

## 스펙 성공 조건 대비 구현 매핑

| 성공 조건 | 구현 | 상태 |
|----------|------|------|
| 1. owner만 `/seller` 접근, 손님/비로그인 리다이렉트 | `requireOwner()` 게이트(3 페이지 공통) | 충족 |
| 2. 메뉴 등록/수정/삭제 즉시 반영 | 소유 스코프 서비스 + `revalidatePath('/seller*', '/restaurants/[id]')` | 충족 |
| 3. 주문 목록 최신순 + `pending→cooking→completed` 단방향 전이(소유 한정) | `listOrdersByRestaurant`(id DESC) + `updateOrderStatus`(owner_id 스코프 + `ORDER_STATUS_NEXT` 검증) | 충족 |
| 4. 소유 음식점 없는 owner는 생성 후 진입(1:1) | 대시보드 분기 + `createRestaurant` 1:1 가드 | 충족 |
| 엣지: 타 음식점 조작 no-op | UPDATE/DELETE의 `owner_id IN (...)` 스코프, 매칭 0 → no-op | 충족 |
| 엣지: completed 재전이 차단 | `ORDER_STATUS_NEXT.completed === null !== next` → 무시 | 충족 |
| 회귀: `mapOrder` status 하드코딩 | `row.status` 실제 매핑으로 수정 | 충족 |

## 준수 사항 체크
- Next.js 15 Promise params: 신규 seller 페이지는 params 미사용(정적 경로), 기존 `[id]` 페이지 `await params` 유지.
- Tailwind 기본 숫자 spacing만 사용, named `--spacing-*` 미도입.
- `getDb`/서비스 함수는 Server(page/action)에서만 import. Client 컴포넌트는 액션만 import(`menu-manager`/`menu-item-form`/`create-restaurant-form`).
- DS 토큰 클래스만 사용(`bg-bg`, `bg-surface`, `text-text-muted`, `bg-primary`, `border-border`, `text-danger` 등).
- id 스킴 유지: `owner_id`는 users TEXT UUID, restaurant/order는 INTEGER FK.

## 미구현 항목
없음. 스펙의 필수 범위 전부 구현.

## QA 검증 요청 사항
- **소유권 이중 게이트**: 세션 role은 UX 게이트, 실제 뮤테이션 권한은 `owner_id` 재확인. `updateOrderStatus`/`updateMenuItem`/`deleteMenuItem`의 스코프 서브쿼리가 타 사장님 데이터에 no-op인지 확인.
- **단방향 전이 경계**: `ORDER_STATUS_NEXT[current] !== next` 조건이 역방향·건너뛰기·completed 재전이를 모두 차단하는지(3종 모두 무시).
- **세션 role 폴백**: 이슈 #4 이전 발급 토큰(role 필드 없음)이 `verifySessionToken`에서 `'customer'`로 폴백되어 재로그인 없이 안전한지.
- **참조 무결성**: `deleteMenuItem`가 `cart_items` 고아 행을 트랜잭션으로 정리하고, `order_items`(스냅샷)는 건드리지 않아 주문 내역이 보존되는지.
- **revalidatePath 동적 경로**: `revalidatePath('/restaurants/[id]', 'page')` 형식이 공개 상세 반영에 유효한지(런타임 확인 권장).
- **타입 경계**: `mapOrder`/`mapRestaurant`가 DB 문자열(`status`, `category`, `owner_id`)을 union/nullable로 좁히는 지점.
