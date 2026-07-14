# 테스트 계획 (이미 작성됨 — 기록용)

이슈 #2 진행 중 이전 세션에서 테스트 파일이 선행 작성되어 있음을 확인. Phase 1.5는 생략하고
Phase 2(구현)로 직행.

## 생성된 테스트 파일

- `services/restaurant-service.test.ts` — `listRestaurants`(필터 없음/전체/category/q 검색/이름+메뉴 매칭/복합조건/0건/camelCase 매핑), `getRestaurantWithMenu`(존재/미존재 null/메뉴 join/빈 메뉴) — 총 11 케이스
- `lib/db/client.test.ts` (기존 파일에 추가) — `restaurants`/`menu_items` 테이블 생성, 컬럼 스키마, seed 데이터 존재(1건 이상), category 닫힌 셋 검증, menu_items join 가능, seed 멱등성(재오픈 시 행 수 불변) — 총 7 케이스 추가

## 실행 명령어

```bash
npx vitest run services/restaurant-service.test.ts lib/db/client.test.ts
```

## 구현 대상과의 매핑

테스트는 `01_spec.md`의 성공 조건 1(seed 목록), 2(카테고리/검색 필터), 4(seed 멱등)를 커버한다.
성공 조건 3(상세 페이지 라우팅/404)은 UI 레이어라 단위 테스트 범위 밖 — QA 단계에서 정적 검증.
