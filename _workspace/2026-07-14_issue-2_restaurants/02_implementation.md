# 구현 완료 보고 — 이슈 #2 음식점/메뉴 탐색

## 구현 완료 목록

### 신규 생성
- `types/restaurant.ts` — `FOOD_CATEGORIES`(const), `FoodCategory`/`CategoryFilter` union, `Restaurant`/`MenuItem`/`RestaurantWithMenu`/`RestaurantListQuery` 인터페이스 (스펙 §데이터 그대로).
- `services/restaurant-service.ts` — `listRestaurants(query)`(category 필터 + q 이름/메뉴명 검색), `getRestaurantWithMenu(id)`(존재/미존재 null·메뉴 join). `RestaurantRow`/`MenuItemRow`(snake_case) → 타입(camelCase) 명시 매핑(`mapRestaurant`/`mapMenuItem`), auth-service `UserRow` 패턴 준용.
- `app/restaurants/[id]/page.tsx` — 상세 Server Component. `params`(Promise) await → `Number(id)` 정수/양수 방어 후 `getRestaurantWithMenu`, 미존재/비정상 id → `notFound()`. 대표 이미지 placeholder·이름·설명·별점·ETA·메뉴 목록 렌더, 메뉴 0건 빈 상태.
- `app/restaurants/[id]/not-found.tsx` — 404 UI(홈 복귀 링크).
- `components/features/restaurants/top-header.tsx` — `TopHeader`(Client, `'use client'`). 검색 입력 GET submit → `useRouter().push('/?q=...')`. 로고 FoodNow, 알림/찜/장바구니 아이콘(비기능 placeholder), 로그인 CTA 또는 닉네임. `showSearch` prop으로 상세 화면 검색 숨김.
- `components/features/restaurants/category-filter-chip.tsx` — `CategoryFilterChip`(Server, Link 기반 `?category=`, 현재 q 유지, 활성/비활성 스타일).
- `components/features/restaurants/restaurant-card.tsx` — `RestaurantCard`(Server, 썸네일 그라디언트+🍽️, 찜 ♡ placeholder, 이름·별점·ETA, `/restaurants/[id]` Link).
- `components/features/restaurants/menu-item-row.tsx` — `MenuItemRow`(Server, 이름/설명 좌측, PriceTag+담기(+) placeholder 우측).
- `components/features/restaurants/price-tag.tsx` — `PriceTag`(`toLocaleString('ko-KR')` → `32,000원`).

### 수정
- `lib/db/client.ts` — 기존 `CREATE_USERS_TABLE` 흐름은 그대로 두고, `restaurants`/`menu_items` `CREATE TABLE IF NOT EXISTS` + 인덱스 + `seedRestaurants()`(멱등 가드: `COUNT(*)=0`일 때만, transaction으로 5개 음식점+메뉴 삽입) 추가. `getDb()` 최초 호출 시 exec 후 seed 호출.
- `app/page.tsx` — placeholder 홈 → 실제 음식점 목록. `searchParams`(Promise) await → `firstParam`(배열/undefined 방어) + `parseCategory`(닫힌 셋 검증, 셋 밖이면 '전체' 폴백) → `listRestaurants`. TopHeader + 카테고리 칩 행 + 2열 카드 그리드 + 0건 빈 상태("조건에 맞는 음식점이 없어요").

## 테스트 파일과 구현 일치 여부

실행: `npx vitest run services/restaurant-service.test.ts lib/db/client.test.ts` → **23/23 PASS**. 전체 스위트 **58/58 PASS**.

