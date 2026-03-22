export interface ClassPeriod {
  period: string
  course_title: string
  teacher: string | null
  room: string | null
  course_code: string | null
}

export interface User {
  id: number
  student_id: string
  name: string
  balance: number
  is_admin: number
  created_at: string
  rules_accepted_at?: string | null
  comments_banned?: number | null
}

export interface OptionPool {
  market_id: number
  label: string
  amount: number
  sort_order: number
  price?: number
}

export interface Market {
  id: number
  title: string
  description: string | null
  school: string
  market_type: 'yesno' | 'score' | 'personal_score' | 'sports' | 'sat_act' | 'teacher_quote'
  creator_id: number
  creator_name?: string
  status: 'pending_approval' | 'open' | 'rejected' | 'resolved' | 'pending_resolution'
  outcome: string | null
  pending_outcome?: string | null
  resolution_requested_by?: number | null
  yes_pool: number
  no_pool: number
  closes_at: string | null
  created_at: string
  resolved_at: string | null
  yes_price?: number
  no_price?: number
  option_pools?: OptionPool[]
  resolution_criteria?: string | null
  resolution_source?: string | null
  resolution_notes?: string | null
  resolved_by?: number | null
  resolved_by_name?: string | null
  flag_count?: number
  user_flagged?: boolean
  resolution_proof?: string | null
  subject_user_id?: number | null
  subject_name?: string | null
  period_class?: string | null
  sport?: string | null
  team_a?: string | null
  team_b?: string | null
  score_subtype?: 'letter_grade' | 'overunder' | null
  score_threshold?: number | null
  comments_restricted?: number | null
}

export interface Position {
  id: number
  user_id: number
  market_id: number
  market_title?: string
  market_status?: string
  market_outcome?: string | null
  side: string
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
