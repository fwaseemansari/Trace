import { AuthShell } from '@/components/auth/AuthShell'
import { VerifyForm } from '@/components/auth/VerifyForm'

export default function VerifyPage() {
  return (
    <AuthShell
      title="Verify your email"
      subtitle="We sent a 6-digit code to your inbox. Enter it below to continue."
    >
      <VerifyForm />
    </AuthShell>
  )
}
