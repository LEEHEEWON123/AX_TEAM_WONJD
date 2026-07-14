---
issue_id: 3
kind: implementation
title: 장바구니 & 주문
skip_tests: true
---

# 구현 완료 보고 (Phase 2 — Claude implementer)

> SKIP_TESTS: true (사용자 오버라이드 — "단순 구현이라 테스트 불필요"). Phase 1.5(테스트 선행 작성) 생략.
> MVVM(레이어) 순서: types → db → services → actions → components → app 순으로 구현.

## 구현 완료 목록

### 신규 생성
- `types/cart.ts` — `CartItem` / `Cart` / `AddToCartResult`(added | different_restaurant) 타입.
- `types/order.ts` — `Order` / `OrderItem` / `OrderWithItems` / `OrderStatus` · `ORDER_STATUSES`(['pending']).
- `services/cart-service.ts` — `getCart`(join+파생) / `addToCart`(UPSERT +1, 단일음식점 검증, force 교체) / `updateCartItemQuantity`(<=0 삭제) / `removeCartItem` / `clearCart`. snake_case→camelCase 명시 매핑(`mapCartItem`).
- `services/order-service.ts` — `createOrder`(단일 `db.transaction()`: orders INSERT → order_items 스냅샷 다건 INSERT → cart 삭제) / `getOrder`(소유자 스코프, 불일치 null) / `listOrders`(선택). `mapOrder`/`mapOrderItem` 명시 매핑.
- `actions/cart.ts` (`'use server'`) — `addToCartAction`(object arg, 미인증 `redirect('/login')`, `AddToCartResult` 반환, `revalidatePath('/cart')`) / `updateQuantityAction`(FormData) / `removeItemAction`(FormData).
- `actions/order.ts` (`'use server'`) — `placeOrderAction`: `getSession` → `createOrder` → `revalidatePath('/cart')` → `redirect('/orders/{id}')`.
- `app/cart/page.tsx` — 장바구니(Server Component). 미인증 `redirect('/login')`, `getCart` → 항목 리스트+요약 또는 빈 상태 CTA.
- `app/orders/[id]/page.tsx` — 주문 완료/상세(Server Component). `params`(Promise) `await` → `Number(id)` 방어 → `getOrder(userId, id)` 없으면 `notFound()`.
- `components/features/cart/add-to-cart-button.tsx` (`'use client'`) — 담기 버튼. `useTransition` + 서버액션 직접 호출, `different_restaurant` 시 `window.confirm` 후 force 재호출.
- `components/features/cart/cart-item-row.tsx` (Server) — 수량 스테퍼(−/＋)·삭제, 각 조작 Server Action `<form>`.
- `components/features/cart/cart-summary.tsx` (Server) — 총액 + 주문하기 `<form action={placeOrderAction}>`.
- `components/features/orders/order-summary.tsx` (Server) — 주문 항목 리스트 + 총액.

