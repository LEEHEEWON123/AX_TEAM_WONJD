'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { deleteMenuItemAction } from '@/actions/seller'
import { PriceTag } from '@/components/features/restaurants/price-tag'
import { MenuItemForm } from '@/components/features/seller/menu-item-form'
import type { MenuItem } from '@/types/restaurant'

interface MenuManagerProps {
  menu: MenuItem[]
}

const actionButtonClass =
  'rounded-md border border-border px-4 py-1 text-sm text-text-muted transition-colors hover:text-text'

/** 사장님 메뉴 관리 컨테이너(Client). 등록 폼 + 목록 + 인라인 수정/삭제. */
export function MenuManager({ menu }: MenuManagerProps) {
  const router = useRouter()
  const [editingId, setEditingId] = useState<number | null>(null)
  const [isDeleting, startDelete] = useTransition()

  function refresh() {
    router.refresh()
  }

  function handleDelete(id: number) {
    startDelete(async () => {
      await deleteMenuItemAction(id)
      refresh()
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-bold text-text">메뉴 추가</h2>
        <MenuItemForm onSuccess={refresh} />
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-bold text-text">등록된 메뉴</h2>
        {menu.length === 0 ? (
          <p className="py-10 text-center text-md text-text-muted">아직 등록된 메뉴가 없어요</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {menu.map((item) =>
              editingId === item.id ? (
                <li key={item.id}>
                  <MenuItemForm
                    item={item}
                    onSuccess={() => {
                      setEditingId(null)
                      refresh()
                    }}
                    onCancel={() => setEditingId(null)}
                  />
                </li>
              ) : (
                <li
                  key={item.id}
                  className="flex items-start justify-between gap-4 rounded-lg border border-border bg-bg p-4"
                >
                  <div className="flex flex-col gap-1">
                    <span className="text-md font-medium text-text">{item.name}</span>
                    {item.description && (
                      <span className="text-sm text-text-muted">{item.description}</span>
                    )}
                    <PriceTag price={item.price} className="text-sm" />
                  </div>

                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingId(item.id)}
                      className={actionButtonClass}
                    >
                      수정
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      disabled={isDeleting}
                      className={cn(
                        actionButtonClass,
                        'hover:border-danger hover:text-danger disabled:opacity-50'
                      )}
                    >
                      삭제
                    </button>
                  </div>
                </li>
              )
            )}
          </ul>
        )}
      </section>
    </div>
  )
}
