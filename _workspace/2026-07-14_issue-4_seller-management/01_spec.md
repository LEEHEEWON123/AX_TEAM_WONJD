---
issue_id: 4
parent_run_id: null
kind: initial
title: 사장님 메뉴/주문 관리
---

# TDD 스펙 초안 — 이슈 #4 사장님 메뉴/주문 관리

> stack: next (App Router, Next.js 15.1 / React 19) · style_mode: tailwind(v4 @theme DS 토큰)
> 데이터 계층: better-sqlite3 싱글턴(`getDb()`) · 뮤테이션: Server Action + `revalidatePath`

## patterns_applied

`.harness/patterns/team/`의 **활성 패턴**(`deprecated: false`)만 참조하여 스펙을 작성했다.
로컬 패턴(`local/`)은 비어 있음.

| id | 적용 내용 |
|----|----------|
| kebab-case-files | 신규 파일명 전부 kebab-case (menu-service.ts, seller-order-card.tsx 등) |
| api-error-throw | 서비스 레이어는 실패 시 `Error` throw, 액션/페이지에서 처리 (기존 `EMPTY_CART`, `MENU_ITEM_NOT_FOUND` 선례 준용) |

> 이 이슈에서 새로 확립되는 패턴(역할 게이트, 소유권 스코프 쿼리)은 Phase 4.5에서 로컬 등록 후보.

---

## 기능

- **무엇을 만드는가:** "사장님"(음식점 운영자) 역할 사용자가 **자신의 음식점** 메뉴를 등록/수정/삭제하고, 들어온 주문을 목록으로 확인하며 상태를 전이(접수→조리중→완료)할 수 있는 관리 화면(`/seller`).
- **성공 조건:**
  1. `role='owner'` 사용자가 `/seller`에 접근하면 자기 음식점의 메뉴 목록과 주문 목록을 본다. 손님(`customer`)/비로그인은 접근 차단(리다이렉트).
  2. 사장님이 메뉴를 **등록/수정/삭제**하면 즉시 `/seller` 및 해당 음식점 공개 상세(`/restaurants/[id]`)에 반영된다(`revalidatePath`).
  3. 사장님이 자기 음식점으로 들어온 주문 목록을 최신순으로 보고, 각 주문 상태를 `pending → cooking → completed`로 전이할 수 있다. 전이는 **자기 음식점 주문에 한해서만** 허용(소유권 스코프).
  4. 소유 음식점이 없는 사장님은 `/seller`에서 음식점을 1개 생성할 수 있고, 생성 후 메뉴/주문 관리로 진입한다(사장님 1명 : 음식점 1개).
- **예외/엣지케이스:**
  - 다른 음식점의 주문/메뉴를 조작하려는 요청은 소유권 불일치로 무시(no-op) 또는 `notFound`(존재 노출 방지 — `getOrder` 선례 준용).
  - 존재하지 않는 상태값으로의 전이 요청은 무시. 완료(`completed`)된 주문의 재전이는 차단(권장 기본값: 이미 completed면 no-op).
  - 장바구니/주문에 이미 담긴 메뉴 삭제 시 참조 무결성 — 아래 [데이터]·[주의사항] 참조.

---

## 디자인

- **UI 구조:** `/seller` 관리 대시보드. 상단 공통 `TopHeader`(기존 재사용) 아래 **탭/섹션 2개** — (1) 메뉴 관리, (2) 주문 관리. 라우트 분리 권장: `/seller/menu`, `/seller/orders` (대시보드 `/seller`는 요약 + 링크). 소유 음식점 없으면 `/seller`에서 음식점 생성 폼 노출.
  - 메뉴 관리: 메뉴 카드/행 리스트 + "메뉴 추가" 폼(이름·설명·가격), 각 행에 수정/삭제 버튼.
  - 주문 관리: 주문 카드 리스트(주문번호·시각·항목 요약·합계·현재 상태) + 상태 전이 버튼(다음 단계로).
- **주요 컴포넌트(신규, 기존 features/ 구조 준용):**
  - `components/features/seller/menu-manager.tsx` (Client, 메뉴 목록 + 폼 컨테이너)
  - `components/features/seller/menu-item-form.tsx` (Client, 등록/수정 폼 — `useTransition` + Server Action)
  - `components/features/seller/seller-order-card.tsx` (주문 1건 + 상태 전이 form action)
  - `components/features/seller/create-restaurant-form.tsx` (소유 음식점 생성)
  - 기존 재사용: `TopHeader`, `PriceTag`, `OrderSummary`