### 수정
- `lib/db/client.ts` — `cart_items`/`orders`/`order_items` `CREATE TABLE` 3종 + 인덱스 3종 추가. `getDb()` 내 `menu_items` 인덱스 이후 `db.exec()` 순차 호출. **기존 users/restaurants/menu_items 로직·seed는 미변경.**
- `components/features/restaurants/menu-item-row.tsx` — `isAuthenticated` prop 추가. 인증 시 `AddToCartButton`, 미인증 시 `/login` 유도 `Link`. placeholder span 제거.
- `components/features/restaurants/top-header.tsx` — 🛒 placeholder span → `/cart` `Link`(배지 없음, [확인 필요] #6 권장값).
- `app/restaurants/[id]/page.tsx` — `MenuItemRow`에 `isAuthenticated={session != null}` 전달(기존 `getSession()` 재사용).

## [확인 필요] 반영 결정 (모두 권장 기본값 채택)
| # | 항목 | 채택 |
|---|------|------|
| 1 | 장바구니 저장 | DB `cart_items`(user_id 키) + 담기부터 로그인 필요 |
| 2 | 다른 음식점 담기 | `addToCart`가 `different_restaurant` 반환 → UI `confirm` 후 force clear-and-replace |
| 3 | 주문 상태 | 생성 시 `'pending'` 단일, 상태 전이 없음 |
| 4 | 담긴 메뉴 삭제 | `createOrder`에서 빈/무결성 위반 시 `Error('EMPTY_CART')` throw |
| 5 | `/orders` 목록 | 미구현(선택). `listOrders`만 서비스에 제공. `/orders/[id]`까지 필수 충족 |
| 6 | 🛒 배지 | 미표시. 🛒 → `/cart` Link만 |

## 셀프 검증 결과

### 1) `npx tsc --noEmit`
- 신규/수정 코드에서 **타입 에러 0건**.
- 전체 tsc 에러는 **6건, 전부 `services/restaurant-service.test.ts`**(이슈 착수 전부터 존재하던 untracked 테스트 파일의 `noUncheckedIndexedAccess` 관련 기존 알려진 이슈) — 이번 구현과 무관.

### 2) `npx vitest run`
```
Test Files  7 passed (7)
      Tests  58 passed (58)
```
- 이슈 #1/#2 스위트 포함 **58/58 통과, 회귀 0건**. (`lib/db/client.test.ts` 12 tests 포함 — 신규 테이블 3종 추가에도 기존 스키마 테스트 정상.)

## 성공 조건 대비 구현 매핑
| 성공 조건 | 구현 | 상태 |
|----------|------|------|
| 1. 담기(+) → 장바구니 추가(재담기 +1), 미로그인 로그인 유도 | `addToCart` UPSERT + `AddToCartButton`/미인증 Link + `addToCartAction` redirect | 충족 |
| 2. `/cart` 표시·수량 +/−(0 삭제)·삭제·즉시 반영 | `getCart` 파생 + `CartItemRow` form + `revalidatePath` | 충족 |
| 3. 주문하기 → orders+order_items 스냅샷 생성·장바구니 비움·`/orders/[id]` 이동 | `createOrder` 트랜잭션 + `placeOrderAction` redirect | 충족 |
| 4. 빈 장바구니 빈 상태 + CTA, 주문 불가 | `app/cart/page.tsx` isEmpty 분기(주문 버튼 미노출) | 충족 |

## QA 검증 요청 사항
- **타입 경계면(snake_case↔camelCase):** `cart-service`/`order-service`의 join row → 타입 매핑(`menu_item_id→menuItemId`, `total_price→totalPrice`, `created_at→createdAt`) 누락 여부.
- **가격 스냅샷 계약:** 주문 후 `menu_items.price` 변경 시 `order_items.price`/`orders.total_price` 불변인지(런타임). 장바구니 표시가는 join 현재가.
- **소유권 스코프:** 모든 cart/order 뮤테이션·조회에 `WHERE user_id = ?` 적용, `/orders/[id]` 타인 접근 `notFound()`.
- **단일 음식점 제약:** `addToCart` 다른 음식점 담기 시 force 없으면 미삽입(`different_restaurant`), force 시 clear 후 삽입.
- **트랜잭션 원자성:** `createOrder` orders/order_items/cart 삭제가 단일 `db.transaction()`.
- **Server/Client 경계:** `add-to-cart-button.tsx`만 `'use client'`(getDb 미import). 서비스는 서버 전용 유지.
- **Next.js 15 async:** `/orders/[id]` `params` await, `getSession()` cookies 기반 await 준수.

## 미구현 항목
- `app/orders/page.tsx`(주문 목록) — [확인 필요] #5 권장값에 따라 선택 범위로 제외. `listOrders` 서비스 함수는 제공.
- 🛒 항목 수 배지 — [확인 필요] #6 권장값에 따라 제외.
