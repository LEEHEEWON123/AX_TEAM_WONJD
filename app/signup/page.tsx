import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'

export default async function SignupPage() {
  const session = await getSession()
  if (session) {
    redirect('/')
  }

  redirect('/login')
}