- **로딩 상태:** RSC 직접 페칭이라 페이지 레벨 스켈레톤 불필요. 뮤테이션 버튼은 `useTransition`의 `isPending`으로 `disabled`(기존 `AddToCartButton` 선례).
- **에러 상태:** 폼 검증 실패는 인라인 메시지(기존 `auth-form.tsx` + `AuthResult` 패턴 준용). 권한 없음은 리다이렉트/`notFound`.
- **빈 상태:** 메뉴 0개 → "아직 등록된 메뉴가 없어요"(기존 상세 페이지 문구 재사용). 주문 0건 → "들어온 주문이 없어요" 안내.
- **스타일:** Tailwind v4 유틸리티 + DS 토큰 클래스(`bg-bg`, `bg-surface`, `text-text`, `text-text-muted`, `bg-primary`, `text-primary-text`, `border-border`, `text-warning/danger/accent`). 간격은 Tailwind 기본 숫자 스케일만(`p-4`, `gap-6`), named `--spacing-*` 금지. 조건부 클래스는 `cn()`(`@/lib/utils`).

---

## 데이터

### 역할(role) 도입 — 핵심 판단 1

- **API/저장:** `users` 테이블에 `role TEXT NOT NULL DEFAULT 'customer'` 컬럼 추가. 닫힌 셋 union으로 타입화(기존 `FoodCategory`, `OrderStatus` 상수배열 선례 준용).
  ```typescript
  // types/user.ts 확장
  export const USER_ROLES = ['customer', 'owner'] as const
  export type UserRole = (typeof USER_ROLES)[number]
  // User, Session에 role: UserRole 추가
  ```
- **[확인 필요] 사장님이 되는 경로** — **권장 기본값: 회원가입 시 역할 선택(손님/사장님 라디오)**.
  `SignupInput` + `signupSchema` + `auth-form.tsx`에 `role` 추가, 기본값 `'customer'`. (대안: dev 전용 승격 스크립트 — 채택 안 함, 테스트/데모 흐름상 회원가입 선택이 자연스러움.)
- **[확인 필요] 세션에 role 반영 방식** — **권장 기본값: JWT payload + Session에 `role` 포함**.
  `createSessionToken`/`verifySessionToken`에 `role` 추가. **기존 발급 토큰은 role 필드가 없으므로 `verifySessionToken`에서 누락 시 `'customer'`로 폴백**(재로그인 없이도 안전). 서버 액션/서비스는 세션 role을 신뢰하되, 뮤테이션 시 DB 소유권(`owner_id`)으로 **재확인**(방어적 이중 게이트).

### 소유권(ownership) 연결 — 핵심 판단 2

- **저장:** `restaurants` 테이블에 `owner_id TEXT REFERENCES users(id)` **nullable** 컬럼 추가. 기존 seed 음식점은 `owner_id = NULL`(주인 없음). 사장님의 "내 음식점" = `restaurants WHERE owner_id = ?`.
  ```typescript
  // types/restaurant.ts: Restaurant에 ownerId: string | null 추가
  ```
- **[확인 필요] 사장님:음식점 관계** — **권장 기본값: 1:1** (사장님 1명당 음식점 1개). 소유 음식점이 없으면 `/seller`에서 생성 폼으로 1개 등록. (seed 음식점 "claim/양도"는 범위 밖.)

### 주문 상태 전이 — 핵심 판단 3

- **현재 상태:** `ORDER_STATUSES = ['pending']` 단일. **`order-service.ts`의 `mapOrder`가 `row.status`를 무시하고 항상 `'pending'`을 하드코딩**(19번째 줄) → 상태 전이 구현 시 **반드시 `status: row.status as OrderStatus`로 수정**해야 반영됨.
- **권장 기본값 상태 셋:**
  ```typescript
  // types/order.ts 확장
  export const ORDER_STATUSES = ['pending', 'cooking', 'completed'] as const
  // 라벨: pending=접수, cooking=조리중, completed=완료
  // 전이 규칙: pending → cooking → completed (단방향)
  ```
  (`cancelled`(취소)는 [확인 필요] — **권장: 이번 범위 제외**, 3단계 단방향만.)

### 신규/변경 서비스 시그니처

