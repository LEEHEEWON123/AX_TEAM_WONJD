'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { createRestaurantAction } from '@/actions/seller'
import { FOOD_CATEGORIES } from '@/types/restaurant'

const labelClass = 'text-sm font-medium text-text'
const inputClass = cn(
  'w-full rounded-md border border-border bg-bg px-4 py-2 text-md text-text',
  'placeholder:text-text-muted',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'
)

/** 소유 음식점이 없는 사장님이 음식점 1개를 생성하는 폼(Client + useTransition). */
export function CreateRestaurantForm() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    const formData = new FormData(event.currentTarget)
    const input = {
      name: String(formData.get('name') ?? ''),
      category: String(formData.get('category') ?? '') as (typeof FOOD_CATEGORIES)[number],
      description: String(formData.get('description') ?? ''),
      etaMin: Number(formData.get('etaMin')),
      etaMax: Number(formData.get('etaMax')),
    }

    startTransition(async () => {
      const result = await createRestaurantAction(input)
      if (result.ok) {
        router.refresh()
        return
      }
      setError(result.error)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-1">
        <label htmlFor="name" className={labelClass}>
          음식점 이름
        </label>
        <input id="name" name="name" type="text" className={inputClass} />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="category" className={labelClass}>
          카테고리
        </label>
        <select id="category" name="category" className={inputClass} defaultValue={FOOD_CATEGORIES[0]}>
          {FOOD_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="description" className={labelClass}>
          소개
        </label>
        <input id="description" name="description" type="text" className={inputClass} />
      </div>

      <div className="flex gap-4">
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor="etaMin" className={labelClass}>
            최소 예상 시간(분)
          </label>
          <input id="etaMin" name="etaMin" type="number" min={1} defaultValue={20} className={inputClass} />
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor="etaMax" className={labelClass}>
            최대 예상 시간(분)
          </label>
          <input id="etaMax" name="etaMax" type="number" min={1} defaultValue={40} className={inputClass} />
        </div>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className={cn(
          'mt-2 w-full rounded-md bg-primary px-4 py-2 text-md font-medium text-primary-text',
          'transition-colors hover:bg-primary/90',
          'disabled:pointer-events-none disabled:opacity-50'
        )}
      >
        {isPending ? '등록 중...' : '음식점 등록'}
      </button>
    </form>
  )
}
