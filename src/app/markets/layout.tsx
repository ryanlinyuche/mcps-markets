import { getSession } from '@/lib/session'
import { MarketsSubNav } from '@/components/markets/MarketsSubNav'

export default async function MarketsLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  return (
    <>
      <div className="-mx-4 -mt-8">
        <MarketsSubNav isLoggedIn={!!session} />
      </div>
      <div className="pt-6">{children}</div>
    </>
  )
}
