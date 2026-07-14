import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { CategoryFilter } from '@/types/restaurant'

interface CategoryFilterChipProps {
  category: CategoryFilter
  active: boolean
  /** 현재 검색어를 유지한 채 카테고리만 바꾸기 위한 q(선택). */
  q?: string
}

/** 카테고리 필터 칩 1개. Link 기반으로 ?category= 를 반영한다. */
export function CategoryFilterChip({ category, active, q }: CategoryFilterChipProps) {
  const params = new URLSearchParams()
  // '전체'는 필터 없음을 의미 → category 파라미터를 붙이지 않는다.
  if (category !== '전체') params.set('category', category)
  if (q) params.set('q', q)
  const query = params.toString()
  const href = query ? `/?${query}` : '/'

  return (
    <Link
      href={href}
      className={cn(
        'whitespace-nowrap rounded-lg border px-4 py-2 text-sm font-medium transition-colors',
        active
          ? 'border-primary bg-primary text-primary-text'
          : 'border-border bg-bg text-text-muted hover:border-primary hover:text-text'
      )}
    >
      {category}
    </Link>
  )
}