| 테스트 케이스 | 대응 구현 | 결과 |
|---|---|---|
| 필터 없음 → 전체 반환 | `listRestaurants({})` where 절 없음 | PASS |
| category '전체' → 전체 | `category !== '전체'`일 때만 조건 추가 | PASS |
| category 지정 → 해당만 | `r.category = ?` | PASS |
| 이름 검색 매칭 | `r.name LIKE ?` | PASS |
| 메뉴명 검색 매칭 | `EXISTS(SELECT 1 FROM menu_items ... name LIKE ?)` | PASS |
| category+q 복합 | 두 조건 AND 결합 | PASS |
| 0건 → `[]` | 매핑된 빈 배열 | PASS |
| camelCase 매핑(etaMin/etaMax/createdAt) | `mapRestaurant` 명시 매핑 | PASS |
| getRestaurantWithMenu 존재 → 정보+메뉴 | row + menu join, menu[0] restaurantId/name/price | PASS |
| 미존재 id → null | `if (!row) return null` | PASS |
| 빈 메뉴 → `menu: []` | menuRows 빈 배열 매핑 | PASS |
| restaurants/menu_items 테이블 생성 | `CREATE TABLE IF NOT EXISTS` | PASS |
| 컬럼 스키마(snake_case) | 스펙 DDL 그대로 | PASS |
| seed 1건 이상·category 닫힌 셋·menu join | `seedRestaurants` 5개 음식점 | PASS |
| seed 멱등(재오픈 시 행 수 불변) | `COUNT(*)>0`이면 early return | PASS |

## [확인 필요] 확정 처리
1. 로그아웃 사용자 홈 접근 → **A안(공개 탐색)**. 홈은 redirect 없이 목록 렌더, 헤더에 로그인 CTA만. 상세도 동일.
2. 상세 리뷰 수 → **미표시**(별점만).

## 주요 설계 판단
- **q 검색을 EXISTS 서브쿼리로** 처리 → JOIN + DISTINCT 대신 음식점 단위 중복 없이 이름/메뉴명 OR 매칭. `ORDER BY r.id ASC`로 결정적 순서.
- **seed는 transaction**으로 원자적 삽입, 멱등 가드는 `COUNT(*)` 기반 — 테스트의 파일 재오픈 시나리오 통과.
- **params/searchParams Promise await** (Next.js 15) 준수. category/q는 `string | string[] | undefined` 방어 후 파싱.
- **Server/Client 경계**: `getDb()` 사용 서비스는 Server Component(page)에서만 import. Client는 `TopHeader`만(`useRouter`), 서비스 import 없음.
- **spacing 규칙 준수**: named `--spacing-*` 토큰 미사용, Tailwind 기본 숫자 스케일(`p-4 gap-2 gap-4 gap-6 rounded-lg` 등)만 사용 → 지난 커밋 `max-w-*` 충돌 버그 회피. `max-w-3xl`/`max-w-md` 정상.
- **id 스킴**: restaurants/menu_items INTEGER PK(users TEXT UUID와 다름, 의도적).

## 미구현 항목
- 없음(스펙 필수 범위 전부 구현). `app/loading.tsx`는 스펙상 MVP 제외로 생략.

## QA 검증 요청 사항
- **타입 경계면**: `restaurant-service.ts` snake_case→camelCase 매핑(특히 `eta_min`→`etaMin`, `restaurant_id`→`restaurantId`) 누락 여부.
- **tsc 참고**: `npx tsc --noEmit`에서 `services/restaurant-service.test.ts`의 `result[0].name`류 `TS2532`(noUncheckedIndexedAccess) 6건은 **테스트 파일(수정 금지 산출물)** 자체의 인덱스 접근 strictness이며, 구현 소스 파일은 에러 0건(`grep -v .test.ts` 확인 완료). vitest 런타임은 전부 통과.
- **Server/Client 경계**: `TopHeader`가 `'use client'`이고 서비스/DB를 import하지 않는지.
- **404 경로**: `/restaurants/abc`, `/restaurants/0`, `/restaurants/999999` 모두 notFound 진입 여부.
- **비기능 placeholder**: 찜(♡)·알림(🔔)·장바구니(🛒)·담기(+)에 클릭 핸들러가 없는지(범위 밖 준수).
