---
issue_id: 3
parent_run_id: null
kind: initial
title: 장바구니 & 주문
---

# TDD 스펙 초안

> **Stack (harness.config.yaml `stack: auto` → 감지 결과):** Next.js 15 App Router · React 19 · TypeScript strict · better-sqlite3(싱글턴 `getDb()`) · Server Actions(`'use server'`) · Tailwind v4(`@theme` 토큰) · Vitest · zod · jose(JWT 세션 쿠키)
> **중요 — 이 프로젝트에는 TanStack Query가 없다.** 데이터 페칭은 **Server Component에서 서비스 함수 직접 호출**(`getDb()` 경유), 뮤테이션은 **Server Action + `revalidatePath()`** 패턴이다. 따라서 아래 템플릿의 `React Query 전략 / queryKey`는 **해당 없음(N/A)** 으로 대체한다.
> **인증:** issue #1의 `getSession()`(HttpOnly JWT 쿠키) 재사용. 주문 및 장바구니 뮤테이션은 모두 세션 기반으로 `userId`를 얻는다.

## patterns_applied

`.harness/patterns/`에서 **활성 패턴**(`deprecated: false`)만 참조했다. (`local/` 비어 있음 → `team/`만 존재)

| id | 적용 내용 |
|----|----------|
| kebab-case-files | 신규 파일명 전부 kebab-case (`cart-service.ts`, `order-service.ts`, `cart-item-row.tsx`, `add-to-cart-button.tsx` 등) |
| api-error-throw | 서비스 레이어는 무결성 위반 시 `Error` throw, Server Action/페이지에서 처리 (`createOrder`의 빈 장바구니/다중 음식점/미존재 메뉴 → throw 또는 결과 객체 변환) |

## 기능
- **무엇을 만드는가:** 음식점 상세(`/restaurants/[id]`)에서 메뉴를 장바구니에 담고, 장바구니(`/cart`)에서 수량 조절·삭제 후 주문(체크아웃)하여 주문을 생성하는 흐름. issue #2에서 **비기능 placeholder**로 남겨둔 메뉴행 담기(+) 버튼과 헤더 🛒 아이콘을 실제 동작으로 연결한다. 주문은 **로그인 사용자만** 가능하다.
- **성공 조건:**
  1. 로그인 사용자가 상세 화면 메뉴행의 담기(+) 버튼을 누르면 해당 메뉴가 장바구니에 추가된다(동일 메뉴 재담기 시 수량 +1). 로그아웃 사용자는 로그인 유도(`/login`으로 이동).
  2. `/cart`에서 담긴 항목들(이름·단가·수량·라인 합계)과 **총 금액**이 표시되고, 각 항목의 수량을 +/− 로 조절(0이 되면 삭제)하거나 삭제 버튼으로 제거할 수 있다. 변경은 즉시 반영된다(`revalidatePath`).
  3. `/cart`에서 "주문하기"를 누르면 현재 장바구니 내용으로 **주문이 생성**(`orders` + `order_items`, 가격 스냅샷)되고 장바구니는 비워지며, 주문 완료 화면(`/orders/[id]`)으로 이동해 주문 내역·총액을 확인할 수 있다.
  4. 장바구니가 비어 있으면 빈 상태 메시지 + 음식점 둘러보기 CTA가 표시되고, 주문하기는 불가(버튼 비활성/미노출).
