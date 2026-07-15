import { z } from 'zod'
import { FOOD_CATEGORIES } from '@/types/restaurant'

const NAME_MAX = 40
const DESCRIPTION_MAX = 200
const PRICE_MAX = 10_000_000
const ETA_MAX = 240

// 메뉴 등록/수정 입력. price는 양의 정수(KRW).
export const menuItemSchema = z.object({
  name: z.string().trim().min(1, '메뉴 이름을 입력해 주세요').max(NAME_MAX, '메뉴 이름이 너무 깁니다'),
  description: z.string().trim().max(DESCRIPTION_MAX, '설명이 너무 깁니다'),
  price: z
    .number({ invalid_type_error: '가격을 숫자로 입력해 주세요' })
    .int('가격은 정수여야 합니다')
    .positive('가격은 0보다 커야 합니다')
    .max(PRICE_MAX, '가격이 너무 큽니다'),
})

// 음식점 생성 입력. etaMin <= etaMax 보장.
export const restaurantSchema = z
  .object({
    name: z.string().trim().min(1, '음식점 이름을 입력해 주세요').max(NAME_MAX, '이름이 너무 깁니다'),
    category: z.enum(FOOD_CATEGORIES, {
      errorMap: () => ({ message: '카테고리를 선택해 주세요' }),
    }),
    description: z.string().trim().max(DESCRIPTION_MAX, '설명이 너무 깁니다'),
    etaMin: z
      .number({ invalid_type_error: '예상 시간을 숫자로 입력해 주세요' })
      .int()
      .positive('예상 시간은 0보다 커야 합니다')
      .max(ETA_MAX),
    etaMax: z
      .number({ invalid_type_error: '예상 시간을 숫자로 입력해 주세요' })
      .int()
      .positive('예상 시간은 0보다 커야 합니다')
      .max(ETA_MAX),
  })
  .refine((data) => data.etaMin <= data.etaMax, {
    message: '최소 예상 시간은 최대보다 클 수 없습니다',
    path: ['etaMax'],
  })

export type MenuItemSchema = z.infer<typeof menuItemSchema>
export type RestaurantSchema = z.infer<typeof restaurantSchema>
