---
issue_id: 2
parent_run_id: null
kind: initial
title: 음식점/메뉴 탐색
---

# TDD 스펙 초안

> **Stack (harness.config.yaml `stack: auto` → 감지 결과):** Next.js 15 App Router · TypeScript strict · better-sqlite3(싱글턴) · Server Actions · Tailwind v4 · Vitest
> **중요 — 이 프로젝트에는 TanStack Query가 없다.** 데이터 페칭은 **Server Component에서 서비스 함수 직접 호출**(getDb() 경유), 뮤테이션은 **Server Action** 패턴이다. 따라서 아래 템플릿의 `React Query 전략 / queryKey`는 **해당 없음(N/A)** 으로 대체한다.

## patterns_applied

`.harness/patterns/`에서 **활성 패턴**(`deprecated: false`)만 참조했다. (`local/` 비어 있음 → `team/`만 존재)

| id | 적용 내용 |
|----|----------|
| kebab-case-files | 신규 파일명 전부 kebab-case (`restaurant-card.tsx`, `restaurant-service.ts` 등) |
| api-error-throw | 서비스 레이어는 실패 시 `Error` throw, 페이지/라우터에서 처리 (`getRestaurantById` 미존재 시 `notFound()`) |

## 기능
- **무엇을 만드는가:** 지역·카테고리별 음식점을 탐색하고(홈/목록), 음식점 상세에서 메뉴판을 보는 브라우징 UI. 카테고리 필터 칩 + 이름/메뉴 검색 지원. issue #1의 placeholder 홈(`app/page.tsx`)을 실제 음식점 목록 페이지로 대체한다.
- **성공 조건:**
  1. `/` 진입 시 seed된 음식점 목록이 카드 그리드(2열)로 렌더링되고, 각 카드에 이름·별점·ETA(예상 소요시간 범위)가 표시된다.
  2. 카테고리 칩(전체/한식/치킨/분식/일식/중식) 클릭 시 해당 카테고리 음식점만 필터링된다(`전체`는 전부). 검색어 입력 시 음식점명 **또는** 메뉴명에 매칭되는 음식점만 표시된다.
  3. 카드 클릭 → `/restaurants/[id]` 상세로 이동, 대표 이미지 placeholder·이름·별점·ETA·메뉴 목록(이름/설명/가격)이 렌더링된다. 존재하지 않는 id는 404(`notFound()`).
  4. DB 최초 초기화 시 현실적인 샘플 음식점 + 메뉴가 seed되어 있어 빈 화면이 아니다.
- **예외/엣지케이스:**
  - 필터/검색 결과 0건 → 빈 상태 메시지("조건에 맞는 음식점이 없어요").
  - 잘못된 category 쿼리파라미터(닫힌 셋 외) → `전체`로 폴백(throw 아님).
  - 메뉴가 없는 음식점 → 메뉴 섹션 빈 상태 메시지.
  - `/restaurants/[id]`에서 숫자가 아니거나 없는 id → `notFound()`.

## 디자인
- **UI 구조:**
  - **홈/목록 (`/`)**: `TopHeader`(로고 FoodNow + 검색 입력 + 알림/찜/장바구니 아이콘) → 섹션(카테고리 칩 행 → "내 주변 인기 음식점" 타이틀 → `RestaurantCard` 2열 그리드). 각 카드: 썸네일 placeholder(그라디언트 + 🍽️), 찜 버튼(♡, 이번 이슈에서는 **비기능 placeholder** — 찜/장바구니는 이후 이슈), 이름, 별점+ETA 메타.
  - **상세 (`/restaurants/[id]`)**: `TopHeader` → 대표 이미지 placeholder → 음식점명 + 메타(별점·리뷰수·ETA) → "메뉴" 타이틀 → `MenuItemRow` 리스트(이름/설명 좌측, `PriceTag`+담기 버튼 우측). 담기(+) 버튼은 이번 이슈에서 **비기능 placeholder**(장바구니는 이후 이슈).
- **주요 컴포넌트 (DS 레코드 기준, shadcn 미사용):**
  - `top-header.tsx` (`TopHeader`) — 상단 공통 헤더. 검색 입력은 `/`로 GET submit하여 `?q=` 쿼리 반영(Client Component, `useRouter`).
  - `category-filter-chip.tsx` (`CategoryFilterChip`) — 칩 하나. 활성/비활성 스타일. Link 기반(`?category=한식`) 또는 클릭 핸들러.
  - `restaurant-card.tsx` (`RestaurantCard`) — 목록 카드.
  - `menu-item-row.tsx` (`MenuItemRow`) — 상세 메뉴 한 줄.
  - `price-tag.tsx` (`PriceTag`) — 가격 표시(₩ 포맷, `32,000원`).
