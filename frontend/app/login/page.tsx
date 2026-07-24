import Link from 'next/link'
import { AuthShell } from '@/components/auth/AuthShell'
import { LoginForm } from '@/components/auth/LoginForm'

export default function LoginPage() {
  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to continue to your workspace."
      footer={
        <>
          Don&apos;t have an account?{' '}
          <Link href="/register" className="font-medium text-secondary hover:underline">
            Create one
          </Link>
        </>
      }
    >
      <LoginForm />
    </AuthShell>
  )
}
