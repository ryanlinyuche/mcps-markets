export interface User {
  id: number
  student_id: string
  name: string
  balance: number
  is_admin: number
  created_at: string
}

export interface Market {
  id: number
  title: string
  description: string | null
  creator_id: number
  creator_name?: string
  status: 'pending_approval' | 'open' | 'rejected' | 'resolved'
  outcome: 'YES' | 'NO' | null
  yes_pool: number
  no_pool: number
  closes_at: string | null
  created_at: string
  resolved_at: string | null
  yes_price?: number
  no_price?: number
}

export interface Position {
  id: number
  user_id: number
  market_id: number
  market_title?: string
  market_status?: string
  market_outcome?: string | null
  side: 'YES' | 'NO'
  coins_bet: number
  created_at: string
}

export interface Transaction {
  id: number
  user_id: number
  type: 'bet_placed' | 'payout' | 'refund' | 'signup_bonus'
  amount: number
  market_id: number | null
  market_title?: string | null
  description: string | null
  created_at: string
}

export interface SessionPayload {
  sub: string
  studentId: string
  name: string
  isAdmin: boolean
}
