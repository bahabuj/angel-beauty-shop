import { NextResponse } from 'next/server'

export async function POST() {
  const response = NextResponse.json({ success: true })

  const cookieNames = [
    'next-auth.session-token',
    '__Secure-next-auth.session-token',
    'next-auth.csrf-token',
    '__Host-next-auth.csrf-token',
    'next-auth.callback-url',
  ]

  for (const name of cookieNames) {
    response.cookies.set(name, '', {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: false,
      maxAge: 0,
    })
  }

  return response
}
