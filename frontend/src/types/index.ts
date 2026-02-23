// NIGHTWATCH TypeScript Types
// Matches the API contract defined in LOW_LEVEL_DESIGN.md section 7.4

export interface Threat {
  id: string;
  hunt_cycle_id: string | null;
  title: string;
  description: string;
  confidence_score: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status:
    | 'new'
    | 'investigating'
    | 'confirmed'
    | 'false_positive_pending'
    | 'false_positive_confirmed'
    | 'escalated'
    | 'resolved';
  attack_phase:
    | 'initial_compromise'
    | 'lateral_movement'
    | 'privilege_escalation'
    | 'data_exfiltration'
    | 'persistence'
    | 'multi_phase';
  affected_assets: Asset[];
  agent_reasoning: AgentReasoning;
  esql_queries_used: ESQLQuery[];
  mitre_techniques: string[];
  auto_actions_taken: AutoAction[];
  timeline_events: TimelineEvent[];
  elastic_dashboard_url: string | null;
  detected_at: string;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Asset {
  host?: string;
  user?: string;
  type: string;
  role?: string;
}

export interface AgentReasoning {
  scanner?: AgentFinding;
  tracer?: AgentFinding;
  advocate?: AdvocateChallenge;
  commander?: CommanderVerdict;
}

export interface AgentFinding {
  finding: string;
  confidence: number;
  evidence: string[];
}

export interface AdvocateChallenge {
  challenge: string;
  upheld: boolean;
  reason: string;
}

export interface CommanderVerdict {
  verdict: string;
  final_confidence: number;
  reasoning: string;
}

export interface TimelineEvent {
  timestamp: string;
  description: string;
  source_agent: 'scanner' | 'tracer' | 'advocate' | 'commander';
  attack_phase: string;
  evidence: Record<string, any>;
}

export interface ESQLQuery {
  tool: string;
  query: string;
}

export interface AutoAction {
  action: string;
  target: string;
  workflow_id?: string;
  ticket_id?: string;
  status: 'pending' | 'completed' | 'failed';
  completed_at?: string;
}

export interface ThreatAction {
  id: string;
  threat_id: string;
  action_type: string;
  performed_by: string;
  notes: string | null;
  created_at: string;
}

export interface HuntCycle {
  id: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  triggered_by: 'scheduled' | 'manual';
  threats_found_count: number;
  agent_summary: {
    threats_found?: number;
    high_confidence?: number;
    medium_confidence?: number;
    low_confidence?: number;
    avg_confidence?: number;
    raw_response_preview?: string;
    error?: string;
  } | null;
  started_at: string;
  completed_at: string | null;
}

export interface HuntCycleThreat {
  id: string;
  title: string;
  confidence_score: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: string;
  attack_phase: string;
}

export interface HuntCycleDetailResponse {
  hunt: HuntCycle & { threats: HuntCycleThreat[] };
}

export interface ReviewQueueItem {
  id: string;
  threat: Threat;
  marked_by: string;
  reason: string;
  review_status: 'pending' | 'confirmed_fp' | 'rejected_fp';
  reviewed_by: string | null;
  review_notes: string | null;
  reviewed_at: string | null;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'agent';
  content: string;
  agent_name: string | null;
  metadata: Record<string, any> | null;
  created_threat_id: string | null;
  created_at: string;
  /** Client-side only: true for optimistic "thinking" placeholders */
  isThinking?: boolean;
  /** Client-side only: live status text streamed via thinking_step events */
  thinkingStep?: string;
}

export interface DashboardStats {
  threats_today: number;
  threats_this_week: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  avg_confidence: number;
  pending_review_count: number;
  hunts_completed_today: number;
  hunts_failed_today: number;
  avg_hunt_duration_seconds: number;
  false_positive_rate: number;
  threats_resolved_today: number;
  active_threats: number;
}

export interface ExceptionPattern {
  id: string;
  pattern_type: string;
  description: string;
  esql_exclusion: string | null;
  active: boolean;
  source_threat_id: string | null;
  created_at: string;
}

export interface PaginationMeta {
  current_page: number;
  total_pages: number;
  total_count: number;
  per_page: number;
}

// API response wrappers
export interface ThreatListResponse {
  threats: Threat[];
  meta: PaginationMeta;
}

export interface ThreatDetailResponse {
  threat: Threat;
  actions: ThreatAction[];
}

export interface ReviewQueueResponse {
  review_queue_items: ReviewQueueItem[];
  meta: PaginationMeta;
}

export interface HuntCycleListResponse {
  hunt_cycles: HuntCycle[];
  meta: PaginationMeta;
}

export interface ChatHistoryResponse {
  messages: ChatMessage[];
}

export interface DashboardStatsResponse {
  stats: DashboardStats;
}

export interface ActivityFeedItem {
  id: string;
  event_type: string;
  title: string;
  detail: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  timestamp: string;
}

export interface ActivityFeedResponse {
  activities: ActivityFeedItem[];
  meta: PaginationMeta;
}

// Filter types for API queries
export interface ThreatFilters {
  status?: string;
  severity?: string;
  confidence_min?: number;
  confidence_max?: number;
  attack_phase?: string;
  date_from?: string;
  date_to?: string;
  asset?: string;
  search?: string;
  sort_by?: 'detected_at' | 'confidence_score' | 'severity';
  sort_order?: 'asc' | 'desc';
  page?: number;
  per_page?: number;
}

export interface ReviewFilters {
  review_status?: 'pending' | 'confirmed_fp' | 'rejected_fp';
  page?: number;
  per_page?: number;
}

export interface HuntFilters {
  status?: string;
  triggered_by?: string;
  date_from?: string;
  date_to?: string;
  sort_by?: 'started_at' | 'threats_found_count';
  sort_order?: 'asc' | 'desc';
  page?: number;
  per_page?: number;
}

