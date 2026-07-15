---
issue_id: 5
parent_run_id: null
kind: initial
title: 주문 상태 조회
---

# TDD 스펙 초안 — 이슈 #5 주문 상태 조회

> stack: Next.js 15 (App Router) · React 19 · Tailwind CSS v4 · better-sqlite3 (harness.config.yaml: stack=auto → next 감지)
> style_mode: **tailwind** (harness.config.yaml=auto → 감지 결과. tailwindcss ^4.0.0, tailwind.config.* 없음 = v4 CSS-first. `cn()` = clsx + tailwind-merge)

## patterns_applied

`.harness/patterns/team/`의 활성 패턴만 참조했다. local/ 및 레거시 flat 패턴 파일은 없음.

| id | 적용 내용 |
|----|----------|
| kebab-case-files (team) | 신규 파일명 `order-card.tsx` 등 kebab-case 적용 |
| api-error-throw (team) | 서비스 레이어(`listOrders`)는 이미 준수 — 신규 코드 없음, 기존 재사용 |

## 기능
- **무엇을 만드는가:** 손님(customer)이 자신의 전체 주문 이력을 최신순으로 보고, 각 주문의 현재 상태(접수/조리중/완료)를 확인하는 "내 주문 목록"(`/orders`) 페이지를 추가한다.
- **성공 조건:**
  1. 로그인한 사용자가 `/orders`에 접근하면 본인 주문이 최신순(id DESC)으로 나열된다.
  2. 각 주문 항목에 음식점 이름·주문 일시·총액·현재 상태 라벨(접수/조리중/완료)이 표시된다.
  3. 주문 항목 클릭 시 기존 `/orders/[id]` 상세로 이동한다.
  4. 비로그인 사용자가 `/orders`에 접근하면 `/login`으로 리다이렉트된다.
  5. 주문이 하나도 없으면 빈 상태 메시지가 표시된다.
  6. 페이지 새로고침 시 최신 상태가 반영된다(RSC 매 요청 재조회 — 실시간 polling/websocket은 범위 밖).
- **예외/엣지케이스:**
  - 다른 사용자의 주문은 노출되지 않는다(`listOrders`가 `WHERE user_id = ?`로 이미 스코프됨).
  - 상태값이 예상 밖(스키마 확장)이어도 라벨 조회는 `ORDER_STATUS_LABELS` 키에 한정 — 신규 상태 도입 시 라벨 누락 주의(현재 3종 고정).

## 디자인
- **UI 구조:** `app/seller/orders/page.tsx`와 동일한 레이아웃 골격 — `TopHeader` + `max-w-3xl` 중앙 `main` + 제목 블록 + 주문 카드 세로 리스트(`ul > li`). 각 카드는 클릭 가능(`Link`로 `/orders/[id]` 이동).
- **주요 컴포넌트:** shadcn/ui 미사용 프로젝트. 로컬 feature 컴포넌트 패턴 준용 — 신규 `OrderCard`(손님용 주문 1건 카드), 기존 `TopHeader` 재사용, 상태 라벨은 `ORDER_STATUS_LABELS` 재사용.
- **로딩 상태:** 없음 (Server Component 동기 서비스 호출 — Skeleton/Spinner 불필요, 기존 페이지와 동일).
- **에러 상태:** 별도 처리 없음(기존 페이지 관례). 서비스는 정상 시 배열 반환. [확인 필요] `app/orders/error.tsx` 추가 여부 → **권장 기본값: 추가하지 않음**(기존 orders/seller 페이지 모두 error.tsx 없음, 범위 최소화).
- **빈 상태:** 기존 seller 패턴 그대로 — `<p className="py-10 text-center text-md text-text-muted">아직 주문 내역이 없어요</p>`.
- **상태 배지 색상:** [확인 필요] 손님용 배지를 상태별 색상 구분할지 → **권장 기본값: 기존 seller 배지 스타일(`rounded-md bg-surface px-4 py-1 text-sm font-medium text-text`) 재사용**(단일 중립 배지, 일관성 우선). 색상 구분은 후속 개선으로 보류.

## 데이터
- **API 엔드포인트:** 없음(REST 라우트 아님). RSC에서 서비스 함수 직접 호출.
- **HTTP 메서드:** 해당 없음(GET 성격의 페이지 로드, Server Action 아님).
- **서비스 함수:** **`listOrders(userId: string): Order[]` — 이미 order-service.ts에 구현됨.** `WHERE o.user_id = ? ORDER BY o.id DESC`, restaurants 조인으로 `restaurant_name` 포함. **신규 서비스 코드 불필요 — 그대로 재사용.**
- **핵심 타입:** 신규 타입 불필요. 기존 `Order`(types/order.ts) 재사용:
  ```typescript
  interface Order {
    id: number
    userId: string
    restaurantId: number
    restaurantName: string
    totalPrice: number
    status: OrderStatus // 'pending' | 'cooking' | 'completed'
    createdAt: string // ISO
  }
  ```
  > 주의: `listOrders`는 `Order[]`(항목 없음)을 반환. 목록 카드는 `items`에 접근하지 않는다(상세 `/orders/[id]`만 `OrderWithItems` 사용).
