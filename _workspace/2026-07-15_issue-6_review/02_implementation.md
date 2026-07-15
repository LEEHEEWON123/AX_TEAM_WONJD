# 구현 보고 — 이슈 #6 리뷰

> stack: Next.js (App Router) · React 19 · Tailwind(디자인 토큰 유틸) · better-sqlite3
> SKIP_TESTS: true (테스트 파일 미생성 — 정상). MVVM 레이어 순서(types → db → validation → service → action → components → app)로 구현.

## 구현 완료 목록

### 신규 생성
- `types/review.ts` — `Review`/`ReviewWithAuthor`/`ReviewInput`/`ReviewSummary` 타입 + `RATING_MIN`/`RATING_MAX` 상수. `ReviewInput`은 `rating`/`comment`만(id류 필드 금지).
- `lib/validation/review-schema.ts` — zod `reviewSchema`: `rating` int 1~5 필수, `comment` trim + max 500(선택, 빈 문자열 허용).
- `services/review-service.ts` — `createReview`(소유·상태·중복·범위 서버 재검증, `restaurant_id` 주문 파생, `Error` throw), `listReviewsByRestaurant`(users 조인 닉네임, `ORDER BY r.id DESC`), `getReviewByOrder`(미소유/미존재 null), `getRestaurantReviewSummary`(`AVG`/`COUNT`). `ReviewErrorCode` 유니온 export.
- `actions/review.ts` — `'use server'`. `createReviewAction(orderId, input)`. `getSession` 가드 → 미로그인 `redirect('/login')` → `reviewSchema.safeParse` → `createReview` try/catch → 에러 코드 매핑 → `revalidatePath('/restaurants/[id]','page')` + `revalidatePath('/orders/[id]','page')`. `ReviewActionResult` 타입.
- `components/features/reviews/star-rating.tsx` — 별점 표시/입력 공용(Client). `onChange` 유무로 입력/표시 모드 분기. 채움 `text-warning`, 미선택 `text-border`.
- `components/features/reviews/review-form.tsx` — Client + `useTransition`. 별점 picker + textarea + 제출. 별점 0 인라인 차단 + 서버 이중 검증. `MenuItemForm` 준용.
- `components/features/reviews/review-card.tsx` — 리뷰 1건 카드(Server). 닉네임·`StarRating`(표시)·일시(`toLocaleString('ko-KR')`)·텍스트.

### 수정
- `lib/db/client.ts` — `reviews` 테이블(`CREATE TABLE IF NOT EXISTS`, `order_id ... UNIQUE`) + `idx_reviews_restaurant` 인덱스 추가, `getDb()` 등록. 신규 테이블이라 ALTER 불필요(멱등).
- `app/orders/[id]/page.tsx` — `order.status === 'completed'`일 때 `getReviewByOrder` 조회 → null이면 `ReviewForm`, 있으면 내 리뷰 `ReviewCard`(읽기 전용). completed 아니면 미렌더.
- `app/restaurants/[id]/page.tsx` — "리뷰" `<section>` 추가. `getRestaurantReviewSummary` + `listReviewsByRestaurant` → 평균 별점·개수 요약 + `ReviewCard` 리스트 또는 빈 상태("아직 리뷰가 없어요").

## 성공 조건 대응 (스펙 §기능)
| # | 성공 조건 | 대응 구현 |
|---|----------|----------|
| 1 | completed 주문 상세에서 별점+텍스트 리뷰 작성 | `app/orders/[id]/page.tsx` completed + 미작성 → `ReviewForm` → `createReviewAction` → `createReview` |
| 2 | 이미 리뷰한 주문이면 작성 폼 대신 내 리뷰 표시(1주문=1리뷰) | 페이지 `myReview ? ReviewCard : ReviewForm` + DB `UNIQUE(order_id)` |
| 3 | pending/cooking 주문 상세에서 리뷰 UI 미노출 | `{order.status === 'completed' && (...)}` 가드 |
| 4 | 음식점 상세에 리뷰 목록 최신순(닉네임·별점·텍스트·일시) | `listReviewsByRestaurant` `ORDER BY r.id DESC` + users 조인 → `ReviewCard` 리스트 |
| 5 | 리뷰 없는 음식점 빈 상태 | `reviews.length === 0` → "아직 리뷰가 없어요" |
| 6 | 비로그인/타인 주문 작성 차단(서버 거부) | 액션 `getSession` → `redirect('/login')`; 서비스 `o.user_id !== userId` → `ORDER_NOT_FOUND` throw |