- **HTTP 메서드/스타일:** REST 엔드포인트 없음 — **Server Action + 서비스 직접 호출**(기존 전면 패턴). GET성 조회는 RSC에서 서비스 직접 호출.
- 메뉴 CRUD (신규, restaurant 도메인):
  ```typescript
  createMenuItem(ownerId: string, input: MenuItemInput): MenuItem       // owner_id 소유 음식점에 삽입
  updateMenuItem(ownerId: string, menuItemId: number, input: MenuItemInput): void  // 소유 스코프
  deleteMenuItem(ownerId: string, menuItemId: number): void             // 소유 스코프
  // MenuItemInput { name: string; description: string; price: number }
  ```
- 음식점/소유권 (신규):
  ```typescript
  getRestaurantByOwner(ownerId: string): RestaurantWithMenu | null
  createRestaurant(ownerId: string, input: RestaurantInput): Restaurant  // 1:1 가드
  ```
- 주문 관리 (order-service 확장):
  ```typescript
  listOrdersByRestaurant(restaurantId: number): OrderWithItems[]         // 최신순
  updateOrderStatus(ownerId: string, orderId: number, next: OrderStatus): void
  // ownerId 소유 음식점의 주문인지 검증 후 단방향 전이만 허용
  ```
- **소유권 스코프 쿼리 원칙:** 모든 사장님 뮤테이션은 `WHERE ... AND restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = ?)` 형태로 소유 검증(기존 `AND user_id = ?` 스코프 선례 준용).

### 검증 스키마 (신규, zod — auth-schema 선례)

- `lib/validation/menu-schema.ts` — `menuItemSchema`(name 1자 이상, price 양의 정수), `restaurantSchema`(name/category/설명/eta).

---

## 구현 범위

### 신규 생성
- `services/menu-service.ts` — 메뉴 CRUD(소유 스코프) + `getRestaurantByOwner`/`createRestaurant`. (또는 restaurant-service.ts 확장 — 파일 비대 방지 위해 분리 권장)
- `lib/validation/menu-schema.ts` — 메뉴/음식점 입력 zod 스키마
- `actions/seller.ts` — `createMenuItemAction`/`updateMenuItemAction`/`deleteMenuItemAction`/`createRestaurantAction`/`updateOrderStatusAction` (`'use server'`, `getSession` 게이트 → 소유권 서비스 호출 → `revalidatePath('/seller', '/seller/menu', '/seller/orders', '/restaurants/[id]')`)
- `app/seller/page.tsx` — 대시보드(소유 음식점 없으면 생성 폼)
- `app/seller/menu/page.tsx` — 메뉴 관리
- `app/seller/orders/page.tsx` — 주문 관리
- `components/features/seller/menu-manager.tsx`, `menu-item-form.tsx`, `seller-order-card.tsx`, `create-restaurant-form.tsx`
- `lib/auth/guard.ts`(선택) — `requireOwner()` 헬퍼: 세션 없음→`/login`, role≠owner→`redirect('/')`

### 수정
- `lib/db/client.ts` — **마이그레이션 추가**: `users.role`, `restaurants.owner_id` 컬럼. `CREATE TABLE IF NOT EXISTS`는 기존 DB에 컬럼을 추가하지 않으므로 **`pragma('table_info')` 확인 후 `ALTER TABLE ... ADD COLUMN`** 가드 필요(주의사항 참조).
- `services/order-service.ts` — `mapOrder`의 `status` 하드코딩 제거(`row.status` 사용) + `listOrdersByRestaurant`/`updateOrderStatus` 추가.
- `services/restaurant-service.ts` — `mapRestaurant`에 `ownerId` 매핑 추가, `RestaurantRow`에 `owner_id` 필드 추가.
- `types/user.ts` — `USER_ROLES`/`UserRole`, `User.role`, `Session.role`, `SignupInput.role`.
- `types/order.ts` — `ORDER_STATUSES` 확장(`cooking`, `completed`).
- `types/restaurant.ts` — `Restaurant.ownerId`, `MenuItemInput`, `RestaurantInput`.
- `lib/auth/session.ts` — `createSessionToken`/`verifySessionToken`에 `role`(누락 시 `'customer'` 폴백).
- `lib/validation/auth-schema.ts` + `actions/auth.ts` + `services/auth-service.ts` + `components/features/auth/auth-form.tsx` — 회원가입 role 선택 반영.
- `components/features/restaurants/top-header.tsx`(선택) — 사장님이면 `/seller` 진입 링크 노출.

---

