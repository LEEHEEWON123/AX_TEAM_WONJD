'use client'

import { useState, useTransition } from 'react'
import { cn } from '@/lib/utils'
import { createMenuItemAction, updateMenuItemAction } from '@/actions/seller'
import type { MenuItem, MenuItemInput } from '@/types/restaurant'

interface MenuItemFormProps {
  /** 지정되면 수정 모드(초기값 채움), 없으면 등록 모드. */
  item?: MenuItem
  /** 성공 후 콜백(목록 새로고침/폼 닫기). */
  onSuccess: () => void
  /** 수정 모드에서 취소 버튼 콜백. */
  onCancel?: () => void
}

const labelClass = 'text-sm font-medium text-text'
const inputClass = cn(
  'w-full rounded-md border border-border bg-bg px-4 py-2 text-md text-text',
  'placeholder:text-text-muted',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'
)

/** 메뉴 등록/수정 공용 폼(Client + useTransition). 검증 실패는 인라인 메시지. */
export function MenuItemForm({ item, onSuccess, onCancel }: MenuItemFormProps) {
  const isEdit = item != null
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    const form = event.currentTarget
    const formData = new FormData(form)
    const input: MenuItemInput = {
      name: String(formData.get('name') ?? ''),
      description: String(formData.get('description') ?? ''),
      price: Number(formData.get('price')),
    }

    startTransition(async () => {
      const result = isEdit
        ? await updateMenuItemAction(item.id, input)
        : await createMenuItemAction(input)
      if (result.ok) {
        if (!isEdit) form.reset()
        onSuccess()
        return
      }
      setError(result.error)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4" noValidate>
      <div className="flex flex-col gap-1">
        <label htmlFor={`name-${item?.id ?? 'new'}`} className={labelClass}>
          메뉴 이름
        </label>
        <input
          id={`name-${item?.id ?? 'new'}`}
          name="name"
          type="text"
          defaultValue={item?.name ?? ''}
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor={`description-${item?.id ?? 'new'}`} className={labelClass}>
          설명
        </label>
        <input
          id={`description-${item?.id ?? 'new'}`}
          name="description"
          type="text"
          defaultValue={item?.description ?? ''}
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor={`price-${item?.id ?? 'new'}`} className={labelClass}>
          가격(원)
        </label>
        <input
          id={`price-${item?.id ?? 'new'}`}
          name="price"
          type="number"
          min={1}
          defaultValue={item?.price ?? ''}
          className={inputClass}
        />
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className={cn(
            'rounded-md bg-primary px-4 py-2 text-md font-medium text-primary-text',
            'transition-colors hover:bg-primary/90',
            'disabled:pointer-events-none disabled:opacity-50'
          )}
        >
          {isPending ? '저장 중...' : isEdit ? '수정' : '메뉴 추가'}
        </button>
        {isEdit && onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="rounded-md border border-border px-4 py-2 text-md text-text-muted transition-colors hover:text-text"
          >
            취소
          </button>
        )}
      </div>
    </form>
  )
}
