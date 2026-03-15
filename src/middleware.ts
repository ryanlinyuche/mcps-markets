import { jwtVerify } from 'jose'
import { NextRequest, NextResponse } from 'next/server'

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback-dev-secret-change-in-production'
)

const protectedPaths = ['/markets', '/profile', '/leaderboard', '/api/markets', '/api/profile', '/api/leaderboard']
const adminPaths = ['/admin', '/api/admin']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get('mcps-session')?.value

  const isProtected = protectedPaths.some(p => pathname.startsWith(p))
  const isAdmin = adminPaths.some(p => pathname.startsWith(p))

  if (!isProtected && !isAdmin) return NextResponse.next()

  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }

  try {
    const { payload } = await jwtVerify(token, secret)
    if (isAdmin && !payload.isAdmin) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      return NextResponse.redirect(new URL('/markets', request.url))
    }
    return NextResponse.next()
  } catch {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }
}

export const config = {
  matcher: [
    '/markets/:path*',
    '/profile/:path*',
    '/leaderboard/:path*',
    '/admin/:path*',
    '/api/markets/:path*',
    '/api/profile/:path*',
    '/api/leaderboard/:path*',
    '/api/admin/:path*',
  ],
}
