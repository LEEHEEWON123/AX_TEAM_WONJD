---
issue_id: 6
parent_run_id: null
kind: initial
title: 리뷰
---

# TDD 스펙 초안 — 이슈 #6 리뷰

> stack: Next.js (App Router) · React · Tailwind (design-token 유틸) · better-sqlite3 (harness.config.yaml: stack=auto → next 감지)
> style_mode: **tailwind** (harness.config.yaml=auto → 감지 결과. 디자인 토큰 유틸 클래스 + `cn()` = clsx + tailwind-merge. 이슈 #5와 동일)

## patterns_applied

`.harness/patterns/team/`의 활성 패턴(`deprecated: false`)만 참조했다. local/ 및 레거시 flat 패턴 파일은 없음.

| id | 적용 내용 |
|----|----------|
| kebab-case-files (team) | 신규 파일명 `review-service.ts`, `review-form.tsx`, `star-rating.tsx`, `review-card.tsx`, `review-schema.ts` 등 kebab-case 적용 |
| api-error-throw (team) | 서비스 레이어(`createReview`)는 검증 실패(미소유·미완료·중복·범위초과) 시 `Error` throw, 액션/UI에서 처리 |

## 기능
- **무엇을 만드는가:** 손님이 자신이 **완료(completed)** 한 주문에 대해 별점(1~5) + 텍스트 리뷰를 1회 작성하고, 작성한 리뷰가 해당 음식점 상세 페이지의 "리뷰" 섹션에 노출되게 한다.
- **성공 조건:**
  1. 손님이 자신의 **completed** 주문 상세(`/orders/[id]`)에서 별점(1~5)+텍스트로 리뷰를 작성할 수 있다.
  2. 이미 리뷰한 주문이면 작성 폼 대신 작성된 리뷰(내 별점+텍스트)가 표시된다(1 주문 = 1 리뷰).
  3. `pending`/`cooking` 주문 상세에서는 리뷰 작성 UI가 노출되지 않는다.
  4. 음식점 상세(`/restaurants/[id]`)에 해당 음식점의 리뷰 목록이 최신순으로 노출된다(작성자 닉네임·별점·텍스트·일시).
  5. 리뷰가 없는 음식점은 빈 상태 메시지가 표시된다.
  6. 비로그인/타인 주문에 대한 리뷰 작성은 차단된다(작성 시도 시 서버에서 거부).
- **예외/엣지케이스:**
  - 같은 음식점을 여러 번 주문하면 완료 건마다 각각 1개씩 리뷰 가능(주문 단위 dedup, 음식점 단위 아님).
  - 별점 범위(1~5) 밖·빈 별점 → 검증 실패 인라인 에러.
  - 리뷰 수정/삭제는 이번 범위 밖(MVP). [확인 필요] — **권장 기본값: 범위 밖**(작성/조회만).

## 디자인
- **UI 구조:**
  - **작성 위치 = 주문 상세 페이지(`/orders/[id]`).** 기존 상단 상태 헤더 + `OrderSummary` 아래에 리뷰 블록 추가. `order.status === 'completed'`일 때만 렌더: 미작성이면 `ReviewForm`, 작성 완료면 내 리뷰 카드(읽기 전용) 표시.
  - **조회 위치 = 음식점 상세 페이지(`/restaurants/[id]`).** 기존 "메뉴" 섹션 옆/아래에 "리뷰" `<section>` 추가 — 평균 별점·개수 요약 + `ReviewCard` 세로 리스트(`ul > li`).
- **주요 컴포넌트:** shadcn/ui 미사용. 로컬 feature 컴포넌트 패턴 준용:
  - `StarRating` — 별점 표시/입력 공용. 표시 모드(읽기 전용 ★★★★☆)와 입력 모드(클릭 선택) 지원. ★ 색상은 기존 관례인 `text-warning`(음식점 rating 별과 동일), 미선택은 `text-border`.
  - `ReviewForm` — Client + `useTransition`. 별점 picker + textarea + 제출. `MenuItemForm` 패턴 1:1 준용(인라인 에러, `disabled:opacity-50`).
  - `ReviewCard` — 리뷰 1건(작성자 닉네임·별점·일시·텍스트) 카드.
  - 기존 `TopHeader` 재사용.
- **로딩 상태:** 없음 (Server Component 동기 서비스 호출로 조회. 작성 폼만 Client — 제출 중 `isPending` → "저장 중..." + 버튼 disable, `MenuItemForm` 관례 동일).
- **에러 상태:** 폼 인라인 메시지(`<p className="text-sm text-danger">`) — `MenuItemForm`/`AuthForm` 관례. 별도 `error.tsx` 미추가(기존 페이지 관례).
- **빈 상태:** 리뷰 없는 음식점 → `<p className="py-10 text-center text-md text-text-muted">아직 리뷰가 없어요</p>` (seller 빈상태 문구 패턴 준용).

## 데이터
- **API 엔드포인트:** 없음(REST 라우트 아님). 조회는 RSC에서 서비스 직접 호출, 작성은 Server Action(`'use server'`).
- **HTTP 메서드:** 해당 없음(조회=페이지 로드, 작성=Server Action).
- **신규 DB 테이블 — `reviews`** (`lib/db/client.ts`의 `CREATE_*_TABLE` + index + `getDb()` 등록 패턴 준용). 신규 테이블이므로 `ALTER`(issue #4 `ensureColumn`) 불필요 — `CREATE TABLE IF NOT EXISTS`만으로 기존 `data/app.db`에도 다음 부팅 시 멱등 생성됨(issue #3 orders 도입 선례와 동일):
  ```sql
  CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL UNIQUE REFERENCES orders(id),   -- 주문당 1리뷰(중복 방지)
    user_id TEXT NOT NULL REFERENCES users(id),
    restaurant_id INTEGER NOT NULL REFERENCES restaurants(id), -- 음식점 스코프 조회용(주문에서 파생 저장)
    rating INTEGER NOT NULL,        -- 1~5
    comment TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
  )
  -- CREATE INDEX IF NOT EXISTS idx_reviews_restaurant ON reviews(restaurant_id)
  ```
  > id 스킴: `orders`/`order_items`와 동일한 INTEGER AUTOINCREMENT PK, `user_id`만 TEXT UUID(기존 의도적 불일치 유지).
- **핵심 타입 (신규 `types/review.ts`):** `Order`/`Restaurant` 매핑 선례 준용(snake→camel 명시 매핑).
  ```typescript
  export const RATING_MIN = 1
  export const RATING_MAX = 5

  export interface Review {
    id: number
    orderId: number
    userId: string
    restaurantId: number
    rating: number   // 1~5
    comment: string
    createdAt: string // ISO
  }

  // 음식점 상세 노출용 — users 조인으로 작성자 닉네임 포함(snapshot 아님, 라이브 조인)
  export interface ReviewWithAuthor extends Review {
    authorNickname: string
  }

  export interface ReviewInput {
    rating: number
    comment: string
  }

  // 음식점 리뷰 요약(평균/개수) — 리뷰 섹션 헤더용
  export interface ReviewSummary {
    average: number // 소수 1자리 표시 예정
    count: number
  }
  ```
- **데이터 페칭 전략:** **TanStack Query 미사용** — RSC 동기 서비스 호출 + Server Action. (스펙 템플릿의 React Query 항목은 이 스택에 해당 없음.)
- **queryKey 구조:** 해당 없음.

## 구현 범위
### 신규 생성
- `types/review.ts` — `Review`/`ReviewWithAuthor`/`ReviewInput`/`ReviewSummary` 타입 + `RATING_MIN`/`RATING_MAX` 상수. (참조: `types/order.ts`)
- `lib/validation/review-schema.ts` — zod `reviewSchema`: `rating` int 1~5, `comment` trim. (참조: `lib/validation/menu-schema.ts` — 상수 + 메시지 스타일)
  - [확인 필요] 텍스트 필수 여부 → **권장 기본값: `comment` 선택(빈 문자열 허용), `max`(예: 500)만 제한.** 별점은 필수. (플랜의 "별점+텍스트"는 별점 필수 + 텍스트 입력 가능으로 해석. 텍스트 필수를 원하면 `min(1)` 추가.)
- `services/review-service.ts` — `getDb()` + prepared statement + snake↔camel 매핑(`order-service.ts` 패턴):
  - `createReview(userId, orderId, input): Review` — **소유·상태·중복 서버 검증**(아래 주의사항). `restaurant_id`는 **주문 row에서 파생**(클라 입력 신뢰 금지). 위반 시 `Error` throw(api-error-throw).
  - `listReviewsByRestaurant(restaurantId): ReviewWithAuthor[]` — `JOIN users` 닉네임, `ORDER BY r.id DESC`.
  - `getReviewByOrder(userId, orderId): Review | null` — 주문 상세에서 "이미 작성했는가" 게이팅용(미소유/미존재 시 null, 존재 노출 방지).
  - `getRestaurantReviewSummary(restaurantId): ReviewSummary` — `AVG(rating)`, `COUNT(*)`.
- `actions/review.ts` — `'use server'`. `createReviewAction(orderId, input): ReviewActionResult`. `ReviewActionResult = { ok: true } | { ok: false; error: string }`(seller `SellerActionResult` 패턴). `getSession()` 가드 → 없으면 `redirect('/login')` → `reviewSchema.safeParse` → `try createReview` → catch 시 에러 메시지 매핑 → `revalidatePath('/restaurants/[id]', 'page')` + `revalidatePath('/orders/[id]', 'page')`.
- `components/features/reviews/star-rating.tsx` — 별점 표시/입력 공용(Client — 입력 모드 상태 필요).
- `components/features/reviews/review-form.tsx` — Client + `useTransition`, `createReviewAction` 호출(`MenuItemForm` 준용).
- `components/features/reviews/review-card.tsx` — 리뷰 1건 카드(Server). 닉네임·`StarRating`(표시)·일시(`toLocaleString('ko-KR')`)·텍스트.

### 수정
- `app/orders/[id]/page.tsx` — 리뷰 작성/내 리뷰 블록 추가. `order.status === 'completed'`일 때 `getReviewByOrder(session.userId, order.id)` 조회 → null이면 `<ReviewForm orderId={order.id} />`, 있으면 내 리뷰 읽기 전용 카드. (completed 아니면 아무 것도 렌더 안 함.)
- `app/restaurants/[id]/page.tsx` — "리뷰" `<section>` 추가. `getRestaurantReviewSummary(numericId)` + `listReviewsByRestaurant(numericId)` → 요약(평균 별점·개수) + `ReviewCard` 리스트 또는 빈 상태.
- [확인 필요] `restaurants.rating`(현재 seed 정적값, `createRestaurant`는 초기 0) 집계 갱신 여부 → **권장 기본값: 이번 범위에서 `restaurants.rating` 컬럼은 건드리지 않음.** 리뷰 섹션 요약은 `reviews`에서 실시간 `AVG`로 계산해 별도 표기. 음식점 상단의 기존 `rating.toFixed(1)` 별점은 seed값 유지(리뷰 집계와 이원화 — 후속 개선으로 통합 가능). 통합을 원하면 `createReview` 트랜잭션에서 `UPDATE restaurants SET rating = (SELECT AVG...)`를 함께 수행.

## 기존 패턴 (구현 시 참조)
- 컴포넌트 방식: **Server Component 우선**. 페이지·`ReviewCard`는 Server. `StarRating`(입력)·`ReviewForm`만 Client(`'use client'` + `useTransition`).
- 데이터 페칭: **조회는 RSC 서비스 직접 호출, 작성은 Server Action**(fetch/React Query 아님).
- 인증 게이트: 손님 페이지/액션은 `getSession()` + `if (!session) redirect('/login')` 인라인(참조: `actions/order.ts`, `app/orders/[id]/page.tsx`). `requireOwner`는 owner 전용이라 사용 안 함. customer 전용 헬퍼 미존재 → 인라인 가드 유지.
- 서비스 소유권 스코프: `WHERE ... user_id = ?` / 미소유·미존재 시 `null`(존재 노출 방지) — `getOrder`/`updateOrderStatus` 선례.
- 폼 결과 타입: `{ ok: true } | { ok: false; error: string }`(seller `SellerActionResult`, auth `AuthResult` 계열).
- 검증: zod 스키마 + `safeParse` → 첫 이슈 메시지 반환(`actions/seller.ts` 패턴). 상수는 스키마 파일 상단(`menu-schema.ts`).
- 파일 네이밍: kebab-case (team `kebab-case-files`).
- **스타일 모드:** Tailwind(디자인 토큰 유틸) — CSS_CONVENTIONS §1 감지 결과.
- **스타일 패턴:** 디자인 토큰 유틸(`bg-bg` `text-text` `text-text-muted` `border-border` `bg-surface` `bg-primary` `text-primary-text` `text-warning`(별) `text-danger`(에러)) + 조건부 병합 `cn()`. 카드 골격은 `OrderCard`/`MenuItemForm` 관례(`rounded-lg border border-border ... p-4`). 날짜는 `new Date(createdAt).toLocaleString('ko-KR')`(RSC 렌더 — hydration 불일치 없음).

## 테스트 전략
- **SKIP_TESTS: true (사용자 오버라이드)**
- 근거: 사용자가 "QA검증, 테스트 이런거없이 개발만해"로 명시 오버라이드. 기본 규칙상 신규 파일·테이블·서비스 추가라 `false`가 원칙이나 사용자 지시 우선. Phase 1.5(테스트 선행)·Phase 3(QA)는 이번 파이프라인에서 생략. → 검증 없이 바로 구현으로 넘어가므로 아래 "주의사항"의 경계면을 구현 시 반드시 반영할 것.

## 주의사항
> ⚠️ QA/테스트가 생략되므로 아래 경계면은 **구현에서 코드로 강제**해야 한다.

- **작성 권한 — 본인의 completed 주문만(핵심):** `createReview`는 인자로 받은 `orderId`로 `orders` row를 조회해 **`o.user_id === userId` AND `o.status === 'completed'`** 를 서버에서 재확인해야 한다. 하나라도 불일치면 insert 없이 `Error` throw. 세션 userId만 신뢰하고, 소유·상태를 클라 입력으로 판단하지 말 것.
- **restaurant_id 위조 방지:** `reviews.restaurant_id`는 클라이언트가 보내는 값이 아니라 **조회한 주문 row의 `restaurant_id`에서 파생**해 저장한다. (`ReviewInput`에 restaurantId를 두지 말 것 — rating/comment만.)
- **중복 리뷰 방지(이중 방어):** ① DB `UNIQUE(order_id)` 제약, ② 서비스에서 `getReviewByOrder`(또는 존재 조회) 선확인 후 throw. UNIQUE 위반 시 better-sqlite3가 던지는 예외를 액션에서 사용자 메시지로 매핑(예: "이미 리뷰를 작성했습니다"). 페이지도 이미 작성 시 폼 대신 리뷰를 렌더해 UI 레벨에서 재작성 차단.
- **별점 범위:** zod에서 `int().min(1).max(5)` 강제 + 서비스에서도 방어적 범위 체크 권장(액션 우회 대비). 빈 별점(0/undefined) → 검증 실패.
- **주문 단위 vs 음식점 단위:** dedup 키는 `order_id`(음식점 아님). 같은 음식점 완료 주문이 N건이면 리뷰 N개 가능 — 의도된 동작. 리뷰 목록에 동일 사용자 다건이 정상 노출됨.
- **닉네임 조인(라이브 vs 스냅샷):** `listReviewsByRestaurant`는 `users`를 조인해 현재 닉네임을 표시(주문 item처럼 스냅샷하지 않음). 닉네임 변경 시 과거 리뷰에도 반영됨 — MVP 허용, 추후 필요 시 스냅샷 컬럼 검토. [경미]
- **rating 이원화:** 위 "수정" 항목대로 기본값은 `restaurants.rating`(seed값)과 리뷰 `AVG`가 별개다. 음식점 상단 별점(seed)과 리뷰 섹션 평균이 다를 수 있음 — 의도 확인 필요(권장: 이번엔 분리 유지, 후속 통합).
- **작성 진입 경로:** 리뷰 작성 UI는 `/orders/[id]`(completed)에만 존재. `/orders` 목록 카드에서 상세로 진입하는 기존 동선으로 도달(별도 CTA 불필요). 음식점 상세에는 작성 폼 없음(조회 전용) — 작성은 "주문한 사람"만 가능해야 하므로 주문 상세가 올바른 위치.
- **revalidate 경로:** 동적 세그먼트는 `revalidatePath('/restaurants/[id]', 'page')` 형식 사용(참조: `actions/seller.ts`의 `revalidatePath('/restaurants/[id]', 'page')`). 문자열 리터럴 경로 실수 주의.
- **경계면 — `ReviewInput`에 id류 필드 금지:** 폼→액션 전달은 `{ rating, comment }`만. `orderId`는 액션 인자로 별도 전달(폼 hidden/prop), 서버에서 소유 검증. `Order` vs `OrderWithItems`처럼 타입 경계를 좁게 유지.
