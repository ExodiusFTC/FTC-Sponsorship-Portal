import { Suspense } from 'react'
import { LoginForm } from '@/components/auth/login-form'

export default function LoginPage() {
  // LoginForm reads useSearchParams() (e.g. ?next, ?deleted); a Suspense boundary is
  // required so static prerendering of this public page doesn't bail out.
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}
