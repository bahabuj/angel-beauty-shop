import AuthPage from '@/components/pages/auth-page'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sign In | Angelsbeauty',
  description: 'Sign in to your Angelsbeauty account to access premium skincare products.',
  robots: { index: false, follow: true },
}

export default function Auth() {
  return <AuthPage />
}