- **로딩 상태:** Server Component 렌더이므로 페이지 단위 로딩은 없음. 선택적으로 `app/loading.tsx`(간단 Skeleton) 추가 가능 — MVP에서는 **없음**으로 두되 확인 필요는 아님(seed 데이터라 즉시 렌더).
- **에러 상태:** 상세 404는 `not-found.tsx` 또는 `notFound()` 기본 UI. 서비스 throw는 라우트 세그먼트 `error.tsx`로 캐치(선택).
- **빈 상태:** 목록 0건 인라인 메시지, 메뉴 0건 인라인 메시지 (기존 `text-text-muted` 톤 재사용).

## 데이터
- **API 엔드포인트:** REST 엔드포인트 없음. **Server Component가 서비스 함수 직접 호출**(auth 패턴과 동일하게 `services/*-service.ts` → `getDb()`).
- **HTTP 메서드:** N/A (RSC 직접 조회). 검색/필터는 **URL searchParams**(`?category=&q=`)로 표현 → 공유·북마크 가능, Server Component가 `searchParams`로 수신.
- **핵심 타입** (`types/restaurant.ts` 신규):
  ```typescript
  // 닫힌 셋(union) — 별도 테이블 없이 상수 배열로. types/user.ts의 AuthResult union 선례를 따른다.
  export const FOOD_CATEGORIES = ['한식', '치킨', '분식', '일식', '중식'] as const
  export type FoodCategory = (typeof FOOD_CATEGORIES)[number]
  // 필터 UI용(전체 포함). '전체'는 저장값이 아니라 "필터 없음"을 의미.
  export type CategoryFilter = FoodCategory | '전체'

  export interface Restaurant {
    id: number
    name: string
    category: FoodCategory
    description: string
    rating: number      // 0.0~5.0, 저장된 집계값(아래 트레이드오프 참조)
    etaMin: number       // 예상 소요시간(분) 하한
    etaMax: number       // 예상 소요시간(분) 상한
    createdAt: string    // ISO
  }

  export interface MenuItem {
    id: number
    restaurantId: number
    name: string
    description: string
    price: number        // 원(KRW) 정수, 소수 없음
    createdAt: string
  }

  export interface RestaurantWithMenu extends Restaurant {
    menu: MenuItem[]
  }

  export interface RestaurantListQuery {
    category?: CategoryFilter
    q?: string
  }
  ```
- **rating 저장 방식 결정 — 저장된 집계값(stored aggregate):** 아직 리뷰 테이블/기능이 없으므로 `restaurants.rating`을 **REAL 컬럼으로 직접 저장**(seed 시 고정값). 트레이드오프: 지금은 계산 불가하므로 저장이 유일한 현실적 선택. 후속 리뷰 이슈에서 리뷰 테이블 도입 시 (a) 리뷰 INSERT 시 집계 갱신 or (b) 조회 시 `AVG()` 계산으로 전환 가능. 상세 화면의 "리뷰 1,204"도 지금은 실데이터가 없으므로 **표시하지 않거나** 별도 컬럼 없이 생략 권장(리뷰 이슈에서 추가). → [확인 필요] #2 참조.
- **React Query 전략:** N/A (프로젝트에 TanStack Query 미도입). Server Component 직접 페칭.
- **queryKey 구조:** N/A.

### DB 스키마 (`lib/db/client.ts`에 마이그레이션 추가)
```sql
CREATE TABLE IF NOT EXISTS restaurants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT NOT NULL,        -- FoodCategory 값. 앱 레벨에서 닫힌 셋 검증
  description TEXT NOT NULL DEFAULT '',
  rating REAL NOT NULL DEFAULT 0,
  eta_min INTEGER NOT NULL,
  eta_max INTEGER NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS menu_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  restaurant_id INTEGER NOT NULL REFERENCES restaurants(id),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price INTEGER NOT NULL,        -- 원(KRW) 정수
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant ON menu_items(restaurant_id);
```
> 기존 `users` 테이블처럼 `getDb()` 최초 호출 시 `db.exec()`로 생성. `id`는 users(TEXT UUID)와 달리 **INTEGER AUTOINCREMENT** 채택 — URL 경로(`/restaurants/1`)에 자연스럽고 seed 참조가 단순. (users의 UUID 패턴과 다른 점은 의도된 선택.)

