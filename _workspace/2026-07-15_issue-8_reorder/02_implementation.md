# 이슈 #8 재주문 — 구현 보고

스펙 문서(01_spec.md) 생략 요청에 따라 요구사항 기준으로 레이어 순서(services → actions → components → app)로 바로 구현했다. SKIP_TESTS — 테스트/QA 단계 생략.

## 구현 완료 목록

### 신규 생성
- `components/features/orders/reorder-button.tsx` — Client 컴포넌트. `'use client'` + `useTransition` + `useRouter`. `reorderAction(orderId)` 호출 후 결과 분기: 전부 품절이면 이동 없이 인라인 안내, 일부/전체 담김이면 `/cart`로 이동(일부 품절 시 제외 개수 1회성 안내). ReviewForm/FavoriteButton 패턴 준용.

### 수정
- `services/order-service.ts` — `ReorderResult` 인터페이스 + `reorder(userId, orderId): ReorderResult | null` 함수 추가. `getOrder`로 소유권 검증(재사용), 삭제된 메뉴 제외 후 이름 수집, 담을 항목 존재 시 트랜잭션으로 `clearCart` → `cart_items` 교체 삽입.
- `actions/order.ts` — `reorderAction(orderId)` 서버 액션 추가. `getSession()` 가드, `reorder` 호출, `null`이면 `{ ok:false }`, 성공 시 `revalidatePath('/cart')` 후 결과 반환(리다이렉트 없음). import에 `reorder` 추가.
- `app/orders/[id]/page.tsx` — `ReorderButton` import 추가, 홈 링크 위(주문 요약/리뷰 블록 아래)에 `<ReorderButton orderId={order.id} />` 배치. 전체 상태에서 노출(권장안). 이슈 #6 리뷰 블록 등 기존 구조 보존.

## 경계면 처리 방식 (코드로 강제)
- **소유권**: `reorder`는 `getOrder(userId, orderId)` 재사용으로만 검증 — `null` 전파. `userId`는 세션에서만 유입(`reorderAction` → `getSession().userId`). 별도 중복 검증 없음.
- **삭제된 메뉴**: 각 `item.menuItemId`를 `SELECT ... FROM menu_items WHERE id = ?`로 존재 확인. 없으면 `cart_items`에 넣지 않고 이름만 `unavailableItemNames`에 수집 → FK 위반/유령 항목 방지.
- **가격 최신값**: `cart_items`는 price 컬럼을 저장하지 않고 `getCart`가 `menu_items` 조인으로 최신 단가를 파생 → 스냅샷 가격 재사용 원천 차단. insert 시 `menu_item_id`, `restaurant_id`, `quantity`만 기록.
- **단일 음식점 제약**: 담을 항목이 하나 이상이면 무조건 `DELETE FROM cart_items WHERE user_id = ?` 후 교체(재주문 = "이 음식점으로 새로 담기"). 확인 프롬프트 없음.
- **전부 품절**: `available.length === 0`이면 장바구니 무변경, `{ addedCount: 0, unavailableItemNames: [전체] }` 반환 → 버튼이 이동 없이 인라인 안내.
- **원자성**: `clearCart` + 항목 삽입을 `db.transaction`으로 묶음. `ON CONFLICT DO UPDATE ... + excluded.quantity`로 주문 내 중복 menuItemId 방어.
- **파일명**: kebab-case 유지(`reorder-button.tsx`).

## 타입 체크 결과
- `npx tsc --noEmit` — EXIT 0 (통과)

## 미구현 항목
- 없음. 요구사항 4개 항목(서비스/액션/컴포넌트/페이지) 모두 구현.

## 참고 (후속 검토 시)
- `addedCount`는 담은 메뉴 라인 수(distinct menu item) 기준. 총 수량 합이 아님 — 안내 문구("N개 메뉴가 판매 종료되어 제외됐어요")도 라인 수 기준으로 일관.
- 일부 품절 시 `notice` 상태를 세팅한 직후 `router.push('/cart')` 하므로 안내가 화면상 짧게만 노출됨. 요구사항의 "과도한 UX 설계 불필요" 지침에 따른 단순화 처리.
