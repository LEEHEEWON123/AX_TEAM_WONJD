import { z } from 'zod'
import { USER_ROLES } from '@/types/user'

const PASSWORD_MIN_LENGTH = 8

export const signupSchema = z
  .object({
    email: z.string().email('이메일 형식이 올바르지 않습니다'),
    password: z
      .string()
      .min(PASSWORD_MIN_LENGTH, `비밀번호는 최소 ${PASSWORD_MIN_LENGTH}자 이상이어야 합니다`),
    passwordConfirm: z.string(),
    nickname: z.string().min(1, '닉네임을 입력해 주세요'),
    role: z.enum(USER_ROLES),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: '비밀번호가 일치하지 않습니다',
    path: ['passwordConfirm'],
  })

export const loginSchema = z.object({
  email: z.string().email('이메일 형식이 올바르지 않습니다'),
  password: z.string().min(1, '비밀번호를 입력해 주세요'),
})

export type SignupSchema = z.infer<typeof signupSchema>
export type LoginSchema = z.infer<typeof loginSchema>