- **예외/엣지케이스:**
  - **빈 장바구니 체크아웃** → 주문 생성 차단(에러 메시지). (성공 조건 4)
  - **다른 음식점 메뉴 담기** → 배달앱 관례상 장바구니는 **단일 음식점**만. 다른 음식점 메뉴 담기 시 "장바구니를 비우고 새로 담을까요?" 확인 후 교체. → **[확인 필요] #2**.
  - **수량 0 이하** → 해당 항목 삭제(clamp 아님). 음수/비정상 수량 입력 방어.
  - **주문 시 메뉴 가격이 담을 때와 달라진 경우** → 주문 시점 가격을 `order_items`에 **스냅샷 저장**. 장바구니는 항상 `menu_items`의 현재 단가를 조인해 표시.
  - **담긴 메뉴가 삭제된 경우(후속 issue #4 CRUD 대비)** → 주문 생성 시 유효성 검증. 조인 실패 항목은 무시하거나 에러. → **[확인 필요] #4**.
  - **로그아웃 사용자의 `/cart` / 주문 접근** → `/login`으로 유도(issue #1 게이팅 일관성).
  - **본인 아닌 주문(`/orders/[id]`) 접근** → `userId` 불일치 시 404(`notFound()`).

## 디자인
- **UI 구조:**
  - **상세 (`/restaurants/[id]`)**: 기존 레이아웃 유지. `MenuItemRow` 우측 담기(+) 버튼을 실제 동작화. 로그인 시 `<form action={addToCartAction}>` 제출 버튼, 로그아웃 시 `/login`으로 가는 Link. `TopHeader`의 🛒 아이콘은 `/cart` Link로 연결.
  - **장바구니 (`/cart`)**: `TopHeader`(검색 숨김) → 음식점명 헤더 → `CartItemRow` 리스트(좌: 이름/단가, 우: 수량 스테퍼 −/＋ · 라인합계 · 삭제) → `CartSummary`(총 금액 + "주문하기" 버튼). 빈 상태: "장바구니가 비어 있어요" + "음식점 둘러보기" CTA(`/`).
  - **주문 완료 (`/orders/[id]`)**: `TopHeader` → 완료 배지/메시지("주문이 접수되었어요") → 주문 항목 리스트(이름·수량·라인합계) → 총 금액 → 홈으로 돌아가기 CTA.
- **주요 컴포넌트 (DS 레코드 기준, shadcn 미사용, 전부 `components/features/`):**
  - `restaurants/menu-item-row.tsx` (**수정**) — 담기(+) 버튼 실동작. `isAuthenticated`(또는 `restaurantId`) prop 추가, 인증 시 form-action 버튼 / 미인증 시 Link.
  - `cart/add-to-cart-button.tsx` (선택) — 담기 버튼을 별도 Client/form 컴포넌트로 분리 시. 간단하면 `MenuItemRow` 내 `<form>`로 인라인 처리 가능.
  - `cart/cart-item-row.tsx` — 장바구니 한 줄. 수량 −/＋·삭제(각각 Server Action form 또는 Client 버튼).
  - `cart/cart-summary.tsx` — 총 금액 + 주문하기 버튼(`<form action={placeOrderAction}>`).
  - `orders/order-summary.tsx` (선택) — 주문 항목 리스트 + 총액(주문 완료 화면 재사용).
  - `restaurants/price-tag.tsx` (**재사용**) — 라인 단가/합계 표시(`32,000원` 포맷).
- **로딩 상태:** Server Component 렌더 + Server Action 뮤테이션이므로 페이지 단위 스피너 없음. 액션 제출 중 상태는 필요 시 `useFormStatus`(Client) 적용 가능하나 MVP에서는 **없음**(즉시 revalidate).
- **에러 상태:** 주문 실패(빈 장바구니 등)는 인라인 메시지 또는 액션 결과. `/orders/[id]` 미존재·타인 주문은 `notFound()`.
- **빈 상태:** 장바구니 0건 인라인 메시지 + CTA(`text-text-muted` 톤 재사용, issue #2 빈 상태 패턴 준용).

## 데이터
- **API 엔드포인트:** REST 엔드포인트 없음. **조회는 Server Component가 서비스 함수 직접 호출**, **뮤테이션은 Server Action**(`actions/cart.ts`, `actions/order.ts`) — issue #1 `actions/auth.ts` 패턴 준용.
- **HTTP 메서드:** N/A (RSC 직접 조회 + Server Action). 폼 제출은 Server Action 호출로 표현.
- **핵심 타입** (`types/cart.ts`, `types/order.ts` 신규):
  ```typescript
  // types/cart.ts
  // 장바구니 라인(= cart_items row + menu_items 조인으로 얻은 표시 정보).
  export interface CartItem {
    id: number            // cart_items PK
    menuItemId: number
    restaurantId: number
    name: string          // 현재 menu_items.name (조인)
    price: number         // 현재 menu_items.price (조인, 원 KRW 정수)
    quantity: number      // 1 이상
    lineTotal: number     // price * quantity (파생, 서비스에서 계산)
  }

  // 단일 음식점 장바구니 스냅샷. 비어 있으면 restaurantId/name은 null.
  export interface Cart {
    restaurantId: number | null
    restaurantName: string | null
    items: CartItem[]
    totalPrice: number
  }

  // types/order.ts
  // MVP는 생성 시 'pending' 단일 상태. 상태 전이(조리/배달/완료)는 이번 이슈 범위 밖. → [확인 필요] #3
  export const ORDER_STATUSES = ['pending'] as const
  export type OrderStatus = (typeof ORDER_STATUSES)[number]

  export interface OrderItem {
    id: number
    orderId: number
    menuItemId: number
    name: string          // 주문 시점 스냅샷
    price: number         // 주문 시점 단가 스냅샷(KRW 정수)
    quantity: number
    lineTotal: number     // price * quantity (파생)
  }

  export interface Order {
    id: number
    userId: string        // users.id (TEXT UUID) 참조 — id 스킴 불일치 주의
    restaurantId: number
    restaurantName: string // 조인 또는 스냅샷
    totalPrice: number
    status: OrderStatus
    createdAt: string     // ISO
  }

  export interface OrderWithItems extends Order {
    items: OrderItem[]
  }
  ```
- **React Query 전략:** N/A (프로젝트에 TanStack Query 미도입).
- **queryKey 구조:** N/A.

### 장바구니 저장 방식 결정 — **DB 테이블(user_id 키) + 담기부터 로그인 필요** (권장)
기존 스택에 **클라이언트 상태 라이브러리(Zustand/Context)·TanStack Query가 없고**, 모든 상태는 `getDb()`(better-sqlite3) + Server Action으로 관리된다. 장바구니를 DB `cart_items(user_id, ...)`로 두면 기존 서비스/액션/revalidate 패턴과 정확히 일치하며, 주문 생성(같은 DB 트랜잭션에서 cart→order 이동)이 단순해진다.
- **트레이드오프:** 익명(비로그인) 장바구니를 지원하지 않는다. 하지만 "주문은 로그인 사용자만"이 이미 요구사항이므로 담기 단계부터 로그인을 요구해도 UX 손실이 작고, 로그인 시 익명 쿠키 장바구니를 병합하는 복잡도를 제거한다.
- **대안(쿠키/세션 장바구니):** 비로그인 담기를 허용하려면 HttpOnly 쿠키에 장바구니 JSON을 직렬화하고 Server Action으로 mutate해야 하는데, 별도 저장 경로가 생겨 DB+액션 단일 패턴에서 벗어난다. → **[확인 필요] #1**(권장: DB + 로그인 필요).

### DB 스키마 (`lib/db/client.ts`에 마이그레이션 추가 — 기존 `CREATE_*_TABLE` 흐름에 이어서 `getDb()` 최초 호출 시 `db.exec()`)
```sql
-- 장바구니 라인. 사용자당 (menu_item_id) 유니크 → 재담기 시 quantity 증가(UPSERT).
CREATE TABLE IF NOT EXISTS cart_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id),
  menu_item_id INTEGER NOT NULL REFERENCES menu_items(id),
  restaurant_id INTEGER NOT NULL REFERENCES restaurants(id),  -- 단일 음식점 검증·조회 단순화용 비정규화
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  UNIQUE(user_id, menu_item_id)
);
CREATE INDEX IF NOT EXISTS idx_cart_items_user ON cart_items(user_id);

-- 주문 헤더.
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id),
  restaurant_id INTEGER NOT NULL REFERENCES restaurants(id),
  total_price INTEGER NOT NULL,          -- 주문 시점 총액 스냅샷(KRW 정수)
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);

-- 주문 항목(가격/이름 스냅샷 — 이후 메뉴 변경과 무관하게 보존).
CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id),
  menu_item_id INTEGER NOT NULL REFERENCES menu_items(id),
  name TEXT NOT NULL,                    -- 주문 시점 메뉴명 스냅샷
  price INTEGER NOT NULL,                -- 주문 시점 단가 스냅샷(KRW 정수)
  quantity INTEGER NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
```
> - **id 스킴:** `cart_items`/`orders`/`order_items`는 restaurants·menu_items와 동일한 **INTEGER AUTOINCREMENT PK**. 단 `user_id`는 users의 **TEXT UUID** — 혼동 방지 위해 명시(issue #2에서 확립된 의도적 불일치).
> - **restaurant_id 비정규화:** `cart_items.restaurant_id`는 `menu_items`로 조인해도 얻지만, 단일-음식점 제약 검증과 장바구니 헤더(음식점명) 조회를 단순화하기 위해 중복 저장.
> - **seed 없음:** 장바구니/주문은 사용자 행위로만 생성. issue #2처럼 seed하지 않는다.

### 서비스 시그니처(권장)
```typescript
// services/cart-service.ts  (row snake_case → 타입 camelCase 매핑은 auth-service UserRow / restaurant-service 패턴 준용)
export function getCart(userId: string): Cart
export function addToCart(userId: string, menuItemId: number): void        // UPSERT(+1), 다른 음식점이면 DIFFERENT_RESTAURANT 처리 → [확인 필요] #2
export function updateCartItemQuantity(userId: string, cartItemId: number, quantity: number): void  // <=0 이면 삭제
export function removeCartItem(userId: string, cartItemId: number): void
export function clearCart(userId: string): void

// services/order-service.ts
export function createOrder(userId: string): Order          // 장바구니 조회→검증(빈/단일음식점/메뉴존재)→orders+order_items 트랜잭션 삽입(스냅샷)→clearCart. 빈 장바구니면 Error throw.
export function getOrder(userId: string, orderId: number): OrderWithItems | null  // userId 불일치 시 null
export function listOrders(userId: string): Order[]         // (선택)
```
> 모든 뮤테이션은 소유권을 위해 항상 `userId`를 인자로 받아 `WHERE user_id = ?`로 스코프. 서비스는 세션을 모름(순수). 세션→userId 추출은 Server Action에서.

## 구현 범위
### 신규 생성
- `types/cart.ts` — `CartItem` / `Cart`.
- `types/order.ts` — `Order` / `OrderItem` / `OrderWithItems` / `OrderStatus`·`ORDER_STATUSES`.
- `services/cart-service.ts` — `getCart` / `addToCart` / `updateCartItemQuantity` / `removeCartItem` / `clearCart`. row→타입 매핑(camelCase), `menu_items` 조인으로 이름·단가, `lineTotal`·`totalPrice` 파생.
- `services/order-service.ts` — `createOrder`(트랜잭션 + 스냅샷 + clearCart) / `getOrder` / `listOrders`(선택).
- `actions/cart.ts` (`'use server'`) — `addToCartAction` / `updateQuantityAction` / `removeItemAction`. 각 액션: `getSession()` → 없으면 로그인 유도(리다이렉트/결과) → 서비스 호출 → `revalidatePath('/cart')`(및 상세).
- `actions/order.ts` (`'use server'`) — `placeOrderAction`: `getSession()` → `createOrder(userId)` → `redirect('/orders/' + order.id)`. 실패(빈 장바구니)는 결과/에러로 변환.
- `app/cart/page.tsx` — 장바구니(Server Component). `getSession()` 없으면 `/login`으로. `getCart(userId)` → `CartItemRow`+`CartSummary` 또는 빈 상태.
- `app/orders/[id]/page.tsx` — 주문 완료/상세(Server Component). `params`(Promise) `await` → `Number(id)` 방어 → `getOrder(userId, id)` 없으면 `notFound()`.
- `app/orders/page.tsx` (**선택**) — 주문 내역 목록. → [확인 필요] #5.
- `components/features/cart/cart-item-row.tsx` — 수량 스테퍼·삭제.
- `components/features/cart/cart-summary.tsx` — 총액 + 주문하기.
- `components/features/cart/add-to-cart-button.tsx` (선택) — 담기 버튼 분리 시.
- `components/features/orders/order-summary.tsx` (선택) — 주문 항목 리스트.

### 수정
- `lib/db/client.ts` — `cart_items` / `orders` / `order_items` `CREATE TABLE` + 인덱스 추가(기존 `CREATE_MENU_ITEMS_INDEX` 흐름에 이어서, `getDb()` 내 `db.exec()` 추가). seed 없음.
- `components/features/restaurants/menu-item-row.tsx` — 담기(+) placeholder를 실동작으로. `isAuthenticated`(또는 `restaurantId`) prop 추가 → 인증 시 `<form action={addToCartAction}>` 제출(hidden `menuItemId`), 미인증 시 `/login` Link.
- `components/features/restaurants/top-header.tsx` — 🛒 placeholder span → `/cart` Link. (선택) 항목 수 배지 → [확인 필요] #6(권장: 배지 없음).
- `app/restaurants/[id]/page.tsx` — `MenuItemRow`에 인증 여부(`session != null`) 전달. (이미 `getSession()` 호출 중이므로 prop만 추가.)

## 기존 패턴 (구현 시 참조)
- **컴포넌트 방식:** 페이지·장바구니 행·요약·주문 요약은 **Server Component**. 인터랙션은 **Server Action + `<form>`** 우선(auth-form처럼 꼭 필요할 때만 `'use client'`). 수량 스테퍼는 form-action 버튼(−/＋ 각각) 또는 `useFormStatus` 필요 시 최소 Client 래퍼.
- **데이터 페칭:** 조회 = Server Component에서 서비스 직접 호출(RSC). 뮤테이션 = Server Action → 서비스 → `revalidatePath()`.
- **인증:** `lib/auth/session.ts`의 `getSession()`으로 `userId` 획득. 미인증은 `redirect('/login')`(페이지) 또는 로그인 Link(버튼).
- **훅 네이밍:** 신규 훅 없음(TanStack Query 미사용).
- **queryKey 구조:** N/A.
- **스타일 모드:** **Tailwind** (CSS_CONVENTIONS §1 감지: `package.json` `tailwindcss` + `app/globals.css` `@import "tailwindcss"` + `@theme` 토큰, `components.json`·`*.module.css` 부재 → **tailwind 단일 모드**).
- **스타일 패턴:** `cn()`(`lib/utils.ts`) + 유틸리티 클래스. 반복 클래스는 모듈 상단 상수(`iconButtonClass` 선례)로 추출. **DS 토큰 클래스만 사용**: 색 `bg-bg/bg-surface/text-text/text-text-muted/border-border/bg-primary/text-primary-text/text-accent/text-warning/text-danger`, radius `rounded-sm/md/lg`, text `text-xs/sm/md/lg/xl`.
- **⚠️ spacing 규칙(지난 커밋 버그 재발 방지):** `--spacing-*` named 토큰 **절대 재도입 금지**. Tailwind 기본 숫자 스케일만 — xs=`1`, sm=`2`, md=`4`, lg=`6`, xl=`10` (예: `p-4 gap-2 rounded-lg`). named spacing 토큰 추가 시 `max-w-*` 등 sizing 유틸이 깨져 프로덕션 버그(4e4a581 커밋 회귀).

## 테스트 전략
- **SKIP_TESTS: true (사용자 오버라이드)**
- **근거(원안):** code-analyzer는 신규 데이터 레이어(`cart_items`/`orders`/`order_items` 테이블), 신규 서비스 2개(`cart-service.ts`·`order-service.ts`), 신규 타입, Server Action 추가로 `SKIP_TESTS: false`를 산출했다. **사용자가 "단순 구현이므로 테스트 불필요, 바로 구현"으로 명시 오버라이드하여 Phase 1.5(테스트 선행 작성)를 생략하고 Phase 2로 직행한다.** 아래 항목은 테스트 작성 시 참고할 커버리지 초안으로만 보존:
  1. `getDb()`가 `cart_items`/`orders`/`order_items` 3개 테이블 + 인덱스를 생성한다.
  2. `cart-service`: `addToCart` 최초 담기(quantity=1) / 동일 메뉴 재담기(+1 UPSERT) / `updateCartItemQuantity` 증감·0이하 삭제 / `removeCartItem` / `getCart`의 `lineTotal`·`totalPrice`·camelCase 매핑 / 다른 음식점 담기 처리([확인 필요] #2 결정 반영).
  3. `order-service`: `createOrder`가 장바구니 항목을 `order_items`로 **스냅샷** 이동 + `total_price` 계산 + 장바구니 비움 / 빈 장바구니면 throw / `getOrder`가 타 `userId` 주문에 `null`.
  4. 가격 스냅샷 검증: 주문 후 `menu_items.price` 변경해도 `order_items.price`·`orders.total_price` 불변.

## 주의사항
- **타입 경계면(snake_case ↔ camelCase):** DB row `menu_item_id/restaurant_id/user_id/total_price/created_at` ↔ 타입 `menuItemId/restaurantId/userId/totalPrice/createdAt`. 서비스 매핑 누락 시 `undefined` 필드 위험 — `restaurant-service`의 명시 매핑 함수 패턴 필수.
- **id 스킴 혼재:** `orders.user_id`·`cart_items.user_id`는 **TEXT UUID**(users), 그 외 FK는 **INTEGER**(restaurants/menu_items). 파라미터 바인딩 시 타입 혼동 주의(`Number(id)` 대상은 order/restaurant id뿐, userId는 문자열 그대로).
- **가격 스냅샷 계약:** 장바구니는 `menu_items` 조인으로 **현재가**를 보여주되, 주문 생성 시 그 시점 단가를 `order_items.price`에 복사. 주문 내역은 이후 메뉴 변경(issue #4 CRUD)과 독립적으로 보존.
- **소유권 스코프:** 모든 장바구니/주문 쿼리는 `WHERE user_id = ?`. 세션 `userId` 없이 서비스 뮤테이션 호출 금지. `/orders/[id]`는 소유자 아니면 `notFound()`(존재 노출 방지).
- **트랜잭션:** `createOrder`는 orders INSERT → order_items 다건 INSERT → cart_items 삭제를 **단일 `db.transaction()`**으로(부분 실패 방지). `client.ts`의 `seedAll` 트랜잭션 패턴 참고.
- **Next.js 15 비동기:** `params`(`/orders/[id]`)는 **Promise** → `await`. `getSession()`도 `cookies()` 기반 async. Server Action은 `'use server'`, `redirect()`/`revalidatePath()`는 `next/navigation`·`next/cache`.
- **Server/Client 경계:** 서비스(`getDb()`, better-sqlite3)는 **서버 전용** — Client Component에서 import 금지. 담기/수량/주문 버튼은 Server Action `<form>` 우선.
- **단일 음식점 제약:** `cart_items`에 서로 다른 `restaurant_id`가 섞이지 않도록 `addToCart`에서 검증(→ [확인 필요] #2). 미검증 시 `Cart.restaurantId`/총액 의미가 모호해지고 `createOrder`의 단일 `restaurant_id` 가정이 깨짐.
- **동시성:** better-sqlite3 동기·단일 프로세스라 레이스 위험 낮음. UPSERT는 `UNIQUE(user_id, menu_item_id)` + `INSERT ... ON CONFLICT DO UPDATE`로 원자적 처리 권장.

---

## [확인 필요] 항목 (오케스트레이터 판단 — 각 항목 권장 기본값 명시)

1. **장바구니 저장 방식** — DB `cart_items`(user_id 키, 담기부터 로그인 필요) vs 익명 쿠키 장바구니.
   - **권장 기본값: DB 테이블 + 담기부터 로그인 필요.** 기존 DB+Server Action 단일 패턴과 일치, 익명 병합 복잡도 제거, "주문은 로그인만" 요구와 정합. 별도 지시 없으면 이대로 진행.

2. **다른 음식점 메뉴 담기 UX** — 장바구니는 단일 음식점.
   - **권장 기본값: 기존 장바구니와 다른 음식점 메뉴 담기 시 "장바구니를 비우고 새로 담을까요?" 확인 → 승인 시 기존 비우고 새 항목으로 교체(clear-and-replace).** 서버 `addToCart`는 충돌 시 즉시 덮어쓰지 않고 결과 플래그(`DIFFERENT_RESTAURANT`) 반환, UI가 확인 후 강제 담기 재호출. MVP 단순화가 필요하면 최소 대안은 "다른 음식점 메뉴는 담기 거부 + 안내 메시지". 별도 지시 없으면 **확인 후 교체**로 진행.

3. **주문 상태 모델** — 조리/배달/완료 등 상태 전이.
   - **권장 기본값: 생성 시 `'pending'` 단일 상태, 상태 전이 없음.** 상태 머신·라이더/사장 플로우는 이번 이슈 범위 밖(후속 이슈). `ORDER_STATUSES`는 union으로 열어두되 이번엔 `'pending'`만 사용. 별도 지시 없으면 이대로.

4. **담긴 메뉴가 삭제된 경우(주문 시점 유효성)** — issue #4 CRUD 도입 대비.
   - **권장 기본값: 이번 이슈에서는 메뉴 삭제 기능이 없으므로(#4 예정) 조인 실패는 발생하지 않는다고 가정하되, `createOrder`에서 조인 결과가 비면 방어적으로 Error throw.** 부분 무시(일부 항목 스킵) 대신 명확한 실패. 별도 지시 없으면 이대로.

5. **주문 내역 목록 페이지(`/orders`)** — 완료 화면(`/orders/[id]`) 외 리스트.
   - **권장 기본값: 이번 이슈 핵심은 `/orders/[id]` 완료 화면까지. `/orders` 목록은 선택(후속).** `listOrders`/`app/orders/page.tsx`는 여유 시 추가, 미포함해도 성공 조건 충족. 별도 지시 없으면 **`/orders/[id]`까지만** 필수 구현.

6. **헤더 🛒 배지(담긴 개수) 표시** — 🛒에 항목 수 뱃지.
   - **권장 기본값: 🛒는 `/cart` Link로만 연결, 실시간 개수 배지는 미표시(후속).** 배지는 모든 페이지에서 장바구니 수를 조회해 `TopHeader`로 내려야 해 결합도가 커짐. 별도 지시 없으면 **배지 없음**으로 진행.

> 그 외 모든 항목(스키마 3종·가격 스냅샷·단일 음식점 제약·Server Action 뮤테이션·INTEGER PK/TEXT userId 혼재·`revalidatePath`·Tailwind DS 토큰·numeric spacing·SKIP_TESTS=false)은 권장 기본값으로 확정하여 진행 가능.
