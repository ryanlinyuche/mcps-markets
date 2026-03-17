import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback-dev-secret-change-in-production'
)

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get('mcps-session')?.value

  let payload: Record<string, unknown> | null = null
  if (token) {
    try {
      const result = await jwtVerify(token, secret)
      payload = result.payload as Record<string, unknown>
    } catch {}
  }

  if (!payload) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    if (!payload.isAdmin) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      return NextResponse.redirect(new URL('/markets', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/markets/:path*',
    '/schools/:path*',
    '/profile/:path*',
    '/leaderboard/:path*',
    '/admin/:path*',
    '/api/markets/:path*',
    '/api/profile/:path*',
    '/api/leaderboard/:path*',
    '/api/admin/:path*',
  ],
}
