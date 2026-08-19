import { redirect } from 'next/navigation'
import { AuthForm } from '@/components/features/auth/auth-form'
import { getSession } from '@/lib/auth/session'

export default async function LoginPage() {
  const session = await getSession()
  if (session) {
    redirect('/')
  }

  return <AuthForm mode="login" companyOnly />
}
