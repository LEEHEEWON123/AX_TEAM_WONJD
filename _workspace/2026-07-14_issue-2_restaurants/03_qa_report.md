## 검증 결과: PASS_WITH_WARNINGS

> 최종 판정 기준: 테스트 실행 결과 우선 → 정적 분석 보완

## 테스트 실행 결과
- 실행 여부: 실행됨
- 실행 명령어: `npx vitest run services/restaurant-service.test.ts lib/db/client.test.ts` (그리고 회귀 확인용 `npx vitest run` 전체 스위트)
- 소요 시간: 417ms (지정 2파일) / 1.03s (전체 스위트)

| 상태 | 케이스 |
|------|--------|
| ✅ PASS | 23개 (지정 2파일) |
| ❌ FAIL | 0개 |
| 전체 | 23개 |

전체 스위트: **58/58 PASS** (`lib/validation/auth-schema.test.ts` 8, `actions/auth.test.ts` 8, `services/restaurant-service.test.ts` 11, `lib/auth/session.test.ts` 7, `lib/db/client.test.ts` 12, `lib/auth/password.test.ts` 5, `services/auth-service.test.ts` 7).

implementer 보고서의 "23/23 PASS, 전체 58/58 PASS" 주장을 **직접 재실행하여 동일하게 확인**. 구현 이후 회귀 없음.

### FAIL 케이스 상세
없음.

### 원본 실행 로그 (요약)
```
✓ services/restaurant-service.test.ts (11 tests) 19ms
✓ lib/db/client.test.ts (12 tests) 57ms
Test Files  2 passed (2)
     Tests  23 passed (23)
```

### 참고: 01_test_plan.md 케이스 수 표기 오차
`01_test_plan.md`는 `lib/db/client.test.ts`에 "7 케이스 추가"라고 기록했으나, 실제 파일에는 기존 4개(`describe('getDb')` 상단) + 신규 8개(테이블 생성 2, 컬럼 스키마 2, seed 존재/닫힌셋/join 3, 멱등성 1) = 12개 테스트가 존재(신규 8개). 계획 문서의 단순 집계 오차이며 구현/테스트 자체에는 문제 없음 — [확인] 수준, 수정 불필요.

## 스펙 달성 여부 (Phase 1 성공 조건 기준)
| 성공 조건 | 상태 | 근거 (파일:라인) |
|----------|------|-----------------|
| 1. `/` 진입 시 seed 목록 2열 카드 그리드, 이름·별점·ETA | ✅ | `app/page.tsx:65-72`(그리드), `components/features/restaurants/restaurant-card.tsx:27-35`(이름/별점/ETA), `lib/db/client.ts:58-123`(seed 5건) |
| 2. 카테고리 칩 필터 + 이름/메뉴 검색 | ✅ | `app/page.tsx:22-27,35-36`(파싱), `services/restaurant-service.ts:67-79`(category/q 조건), `restaurant-service.test.ts:121-145`(테스트 통과) |
| 3. 카드 클릭→상세 이동, 대표이미지/이름/별점/ETA/메뉴, 미존재 id 404 | ✅ | `restaurant-card.tsx:11-12`(Link), `app/restaurants/[id]/page.tsx:12-23`(params await, notFound), `app/restaurants/[id]/not-found.tsx` |
| 4. DB 최초 초기화 시 샘플 seed | ✅ | `lib/db/client.ts:57-159`(`seedRestaurants`, 멱등 가드), `client.test.ts:107-133` PASS |
| 로딩 상태 처리 | ✅ (스펙상 불필요) | RSC 직접 렌더, `app/loading.tsx` 의도적 생략(스펙 §디자인 명시) |
| 에러 상태 처리 | ✅ | `notFound()` + `not-found.tsx` |
| 빈 상태 처리 | ✅ | `app/page.tsx:60-63`("조건에 맞는 음식점이 없어요"), `app/restaurants/[id]/page.tsx:53-56`("아직 등록된 메뉴가 없어요") |