### Seed (마이그레이션 시점, 멱등)
`getDb()` 초기화에서 `SELECT COUNT(*) FROM restaurants`가 0일 때만 삽입(멱등 가드). 와이어프레임 예시명 기반 5개 내외:
- 성수족발 본점(한식, ★4.8, 35~45분) — 족발(中) 32,000 / 막국수 9,000 / 보쌈세트 38,000
- 청년치킨 강남점(치킨, ★4.6, 25~35분) — 후라이드 18,000 / 양념치킨 19,000 / 콤보 21,000
- 황금분식(분식, ★4.9, 20~30분) — 떡볶이 4,500 / 순대 4,000 / 튀김세트 5,000
- 멘야도쿄 라멘(일식, ★4.7, 30~40분) — 돈코츠라멘 11,000 / 차슈덮밥 9,500
- (중식 1개 추가 권장) 홍콩반점 성수(중식, ★4.5, 30~40분) — 짜장면 7,000 / 짬뽕 8,000 / 탕수육 16,000
> **후속 참고:** issue #4가 이 동일 스키마 위에 **판매자 주도 CRUD**(음식점/메뉴 등록·수정)를 얹는다. seed는 브라우징 UI가 빈 화면이 되지 않게 하는 임시 데이터이며, 실데이터 유입 후 제거/유지 판단은 issue #4에서.

## 구현 범위
### 신규 생성
- `types/restaurant.ts` — Restaurant / MenuItem / RestaurantWithMenu / FoodCategory·FOOD_CATEGORIES·CategoryFilter / RestaurantListQuery.
- `services/restaurant-service.ts` — `listRestaurants(query: RestaurantListQuery): Restaurant[]`(category 필터 + q로 이름/메뉴명 검색), `getRestaurantWithMenu(id: number): RestaurantWithMenu | null`. row(snake_case)→타입(camelCase) 매핑은 auth-service의 `UserRow` 패턴 준용.
- `lib/validation/restaurant-schema.ts` (선택) — searchParams 파싱(category 닫힌 셋 검증, 미스매치 시 '전체' 폴백). 간단하면 서비스/페이지 내 인라인 처리로 대체 가능.
- `app/restaurants/[id]/page.tsx` — 상세(Server Component, `params.id` → `getRestaurantWithMenu`, 없으면 `notFound()`).
- `app/restaurants/[id]/not-found.tsx` (선택) — 404 UI.
- `components/features/restaurants/top-header.tsx` — `TopHeader`(Client, 검색 입력→`?q=` 반영).
- `components/features/restaurants/category-filter-chip.tsx` — `CategoryFilterChip`.
- `components/features/restaurants/restaurant-card.tsx` — `RestaurantCard`.
- `components/features/restaurants/menu-item-row.tsx` — `MenuItemRow`.
- `components/features/restaurants/price-tag.tsx` — `PriceTag`.

### 수정
- `lib/db/client.ts` — `restaurants` / `menu_items` `CREATE TABLE` + 멱등 seed 추가(기존 `CREATE_USERS_TABLE` 흐름에 이어서).
- `app/page.tsx` — placeholder 홈을 실제 음식점 목록 페이지로 교체(`searchParams`로 category/q 수신 → `listRestaurants` → `TopHeader` + 칩 + 카드 그리드). 로그아웃 사용자 처리는 [확인 필요] #1.

## 기존 패턴 (구현 시 참조)
- **컴포넌트 방식:** 페이지·목록·카드·메뉴행·가격표는 **Server Component**. 인터랙션 필요한 `TopHeader`(검색 입력/네비)와 필터 칩(클릭 네비)만 **Client Component**(auth-form의 `'use client'` + `useRouter` 패턴).
- **데이터 페칭:** Server Component에서 서비스 함수 직접 호출(RSC). 뮤테이션 없음(이번 이슈는 읽기 전용 탐색).
- **훅 네이밍:** 신규 훅 없음(TanStack Query 미사용).
- **queryKey 구조:** N/A.
- **스타일 모드:** **Tailwind** (CSS_CONVENTIONS §1 감지: `@import "tailwindcss"` + `@theme` 토큰, CSS Module/styled 부재 → tailwind 단일). 
- **스타일 패턴:** `cn()`(`lib/utils.ts`) + 유틸리티 클래스. auth-form처럼 반복 클래스는 모듈 상단 상수(`cardClass` 등)로 추출. **DS 토큰 클래스 사용**: `bg-bg/bg-surface/text-text/text-text-muted/border-border/bg-primary/text-primary-text/text-accent/text-warning/text-danger`, radius `rounded-sm/md/lg`, text `text-xs/sm/md/lg/xl`.
- **⚠️ spacing 규칙(지난 커밋 버그 재발 방지):** `--spacing-*` named 토큰을 **절대 재도입 금지**. Tailwind 기본 숫자 스케일 그대로 사용 — xs=`1`, sm=`2`, md=`4`, lg=`6`, xl=`10` (예: `p-4 gap-2 rounded-lg`). `max-w-md` 등 sizing 유틸이 깨지므로 named spacing 토큰 추가 시 프로덕션 버그.

