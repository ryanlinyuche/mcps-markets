import { Scale, TrendingUp, CheckCircle, AlertCircle, Users, Clock } from 'lucide-react'

export default function RulesPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-10">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Scale size={24} className="text-blue-600" />
          Rules &amp; Guidelines
        </h1>
        <p className="text-muted-foreground mt-1">How MCPS Markets works — please read before participating.</p>
      </div>

      <Section icon={<TrendingUp size={18} className="text-green-600" />} title="Creating Markets">
        <Rule>Markets must be about real, verifiable MCPS-related events (tests, games, school events).</Rule>
        <Rule>You must provide clear resolution criteria — exactly how and when the market will be decided.</Rule>
        <Rule>You must provide a resolution source — where anyone can verify the outcome (Canvas, MaxPreps, etc.).</Rule>
        <Rule>All markets require admin approval before going live.</Rule>
        <Rule>You can only create a personal score market about yourself.</Rule>
        <Rule>Duplicate or joke markets will be rejected.</Rule>
      </Section>

      <Section icon={<TrendingUp size={18} className="text-blue-600" />} title="Betting">
        <Rule>Each bet is final — you cannot cancel or change a bet once placed.</Rule>
        <Rule>Minimum bet is 1 coin. You cannot bet more than your balance.</Rule>
        <Rule>Payouts are proportional: winners split the entire pool based on how much they bet.</Rule>
        <Rule>If there are no winning bets, all bettors are refunded.</Rule>
        <Rule>You can bet on both sides of the same market, but it is generally not profitable.</Rule>
        <Rule>Betting closes when the market&apos;s close time passes or when the creator requests resolution.</Rule>
      </Section>

      <Section icon={<CheckCircle size={18} className="text-purple-600" />} title="Resolving Markets">
        <Rule>The market creator can request resolution by uploading proof (e.g. a screenshot of Canvas).</Rule>
        <Rule>Once a resolution is requested, the market closes immediately — no more bets accepted.</Rule>
        <Rule>An admin reviews the proof and either approves resolution or rejects it.</Rule>
        <Rule>Admins can also resolve markets directly without a creator request.</Rule>
        <Rule>If a market cannot be resolved (e.g. event cancelled), it is marked N/A and all bets are refunded.</Rule>
        <Rule>Attempting to submit false proof to manipulate a resolution may result in your account being removed.</Rule>
      </Section>

      <Section icon={<Users size={18} className="text-amber-600" />} title="Monthly Winners">
        <Rule>At the end of each month, the player with the highest coin balance is declared the monthly winner.</Rule>
        <Rule>Coins never reset — keep growing your balance month over month.</Rule>
        <Rule>Winners are displayed on the Winners page permanently.</Rule>
      </Section>

      <Section icon={<Clock size={18} className="text-red-500" />} title="Account Activity">
        <Rule>Every account starts with 1,000 coins as a welcome bonus.</Rule>
        <Rule>You earn 10 free coins every day just for having an account.</Rule>
        <Rule>If you do not place any bets for 30 consecutive days, your account will be automatically deleted.</Rule>
        <Rule>Deleted accounts lose all coins and history. You can re-register with your student ID but start from scratch.</Rule>
      </Section>

      <Section icon={<AlertCircle size={18} className="text-red-600" />} title="General Rules">
        <Rule>This platform is for fun only. No real money is involved.</Rule>
        <Rule>Admins have final say on all market approvals, resolutions, and disputes.</Rule>
        <Rule>Attempting to exploit bugs or manipulate markets may result in account removal.</Rule>
        <Rule>Markets about individual students require that student&apos;s consent to create.</Rule>
      </Section>
    </div>
  )
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border p-5 space-y-3">
      <h2 className="font-semibold flex items-center gap-2 text-base">
        {icon}
        {title}
      </h2>
      <ul className="space-y-2">{children}</ul>
    </div>
  )
}

function Rule({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-sm text-muted-foreground">
      <span className="mt-0.5 text-muted-foreground/50">•</span>
      <span>{children}</span>
    </li>
  )
}
