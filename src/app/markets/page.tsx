import { getSession } from '@/lib/session'
import { MarketsPageClient } from '@/components/markets/MarketsPageClient'

export const dynamic = 'force-dynamic'

export default async function MarketsPage() {
  const session = await getSession()
  return (
    <MarketsPageClient
      userId={session ? Number(session.sub) : null}
      isLoggedIn={!!session}
    />
  )
}
