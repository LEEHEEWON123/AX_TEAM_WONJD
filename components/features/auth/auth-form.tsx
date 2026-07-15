'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { login, signup } from '@/actions/auth'
import { USER_ROLES } from '@/types/user'
import type { SignupInput, UserRole } from '@/types/user'

type AuthMode = 'login' | 'signup'

interface AuthFormProps {
  mode: AuthMode
}

type FieldErrors = Partial<Record<keyof SignupInput, string>>

const COPY = {
  login: {
    title: '로그인',
    submit: '로그인',
    pending: '로그인 중...',
    switchText: '계정이 없으신가요?',
    switchHref: '/signup',
    switchCta: '회원가입',
  },
  signup: {
    title: '회원가입',
    submit: '회원가입',
    pending: '가입 중...',
    switchText: '이미 계정이 있으신가요?',
    switchHref: '/login',
    switchCta: '로그인',
  },
} as const

// 가입 유형(손님/사장님) 라디오 옵션. 기본 선택은 첫 항목(customer).
const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'customer', label: '손님' },
  { value: 'owner', label: '사장님' },
]

const labelClass = 'text-sm font-medium text-text'
const inputClass = cn(
  'w-full rounded-md border border-border bg-bg px-4 py-2 text-md text-text',
  'placeholder:text-text-muted',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'
)
const errorTextClass = 'text-sm text-danger'

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)

  const copy = COPY[mode]

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFieldErrors({})
    setFormError(null)

    const formData = new FormData(event.currentTarget)
    const email = String(formData.get('email') ?? '')
    const password = String(formData.get('password') ?? '')

    startTransition(async () => {
      if (mode === 'signup') {
        const roleValue = String(formData.get('role') ?? 'customer')
        const role: UserRole = (USER_ROLES as readonly string[]).includes(roleValue)
          ? (roleValue as UserRole)
          : 'customer'
        const result = await signup({
          email,
          password,
          passwordConfirm: String(formData.get('passwordConfirm') ?? ''),
          nickname: String(formData.get('nickname') ?? ''),
          role,
        })
        if (result.ok) {
          router.push('/')
          return
        }
        if (result.field) {
          setFieldErrors({ [result.field]: result.error })
        } else {
          setFormError(result.error)
        }
        return
      }

      const result = await login({ email, password })
      if (result.ok) {
        router.push('/')
        return
      }
      setFormError(result.error)
    })
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface p-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-bg p-6 shadow-sm">
        <h1 className="mb-6 text-xl font-bold text-text">{copy.title}</h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-1">
            <label htmlFor="email" className={labelClass}>
              이메일
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              className={cn(inputClass, fieldErrors.email && 'border-danger')}
              aria-invalid={Boolean(fieldErrors.email)}
            />
            {fieldErrors.email && <p className={errorTextClass}>{fieldErrors.email}</p>}
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="password" className={labelClass}>
              비밀번호
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              className={cn(inputClass, fieldErrors.password && 'border-danger')}
              aria-invalid={Boolean(fieldErrors.password)}
            />
            {fieldErrors.password && <p className={errorTextClass}>{fieldErrors.password}</p>}
          </div>

          {mode === 'signup' && (
            <>
              <div className="flex flex-col gap-1">
                <label htmlFor="passwordConfirm" className={labelClass}>
                  비밀번호 확인
                </label>
                <input
                  id="passwordConfirm"
                  name="passwordConfirm"
                  type="password"
                  autoComplete="new-password"
                  className={cn(inputClass, fieldErrors.passwordConfirm && 'border-danger')}
                  aria-invalid={Boolean(fieldErrors.passwordConfirm)}
                />
                {fieldErrors.passwordConfirm && (
                  <p className={errorTextClass}>{fieldErrors.passwordConfirm}</p>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="nickname" className={labelClass}>
                  닉네임
                </label>
                <input
                  id="nickname"
                  name="nickname"
                  type="text"
                  autoComplete="nickname"
                  className={cn(inputClass, fieldErrors.nickname && 'border-danger')}
                  aria-invalid={Boolean(fieldErrors.nickname)}
                />
                {fieldErrors.nickname && <p className={errorTextClass}>{fieldErrors.nickname}</p>}
              </div>

              <fieldset className="flex flex-col gap-1">
                <legend className={cn(labelClass, 'mb-1')}>가입 유형</legend>
                <div className="grid grid-cols-2 gap-2">
                  {ROLE_OPTIONS.map((option, index) => (
                    <label
                      key={option.value}
                      className={cn(
                        'flex cursor-pointer items-center gap-2 rounded-md border border-border bg-bg px-4 py-2 text-md text-text',
                        'has-[:checked]:border-primary has-[:checked]:text-primary',
                        'focus-within:ring-2 focus-within:ring-primary'
                      )}
                    >
                      <input
                        type="radio"
                        name="role"
                        value={option.value}
                        defaultChecked={index === 0}
                        className="accent-primary"
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              </fieldset>
            </>
          )}

          {formError && <p className={errorTextClass}>{formError}</p>}

          <button
            type="submit"
            disabled={isPending}
            className={cn(
              'mt-2 w-full rounded-md bg-primary px-4 py-2 text-md font-medium text-primary-text',
              'transition-colors hover:bg-primary/90',
              'disabled:pointer-events-none disabled:opacity-50'
            )}
          >
            {isPending ? copy.pending : copy.submit}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-text-muted">
          {copy.switchText}{' '}
          <Link href={copy.switchHref} className="font-medium text-primary underline">
            {copy.switchCta}
          </Link>
        </p>
      </div>
    </main>
  )
}
