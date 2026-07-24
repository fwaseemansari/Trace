import Link from 'next/link'
import { AuthShell } from '@/components/auth/AuthShell'
import { RegisterForm } from '@/components/auth/RegisterForm'

export default function RegisterPage() {
  return (
    <AuthShell
      title="Create your account"
      subtitle="Start chatting with your documents in minutes."
      footer={
        <>
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-secondary hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <RegisterForm />
    </AuthShell>
  )
}