## 주의사항 경계면 반영 (코드 강제)
| 경계면 | 반영 위치 |
|--------|----------|
| 작성 권한 — 본인의 completed 주문만 | `createReview`: `orders` row 재조회 → `order.user_id === userId` **AND** `order.status === 'completed'` 재확인. 불일치 시 insert 없이 `ORDER_NOT_FOUND`/`ORDER_NOT_COMPLETED` throw. 세션 userId만 신뢰. |
| restaurant_id 위조 방지 | `reviews.restaurant_id`는 클라 입력이 아니라 조회한 주문 row의 `restaurant_id`에서 파생 저장. `ReviewInput`에 restaurantId 없음(`rating`/`comment`만). |
| 중복 방지 이중 방어 | ① DB `UNIQUE(order_id)` 제약, ② 서비스 `SELECT ... FROM reviews WHERE order_id` 선확인 후 throw, ③ INSERT시 `SQLITE_CONSTRAINT_UNIQUE` catch → `ALREADY_REVIEWED`. 페이지도 작성 시 폼 대신 리뷰 렌더. |
| 별점 범위(1~5) | zod `int().min(1).max(5)` + 서비스 `Number.isInteger && MIN~MAX` 방어(액션 우회 대비). 빈 별점(0) → 폼 인라인 차단 + 스키마 실패. |
| revalidatePath 경로 | `revalidatePath('/restaurants/[id]', 'page')` + `revalidatePath('/orders/[id]', 'page')` — 동적 세그먼트 `'[id]' + 'page'` 형식(seller 선례). |
| ReviewInput에 id류 필드 금지 | `orderId`는 액션 인자·폼 prop으로 전달, `ReviewInput`은 `{ rating, comment }`만. |

## 검증
- `npx tsc --noEmit` → exit 0 (컴파일 에러 없음).
- 사용 디자인 토큰(`--color-bg/border/danger/warning/text-muted/primary-text/surface`) `app/globals.css` 존재 확인.
- SKIP_TESTS: true — 테스트 파일 미생성. QA(Phase 3) 이번 파이프라인 생략.

## 미구현 항목
없음. 스펙 §구현 범위 신규 7개 + 수정 3개(페이지 2 + db 1) 전부 구현.
- 스펙 [확인 필요] 항목은 권장 기본값 채택: 리뷰 수정/삭제 범위 밖, `comment` 선택(빈 허용), `restaurants.rating`(seed) 미변경 — 리뷰 평균은 `reviews` 실시간 `AVG`로 별도 표기(이원화 유지).

## QA 검증 요청 사항 (후속 QA 시 확인 권장)
- **타입 경계면:** `ReviewInput`에 id류 필드가 유입되지 않는지(폼→액션→서비스). `ReviewErrorCode` 유니온과 액션 `ERROR_MESSAGES` 레코드 키 일치.
- **소유·상태 재검증 우회:** 액션 우회(직접 서비스 호출)로도 타인/미완료 주문에 insert가 막히는지 — `createReview` 서버 재확인 로직.
- **중복 동시성:** 선확인 통과 후 UNIQUE 위반 catch 경로(`SQLITE_CONSTRAINT_UNIQUE` → `ALREADY_REVIEWED`).
- **RSC/Client 경계:** `StarRating`(Client)이 Server(`ReviewCard`·restaurant 페이지)에서 직렬화 가능한 props(number/string)만 받는지. `onChange` 미전달 시 표시 모드.
- **집계 표시:** `getRestaurantReviewSummary` 평균(`AVG`)의 null(리뷰 0건) → 0 폴백, 상단 seed rating과 이원화 의도.