## 타입 경계면 검증
| 경계면 | 상태 | 상세 |
|--------|------|------|
| DB row(snake_case) ↔ Service(camelCase) | ✅ | `services/restaurant-service.ts:32-54` `mapRestaurant`/`mapMenuItem`에서 `eta_min→etaMin`, `eta_max→etaMax`, `created_at→createdAt`, `restaurant_id→restaurantId` 전부 명시 매핑 확인. 누락 없음 |
| Service ↔ types/restaurant.ts | ✅ | `Restaurant`/`MenuItem`/`RestaurantWithMenu` 인터페이스와 반환 타입 일치, `RestaurantRow`/`MenuItemRow`는 서비스 파일 내부 전용(외부 노출 안 함) |
| Service ↔ Page(Component) | ✅ | `app/page.tsx:40` `listRestaurants({category, q})` 인자 타입 `RestaurantListQuery`와 일치. `app/restaurants/[id]/page.tsx:20` `getRestaurantWithMenu(numericId)` |
| React Query 설정 | N/A | 스펙에 명시된 대로 TanStack Query 미도입 프로젝트. Server Component 직접 페칭 패턴 확인 |
| Server/Client 경계 | ✅ | `top-header.tsx:1` `'use client'` 최상단, `getDb`/`restaurant-service` import 없음(grep 확인). `category-filter-chip.tsx`/`restaurant-card.tsx`/`menu-item-row.tsx`/`price-tag.tsx`는 전부 Server Component(지시어 없음) |

## CSS 스타일 검증 (CSS_CONVENTIONS.md §13)
| 항목 | 상태 | 상세 |
|------|------|------|
| 스타일 모드 일관성 | ✅ | Tailwind 단일, 기존 auth-form 패턴과 동일하게 `cn()` + 유틸리티 클래스 사용 |
| **named `--spacing-*` 토큰 미재도입** | ✅ | `app/globals.css` diff 없음(git diff 확인 결과 이번 이슈에서 수정된 파일은 `app/page.tsx`/`lib/db/client.ts`/`lib/db/client.test.ts`뿐 — `globals.css` 미변경). 전체 신규 컴포넌트에서 `--spacing-` 검색 결과 0건. `max-w-3xl`/`max-w-md` 등 sizing 유틸 정상 사용, Tailwind 기본 숫자 스케일(`p-4 gap-2 gap-4 gap-6`)만 사용 확인 |
| inline style 정적 값 제거 | ✅ | 인라인 `style` 속성 사용 없음(전부 className) |
| 반복 class 컴포넌트 추출 | ✅ | `iconButtonClass`(top-header.tsx:17) 상수 추출, auth-form 패턴 준용 |
| a11y (focus-visible, touch target) | ✅ | 검색 input에 `focus-visible:outline-none focus-visible:ring-2`(top-header.tsx:75), 아이콘 버튼 `h-9 w-9`(36px)·`h-8 w-8`(32px)는 44px 미만이나 **비기능 placeholder**(클릭 불가, `aria-hidden`)라 터치 타겟 기준 비적용 대상으로 판단 |
| CSS 금지사항 (!important, ID 선택자 등) | ✅ | 해당 없음 |

## 잠재적 위험

### [치명] (수정 필요)
없음.

### [주의] (검토 권장)
- `app/page.tsx:39-40` — `getSession()`과 `listRestaurants()`를 순차 `await`로 처리(직렬). 두 호출은 서로 독립적이므로 `Promise.all`로 병렬화 가능. 현재 DB가 로컬 sqlite라 지연은 미미하나, 성능 최적화 여지로 기록(기능 결함 아님).
- `lib/db/client.ts:151` — `insertRestaurant.run(...)`의 `lastInsertRowid`를 `Number()`로 캐스팅. AUTOINCREMENT PK가 Number.MAX_SAFE_INTEGER를 초과할 규모가 아니므로 실질 위험 없음(seed 5건 한정 컨텍스트).

### [확인] (사용자 확인 필요)
- 저장소 전역에 `eslint.config.js`/`.eslintrc.*`가 존재하지 않아 `npx eslint` 실행이 즉시 실패함(ESLint v10 요구 설정 파일 부재). 이번 이슈의 신규/수정 파일 때문에 발생한 문제가 아니라 **프로젝트 전역의 기존 상태**(이전 이슈들에서도 동일했을 것으로 추정) — 이슈 #2 범위 밖으로 판단, 별도 트래킹 권장.
- `01_test_plan.md`의 "7 케이스 추가" 표기가 실제 8개와 다름(계획 문서 오탈자 수준, 코드에는 영향 없음).

