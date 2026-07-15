# 이슈 #7 "찜한 음식점" 구현 결과

스펙 문서(01_spec.md) 없이 요구사항 기준으로 바로 구현. SKIP_TESTS — 테스트 파일/QA 생략.
스택: Next.js App Router + Server Actions + better-sqlite3 (TanStack Query 미사용 — 프로젝트는 서버 액션 + Server Component 패턴).
레이어 순서: types → db → services → actions → components → pages.

## 타입 체크
`npx tsc --noEmit` → **EXIT 0 (통과)**

## 구현 완료 목록

### 신규 생성
- `types/favorite.ts` — `Favorite` 엔티티 타입(id, userId, restaurantId, createdAt)
- `services/favorite-service.ts` — `toggleFavorite`, `listFavoritesByUser`, `isFavorited`, `getFavoritedRestaurantIds` (자체 RestaurantRow + mapRestaurant 매핑, order/restaurant-service 패턴 준용)
- `actions/favorite.ts` — `'use server'` `toggleFavoriteAction(restaurantId)` → `{ ok:true; favorited } | { ok:false; error }`
- `components/features/favorites/favorite-button.tsx` — Client, `useTransition` + `useState`, preventDefault/stopPropagation
- `app/favorites/page.tsx` — Server Component, 비로그인 `redirect('/login')`, 찜 목록 그리드

### 수정
- `lib/db/client.ts` — `favorites` 테이블(`UNIQUE(user_id, restaurant_id)`) + `idx_favorites_user` 인덱스 추가, `getDb()` 초기화에 등록 (reviews 선례 준용, ALTER 불필요)
- `components/features/restaurants/restaurant-card.tsx` — placeholder ♡ `<span>` → 로그인 시 `FavoriteButton`, 비로그인 시 placeholder 유지. `isAuthenticated` / `initialFavorited` props 추가
- `components/features/restaurants/top-header.tsx` — placeholder ♡ → 로그인 시 `/favorites` `<Link aria-label="찜한 음식점">`, 비로그인 시 placeholder 유지
- `app/page.tsx` — `getFavoritedRestaurantIds`로 목록 찜 여부 일괄 조회(N+1 방지) 후 카드에 `isAuthenticated`/`initialFavorited` 전달
- `app/restaurants/[id]/page.tsx` — 이름 옆에 로그인 사용자에게만 `FavoriteButton` 노출(`isFavorited` 초기값)

## 요구사항 대응
| 요구사항 | 대응 구현 |
|---------|---------|
| 1. favorites 테이블 + UNIQUE 중복 방지 | `lib/db/client.ts` CREATE_FAVORITES_TABLE |
| 2. 서비스 4개 함수 | `services/favorite-service.ts` |
| 3. 액션 비로그인 에러 반환 + revalidatePath 3개 | `actions/favorite.ts` |
| 4. FavoriteButton + 카드/상세 배치, preventDefault/stopPropagation | favorite-button.tsx, restaurant-card.tsx, [id]/page.tsx |
| 5. /favorites 페이지, 비로그인 redirect, 빈 상태 문구 | `app/favorites/page.tsx` |
| 6. TopHeader ♡ → /favorites 링크 | top-header.tsx |
| 7. 목록 찜 여부 initialFavorited 전달 | app/page.tsx |

## 보안/경계면 강제 (코드로 확인)
- 액션 시그니처에 `userId` 파라미터 **없음** — `getSession().userId`로만 획득. 클라이언트 위조 불가.
- `toggleFavorite`: "존재하면 delete, 없으면 insert" + `UNIQUE(user_id, restaurant_id)` DB 제약 → 중복 찜 이중 차단.
- `getFavoritedRestaurantIds`: 파라미터 바인딩(`IN (?, ?, ...)`)만 사용, 문자열 보간 없음(SQL injection 방지). 빈 배열 가드.
- 파일명 kebab-case 유지.

## 설계 판단 메모 (QA/리뷰 참고)
- **FavoriteButton을 카드/상세 공용**으로 설계. preventDefault/stopPropagation은 카드(상위 `<Link>`)에서만 의미 있고 상세엔 무해. 위치(absolute)는 부모(카드의 wrapper div)에서 지정 — 버튼은 위치 비의존.
- **비로그인 카드**: 로그인 링크 대신 정적 placeholder ♡ 유지. 이유: 카드 전체가 `<a>`라 내부 `<a>`(로그인 링크) 중첩은 무효 HTML. 로그인 유도는 이번 범위 밖으로 명시됨.
- 상세 페이지 초기 찜 여부는 `isFavorited` 단건 조회(상세는 1건이라 N+1 무관).
- 버튼은 `isPending` 동안 disable, 서버 결과(`result.favorited`)로만 상태 갱신(낙관적 UI 없음, 요구사항대로).

## 미구현 항목
없음. 요구사항 1~7 전부 구현.