- **데이터 페칭 전략:** **useQuery/TanStack Query 미사용** — 이 프로젝트는 RSC에서 서비스 함수 동기 호출. (스펙 템플릿의 React Query 항목은 이 스택에 해당 없음.)
- **queryKey 구조:** 해당 없음.

## 구현 범위
### 신규 생성
- `app/orders/page.tsx` — 손님 주문 목록 페이지(Server Component). `getSession()` → 없으면 `redirect('/login')` → `listOrders(session.userId)` → `OrderCard` 리스트 렌더. (참조: `app/seller/orders/page.tsx`)
- `components/features/orders/order-card.tsx` — 손님용 주문 1건 카드. props: `{ order: Order }`. 음식점명·주문 일시(`new Date(order.createdAt).toLocaleString('ko-KR')`)·`PriceTag`로 총액·`ORDER_STATUS_LABELS[order.status]` 배지 표시. 카드 전체를 `<Link href={/orders/${order.id}}>`로 감싼다.

### 수정
- `components/features/restaurants/top-header.tsx` — [확인 필요] "내 주문" 진입 링크 추가 → **권장 기본값: 추가함**. 로그인(`nickname` 존재) 시 장바구니(🛒) 아이콘 옆에 `/orders` 링크(예: 📋 또는 "내 주문") 노출. 없으면 페이지에 도달할 경로가 없음.
- `app/orders/[id]/page.tsx` — [확인 필요] 현재 heading이 `"주문이 접수되었어요 ✅"`로 **하드코딩**되어 있어, 목록에서 조리중/완료 주문을 눌러도 항상 "접수" 문구가 표시됨(상태 조회 취지와 불일치). → **권장 기본값: 상태 반영으로 수정함**. `ORDER_STATUS_LABELS[order.status]` 기반으로 heading/배지를 상태에 맞게 표시(예: 접수="주문이 접수되었어요", 조리중="조리 중이에요", 완료="완료된 주문이에요"). 범위 최소화를 원하면 이 수정은 생략 가능.

## 기존 패턴 (구현 시 참조)
- 컴포넌트 방식: **Server Component 우선**. `page.tsx`·카드 모두 Server Component(`'use client'` 불필요). `TopHeader`만 기존 Client Component.
- 데이터 페칭: **RSC에서 서비스 함수 직접 호출**(fetch/React Query/Server Action 아님).
- 인증 게이트: 손님 페이지는 `getSession()` + `if (!session) redirect('/login')` 직접 사용(참조: `app/orders/[id]/page.tsx`). `requireOwner()`는 owner 전용이므로 사용하지 않음. [확인 필요] customer 전용 헬퍼(`requireCustomer`)는 미존재 → **권장 기본값: 신규 헬퍼 만들지 않고 인라인 `getSession` 가드 사용**(기존 손님 페이지 관례와 동일).
- 파일 네이밍: kebab-case (`order-card.tsx`) — team 패턴 `kebab-case-files`.
- 상태 라벨/전이: `types/order.ts`의 `ORDER_STATUS_LABELS` 재사용(손님은 조회만 — `ORDER_STATUS_NEXT`·전이 버튼 없음).
- 스타일 모드: **Tailwind (v4, CSS-first)** — CSS_CONVENTIONS §1 감지 결과.
- 스타일 패턴: 디자인 토큰 유틸 클래스(`bg-bg` `text-text` `text-text-muted` `border-border` `bg-surface` `bg-primary` `text-primary-text`) + 조건부 병합 시 `cn()`. `PriceTag` 컴포넌트로 KRW 표기 재사용.

## 테스트 전략
- **SKIP_TESTS: true (사용자 오버라이드)**
- 근거: 사용자가 "테스트 불필요, 바로 구현"으로 명시 오버라이드. (참고: 신규 파일 추가라 기본 규칙상으로는 false지만 오버라이드 우선. 핵심 로직인 `listOrders`는 이미 구현·검증된 상태라 리스크 낮음.)

## 주의사항
- **경계면 — `Order` vs `OrderWithItems`:** 목록은 `listOrders` → `Order[]`(items 없음). `OrderCard`에서 `order.items` 접근 금지(런타임 undefined). 항목 요약은 상세 페이지 전용.
- **detail 페이지 문구 불일치:** `app/orders/[id]/page.tsx`의 "주문이 접수되었어요 ✅"가 하드코딩 → 목록에서 완료 주문 진입 시 상태와 어긋남(상단 수정 항목 참조).
- **소유권/보안:** `listOrders`는 `WHERE user_id = ?`로 스코프됨 — 타 사용자 주문 유출 없음. 카드의 `/orders/[id]` 링크도 상세 페이지에서 `getOrder`가 소유자 검증 후 `notFound` 처리하므로 이중 안전.
- **진입 경로:** TopHeader에 링크를 추가하지 않으면 `/orders`는 직접 URL 입력 외 도달 불가 — 수정 항목의 권장 기본값(추가) 채택 권장.
- **날짜 포맷:** `toLocaleString('ko-KR')`은 서버 타임존 기준으로 렌더(RSC) — seller 카드와 동일 관례, hydration 불일치 없음(Client 렌더 아님).
