export interface Keyword {
  kw: string
  match: string
  bid: number
  daily_changes: number
}

export interface Campaign {
  id: string
  name: string
  type: string
  targeting: string
  quantum_state: string
  status: string
  funnel_weight: number
  daily_budget: number
  keywords: Keyword[]
  today_spend: number
  mtd_spend: number
  ctr: number
  roas: number
  ntb_rate: number
  revenue_share: number
  intent_center: number
  hdcp_score: number
  hdcp_signal: string  // "green_light" | "caution" | ""
}

export interface PacingInfo {
  actual_spend: number
  expected_spend: number
  pacing_index: number
  status: string
  severity: string
  direction: string
  remaining_budget: number
  days_remaining: number
  required_daily_rate: number
  current_daily_rate: number
  recovery_multiplier: number
  projected_eom_spend: number
  consecutive_underpacing: number
  consecutive_overpacing: number
}

export interface WaveformCurve {
  id: string
  type: string
  name: string
  intent_center: number
  sigma: number
  scale: number
  opacity: number      // incrementality (NTB rate → 0.25–1.0)
  roas: number
  ntb_rate: number
  points: number[]
}

export interface WaveformData {
  xs: number[]
  individual: WaveformCurve[]
  combined: number[]
}

export interface GmvItem {
  id: string
  name: string
  intent_center: number
  growth_rate: number
  gmv_current: number
  gmv_prior: number
  points: number[]
}

export interface GmvWaveData {
  xs: number[]
  items: GmvItem[]
  combined: number[]
}

export interface ActionLog {
  tool: string
  campaign?: string
  reasoning?: string
  [key: string]: unknown
}

export interface ClientInfo {
  id: string
  name: string
  is_demo: boolean
}

export interface AppState {
  simulated_day: number
  simulated_hour: number
  monthly_budget: number
  goal_spectrum: number
  pacing: PacingInfo
  campaigns: Campaign[]
  waveform: WaveformData
  gmv_wave: GmvWaveData
  action_log: ActionLog[]
  brand_name: string
  is_demo: boolean
  strategy_mode: 'acquisition' | 'balanced' | 'retention'
  strategy_locked: boolean
  strategy_days_remaining: number
}

export interface CycleSummary {
  cycle_narrative: string
  actions_count: number
  goal_spectrum: number
  goal_label: string
  goal_text: string
  budget_changes: Record<string, { before: number; after: number; pct_change: number }>
  before_metrics: { roas: number; ntb_rate: number; ctr: number }
  after_metrics: { roas: number; ntb_rate: number; ctr: number }
  pacing_index_before: number
  pacing_index_after: number
  pacing_status: string
}

export type WsMessage =
  | { type: 'state_update'; state: AppState }
  | { type: 'reasoning_chunk'; text: string }
  | { type: 'action'; tool: string; input: Record<string, unknown>; result: Record<string, unknown> }
  | { type: 'cycle_start'; day: number; hour: number }
  | ({ type: 'cycle_complete' } & CycleSummary)
  | { type: 'error'; message: string }
  | { type: 'reset' }