## 기존 패턴 (구현 시 참조)
- 컴포넌트 방식: **RSC 페이지에서 서비스 직접 호출** + 상호작용만 Client 컴포넌트(`'use client'` + `useTransition`). 기본 Server Component.
- 데이터 페칭: 조회는 RSC 직접 호출, 뮤테이션은 **Server Action + `revalidatePath`**. TanStack Query/REST route handler 미사용.
- DB 접근: `getDb()` better-sqlite3 싱글턴, `db.prepare(...).run/get/all(...)`, 복합 쓰기는 `db.transaction(...)`.
- Row 매핑: `XxxRow`(snake_case) 인터페이스 + `mapXxx()` 명시 매핑 함수(camelCase). 매핑 누락 필드 = `undefined` 위험.
- 소유권 스코프: 모든 사용자 데이터 접근에 `AND user_id = ?` / (신규) `owner_id` 스코프. 미소유는 `null`→`notFound`.
- 라우팅: `params`/`searchParams`는 `Promise` → `await` 후 사용(Next 15). 숫자 id는 `Number.isInteger` 가드 후 `notFound`.
- 네이밍: 파일 kebab-case, 서비스 함수 동사형(`createOrder`, `listRestaurants`), 액션 `xxxAction`.
- **스타일 모드:** Tailwind v4(`@theme` DS 토큰) — CSS_CONVENTIONS §1 감지 결과. `tailwind.config` 파일 없음, `@tailwindcss/postcss` 사용.
- **스타일 패턴:** `cn()`(clsx + tailwind-merge) + DS 토큰 유틸리티 클래스. cva/CSS Module 미사용. 커스텀 named spacing 토큰 금지(기본 숫자 스케일만).

---

## 테스트 전략
- **SKIP_TESTS: true (사용자 오버라이드)** — 사용자가 "테스트 불필요, 바로 구현"으로 명시. 별도 테스트 파일 생성하지 않음.
- 원래대로라면 필요했을 커버리지(참고용, 신규 서비스/스키마/마이그레이션 다수라 기본은 `false`였을 것):
  - `menu-service`: 소유 스코프 CRUD — 타 사장님 메뉴 수정/삭제 no-op 검증, 가격 검증.
  - `order-service`: `updateOrderStatus` 단방향 전이/소유권 거부, `mapOrder` status 실제 반영(하드코딩 회귀 방지), `listOrdersByRestaurant` 최신순.
  - `menu-schema`/auth role: zod 검증 경계값.
  - `client.ts` 마이그레이션: 기존 DB(컬럼 없음)에서 `ALTER` 멱등 가드 동작.
  - 세션: role 누락 토큰 → `'customer'` 폴백.

---

## 주의사항
- **[회귀 위험] `order-service.ts` `mapOrder`가 `status: 'pending'` 하드코딩** — 상태 전이 기능의 핵심 버그원. `row.status`를 실제로 반영하도록 반드시 수정. 미수정 시 DB는 전이돼도 화면은 항상 "접수"로 표시됨.
- **[마이그레이션] `CREATE TABLE IF NOT EXISTS`는 컬럼 추가 안 함** — 이미 `data/app.db`가 존재하므로 `users.role`/`restaurants.owner_id`는 `ALTER TABLE ADD COLUMN`으로 추가해야 함. `pragma('table_info(...)')`로 컬럼 존재 확인 후 조건부 실행(멱등). 테스트는 `:memory:`라 무관하지만 실 DB 반영 필수.
- **[참조 무결성] 메뉴 삭제 시** — `cart_items.menu_item_id`가 삭제 메뉴를 FK 참조(단 `PRAGMA foreign_keys`가 client.ts에서 **미설정**이라 강제 안 됨 → 고아 cart 행 발생 가능). `order_items`는 name/price를 스냅샷 저장해 조인 안 하므로 주문 내역은 안전. **권장 기본값: 하드 삭제 + 삭제 시 해당 `cart_items` 정리**(또는 soft-delete 도입은 [확인 필요], 범위 최소화 위해 하드 삭제 권장).
- **[세션 게이트] role 이중 검증** — 세션의 role은 UX 게이트용, 실제 뮤테이션 권한은 DB `owner_id`로 재확인(스테일 토큰/위조 방어).
- **[id 스킴 불일치]** — `owner_id`/`user_id`는 users의 TEXT UUID, `restaurant_id`/`order_id`는 INTEGER. 기존 의도된 불일치이므로 조인 시 타입 혼동 주의.
- **[역할 UX] 손님이 `/seller` 접근** — 리다이렉트 대상 [확인 필요]. **권장 기본값: `/`(홈)로 리다이렉트**(notFound보다 자연스러움).
