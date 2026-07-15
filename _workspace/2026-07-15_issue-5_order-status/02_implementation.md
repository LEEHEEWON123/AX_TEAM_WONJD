# 02 구현 보고 — 이슈 #5 주문 상태 조회

## 구현 완료 목록

### 신규 생성
- `app/orders/page.tsx` — 손님 주문 목록 페이지(Server Component). `getSession()` → 없으면 `redirect('/login')` → `listOrders(session.userId)` → 최신순(서비스가 `id DESC`) `OrderCard` 리스트. 빈 상태 메시지("아직 주문 내역이 없어요") 처리. `app/seller/orders/page.tsx`와 동일 골격(`TopHeader` + `max-w-3xl` `main` + 제목 블록 + `ul`).
- `components/features/orders/order-card.tsx` — 손님용 주문 1건 카드(Server Component). props `{ order: Order }`. 카드 전체를 `<Link href={/orders/${order.id}}>`로 감쌈. 음식점명 + 주문 일시(`toLocaleString('ko-KR')`) + 상태 배지(`ORDER_STATUS_LABELS`, seller 배지 스타일 재사용) + `PriceTag`로 총액. **`order.items` 미접근**(Order 타입은 items 없음).

### 수정
- `components/features/restaurants/top-header.tsx` — 로그인(`nickname` 존재) 시 장바구니(🛒) 아이콘 옆에 `/orders` 진입 링크(📋, aria-label "내 주문") 추가. 기존 `iconButtonClass` 재사용.
- `app/orders/[id]/page.tsx` — 하드코딩 `"주문이 접수되었어요 ✅"`를 `order.status` 기반으로 교체. `STATUS_HEADINGS`/`STATUS_ICONS` 맵 추가 + `ORDER_STATUS_LABELS` 배지 표시. pending=접수(✅), cooking=조리 중(🍳), completed=완료(🎉).

## 준수 사항 확인
- Next.js 15 Promise params: `[id]` 페이지 기존 `params: Promise<{ id: string }>` + `await params` 유지.
- Tailwind 기본 숫자 spacing만 사용(`p-4` `gap-4` `py-1` 등) — named `--spacing-*` 미사용.
- getDb/서비스 함수는 Server Component(`page.tsx`)에서만 import. `order-card.tsx`는 Server Component로 서비스 import 없음. `top-header.tsx`는 Client지만 서비스/getDb import 없음(링크만 추가).
- DS 토큰 클래스만 사용: `bg-bg` `text-text` `text-text-muted` `border-border` `bg-surface` `text-primary` 등.
- 파일명 kebab-case(`order-card.tsx`) — team 패턴 준수.

## 검증 결과
| 명령 | 결과 |
|------|------|
| `npx tsc --noEmit` | PASS (exit 0, 에러 없음) |
| `npx vitest run` | PASS (7 files, 58 tests 모두 통과) |
| `npx next build` | PASS (컴파일 성공, `/orders`·`/orders/[id]` 동적 라우트 정상 생성) |

## 테스트 파일과 구현 일치 여부
- `01_test_plan.md` 없음 / **SKIP_TESTS: true (사용자 오버라이드)** — 신규 테스트 미작성.
- 기존 58개 테스트는 이번 변경으로 회귀 없음(전부 PASS). 신규 코드는 서비스 로직 변경 없이 기존 `listOrders`/`getOrder` 재사용이라 기존 서비스 테스트가 그대로 커버.

## 성공 조건 대응
| 스펙 성공 조건 | 대응 구현 |
|---------------|----------|
| 1. 로그인 시 본인 주문 최신순 나열 | `listOrders(session.userId)`(WHERE user_id, ORDER BY id DESC) → `OrderCard` 리스트 |
| 2. 음식점명·일시·총액·상태 라벨 표시 | `OrderCard`가 4개 필드 렌더 |
| 3. 클릭 시 `/orders/[id]` 이동 | 카드 전체 `<Link href={/orders/${order.id}}>` |
| 4. 비로그인 시 `/login` 리다이렉트 | `if (!session) redirect('/login')` |
| 5. 주문 없으면 빈 상태 | `orders.length === 0` 분기 메시지 |
| 6. 새로고침 시 최신 반영 | RSC 매 요청 재조회(동적 라우트) |

## 미구현 항목
- 없음. 스펙 구현 범위(신규 2 + 수정 2) 전부 완료.
- 범위 밖(스펙 명시): 상태별 배지 색상 구분, `orders/error.tsx`, 실시간 polling/websocket, `requireCustomer` 헬퍼 신설.

## QA 검증 요청 사항
- **타입 경계면 — `Order` vs `OrderWithItems`:** 목록 `OrderCard`는 `Order`(items 없음)만 사용. `order.items` 접근이 없는지 확인.
- **Server/Client 경계:** `top-header.tsx`는 `'use client'`이며 서비스/getDb를 import하지 않음(Link만 추가). `order-card.tsx`는 Server Component 유지(서비스 import 없음, `'use client'` 없음).
- **상태 라벨 매핑:** 상세 페이지 `STATUS_HEADINGS`/`STATUS_ICONS`가 `ORDER_STATUS`(pending/cooking/completed) 3종 전부 커버 — 신규 상태 추가 시 라벨 누락 위험(현재 고정 3종).
- **소유권:** 목록 카드의 `/orders/[id]` 링크는 상세에서 `getOrder(userId, id)` 소유자 검증 후 `notFound` → 이중 안전.
