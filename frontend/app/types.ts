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

// ── Organic Search Module ────────────────────────────────────────────────────

export interface OrganicDomainOverview {
  domain: string
  authority_score: number
  organic_traffic: number
  organic_keywords: number
  organic_traffic_value: number
  semrush_rank: number
  paid_traffic: number
  backlinks: number
  referring_domains: number
  aio_present_count: number
  aio_owned_count: number
  fsn_present_count: number
  fsn_owned_count: number
  mom_traffic_change: number
  mom_keyword_change: number
}

export interface OrganicKeyword {
  keyword: string
  position: number
  prev_position: number
  position_change: number
  volume: number
  cpc: number
  competition: number
  url: string
  traffic_pct: number
  keyword_difficulty: number
  intent: 0 | 1 | 2 | 3
  trends: number[]
  serp_features: string[]
  owns_aio: boolean
  owns_fsn: boolean
  category: string
  // Computed by backend
  ovs: number
  ai_readiness: number
  position_strength: number
  ai_exposure: number
  wave_position: number
  wave_width: number
  wave_amplitude: number
}

export interface CompetitorEntry {
  domain: string
  authority_score: number
  common_keywords: number
  unique_to_competitor: number
  unique_to_vans: number
  organic_traffic: number
  organic_keywords: number
}

export interface KeywordGap {
  keyword: string
  vans_position: number
  converse_position: number
  newbalance_position: number
  nike_position: number
  volume: number
}

export interface OrganicCompetitors {
  domain: string
  competitors: CompetitorEntry[]
  keyword_gaps: KeywordGap[]
}

export interface PositionHistoryEntry {
  month: string
  visibility_index: number
  avg_position: number
  top10_count: number
  top3_count: number
}

export interface OrganicHistory {
  domain: string
  history: PositionHistoryEntry[]
}

export interface AuditIssue {
  severity: 'error' | 'warning' | 'notice'
  issue: string
  count: number
  slug: string
}

export interface OrganicAudit {
  domain: string
  health_score: number
  crawled_pages: number
  errors: number
  warnings: number
  notices: number
  top_issues: AuditIssue[]
}