## 테스트 전략
- **SKIP_TESTS: false**
- **근거:** 신규 데이터 레이어(`restaurants`/`menu_items` 테이블·seed), 신규 서비스(`restaurant-service.ts`), 신규 타입/검증 추가 → code-analyzer 기준 "신규 파일·스키마·서비스"에 해당. 최소 커버리지: (1) `getDb()`가 두 테이블 생성 + seed 멱등성(재호출 시 중복 삽입 없음), (2) `listRestaurants` category 필터·q 검색(이름/메뉴명)·0건, (3) `getRestaurantWithMenu` 존재/미존재(null)·메뉴 조인. 기존 `client.test.ts`(`:memory:` + `vi.resetModules()`) 패턴 준용.

## 주의사항
- **타입 경계면(snake_case ↔ camelCase):** DB row는 `eta_min/created_at/restaurant_id`, 타입은 `etaMin/createdAt/restaurantId`. 서비스 매핑 누락 시 `undefined` 필드 위험 — auth-service `UserRow`처럼 명시 매핑 필수.
- **category 닫힌 셋 검증:** DB는 TEXT라 임의 값 저장 가능. seed·(후속 CRUD)에서 `FOOD_CATEGORIES` 밖 값이 들어가면 필터가 조용히 누락 → 저장 경로에서 앱 레벨 검증 권장.
- **searchParams 타입:** Next.js 15에서 `searchParams`는 **Promise** (`await`/`use` 필요). 값은 `string | string[] | undefined` → 배열/undefined 방어 후 파싱.
- **params 비동기:** `[id]` `params`도 Next.js 15에서 Promise. `Number(id)` NaN 방어 후 `notFound()`.
- **id 스킴 불일치(의도적):** restaurants/menu_items는 INTEGER PK, users는 TEXT UUID. 혼동 방지 위해 스펙에 명시.
- **Server/Client 경계:** `TopHeader`·칩만 `'use client'`. 서비스 함수(`getDb()` 사용)는 절대 Client Component에서 import 금지(better-sqlite3 서버 전용).
- **찜/장바구니/알림 아이콘·담기(+) 버튼은 비기능 placeholder** — 이번 이슈 범위 밖. 구현 시 클릭 동작 없이 시각 요소만.

---

## [확인 필요] 항목 (오케스트레이터 판단)

1. **로그아웃 사용자의 홈 접근 정책** — 현재 `app/page.tsx`는 로그인 안 하면 "로그인 필요" placeholder를 보여줌. 실제 음식점 목록으로 대체 시 두 선택지:
   - (A) **탐색은 공개**, 헤더에 로그인 CTA만 노출(디스커버리 우선, 배달앱 관례). 
   - (B) 세션 없으면 `/login`으로 redirect(issue #1 게이팅 일관성).
   - **권장 기본값: (A) 공개 탐색** — "탐색" 기능의 본질상 로그인 전에도 둘러볼 수 있어야 자연스럽고, issue #1의 "로그아웃 사용자를 아무것도 없는 곳으로 보내지 않기"도 충족. 별도 지시 없으면 (A)로 진행.

2. **상세 화면 "리뷰 1,204" 표시 여부** — 리뷰 테이블/기능이 아직 없음. 
   - **권장 기본값: 리뷰 수 미표시**(별점만 표시), 리뷰 도입 이슈에서 추가. 별도 지시 없으면 이대로 진행.

> 그 외 모든 항목(스키마·seed 내용·컴포넌트 배치·URL searchParams 필터 방식·INTEGER PK·rating 저장 집계값·SKIP_TESTS=false)은 권장 기본값으로 확정하여 진행 가능.