## Next.js 15 params/searchParams 검증
- `app/page.tsx:29-34` — `searchParams: Promise<Record<string, string | string[] | undefined>>` 타입 선언 후 `await searchParams`, `firstParam()`으로 배열/undefined 방어. ✅
- `app/restaurants/[id]/page.tsx:7-12` — `params: Promise<{ id: string }>` 선언 후 `await params`, `Number(id)` → `Number.isInteger` && `> 0` 방어 후 `notFound()`. ✅

## implementer 주장 재검증
1. **"23/23 PASS, 전체 58/58 PASS"** — 직접 재실행하여 **동일 결과 확인**. ✅
2. **"tsc: 테스트 파일 TS2532 6건, 구현 소스 0건"** — `npx tsc --noEmit` 직접 실행 결과:
   ```
   services/restaurant-service.test.ts(125,12): error TS2532
   services/restaurant-service.test.ts(126,12): error TS2532
   services/restaurant-service.test.ts(132,12): error TS2532
   services/restaurant-service.test.ts(138,12): error TS2532
   services/restaurant-service.test.ts(144,12): error TS2532
   services/restaurant-service.test.ts(159,12): error TS2532
   ```
   정확히 6건, 전부 `services/restaurant-service.test.ts`(테스트 파일, `result[0].xxx` 인덱스 접근)에 국한. 구현 소스(`services/restaurant-service.ts`, `app/page.tsx`, `app/restaurants/[id]/page.tsx`, `lib/db/client.ts`, `components/features/restaurants/*.tsx`, `types/restaurant.ts`)에는 tsc 에러 0건. **주장 정확함**. ✅
3. **"getDb()는 Client Component에서 import되지 않음"** — grep으로 `components/features/restaurants/*.tsx` 전체에서 `getDb`/`restaurant-service` import 미검출. ✅
4. **"category 닫힌 셋 미스매치 시 폴백"** — `app/page.tsx:22-27` `parseCategory()`: `FOOD_CATEGORIES` 밖 값이면 throw 없이 `'전체'` 반환 확인. ✅
5. **"찜/알림/장바구니/담기 비기능"** — 전부 `<span aria-hidden>` 요소로 구현, `onClick` 핸들러 없음 확인(`top-header.tsx:41-49`, `restaurant-card.tsx:18-23`, `menu-item-row.tsx:20-25`). ✅

## 테스트 커버리지
- 테스트 파일 존재: 있음 (`services/restaurant-service.test.ts` 11케이스, `lib/db/client.test.ts` 신규 8케이스)
- 누락된 테스트: 없음. 성공 조건 3(상세 라우팅/404)은 스펙상 단위테스트 범위 밖으로 명시되어 있었고, 본 QA에서 코드 리딩으로 대체 검증 완료(위 표 참조).

## 수정 완료 항목
없음 — 수정이 필요한 [치명] 항목이 발견되지 않아 QA 단계에서 코드를 변경하지 않음.

## 최종 권고
테스트 23/23·전체 58/58 PASS를 직접 재실행으로 확인했고, implementer가 보고한 tsc 에러 위치·개수(테스트 파일 6건, 구현 소스 0건) 주장도 정확했다. 스펙의 성공 조건 4가지 모두 코드 근거와 함께 달성되었으며, snake_case↔camelCase 매핑 누락 없음, `--spacing-*` 토큰 재도입 없음(지난 버그 재발 방지 확인), Next.js 15 params/searchParams Promise 처리 정확, Server/Client 경계 위반 없음, 카테고리 폴백 정상 동작을 모두 코드 레벨에서 확인했다.

[치명] 항목 없음. [주의] 2건은 성능/스타일 관점의 경미한 개선 여지이며 기능 결함이 아니다. [확인] 2건(ESLint 설정 부재, 테스트 계획 문서 케이스 수 오탈자)은 이번 이슈 구현 품질과 무관하여 커밋을 막을 사유가 아니라고 판단한다.

**판정: PASS_WITH_WARNINGS** — 커밋 진행 가능. ESLint 설정 부재는 이슈 #2 범위 밖이므로 별도 이슈로 트래킹 권장.
