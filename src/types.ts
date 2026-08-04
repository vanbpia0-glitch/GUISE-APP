export type ID = string;

export type ColorKey = 'orange' | 'green' | 'yellow' | 'purple';

/** A "hat" — an operating context like SC, Grounds Studio, Van, Me. */
export interface GuiseContext {
  id: ID;
  name: string;
  role_description?: string;
  color_key: ColorKey;
  icon: string; // tabler icon name, e.g. "briefcase"
  sort_order: number;
  active: boolean;
  archived_at?: string;
  created_at: string;
}

export type WhyType = 'pull' | 'push';
export type GoalStatus = 'active' | 'achieved' | 'archived';

export interface Goal {
  id: ID;
  context_id: ID;
  title: string;
  why: string;
  why_type: WhyType;
  quarter: string; // "2026-Q3"
  status: GoalStatus;
  priority_order: number;
  created_at: string;
  achieved_at?: string;
}

export type BlockerCategory = 'not_in_control' | 'somewhat_in_control' | 'in_control';
export type BlockerStatus = 'open' | 'resolved';

export interface Blocker {
  id: ID;
  goal_id: ID;
  description: string;
  category: BlockerCategory;
  status: BlockerStatus;
  created_at: string;
  resolved_at?: string;
}

export type BlockSourceType = 'goal' | 'system' | 'adhoc';
export type MotivationType = 'power' | 'play' | 'people';

export interface Block {
  id: ID;
  title: string;
  context_id: ID;
  goal_id?: ID;
  system_id?: ID;
  source_type: BlockSourceType;
  scheduled_start: string; // ISO datetime
  scheduled_end: string; // ISO datetime
  recurrence_rule?: string;
  is_todays_adventure: boolean;
  motivation_type?: MotivationType;
  completed_at?: string;
  created_at: string;
}

export interface WorkSession {
  id: ID;
  block_id: ID;
  started_at: string;
  ended_at?: string;
  duration_minutes?: number;
}

export type SystemDomain = 'health' | 'work' | 'relationships' | 'finance';

export interface GuiseSystem {
  id: ID;
  context_id?: ID;
  title: string;
  domain: SystemDomain;
  rule_description?: string;
  recurrence_rule?: string; // e.g. "Mon,Wed,Fri"
  energizer_type: MotivationType;
  linked_goal_id?: ID;
  active: boolean;
  archived_at?: string;
  created_at: string;
  // Deliberately no completion / success / streak-requirement field.
}

export type Mood = 'drained' | 'rough' | 'okay' | 'good' | 'great';

export interface Reflection {
  id: ID;
  week_of: string; // ISO date, the Sunday
  mood?: Mood;
  biggest_win?: string;
  per_context_notes: { context_id: ID; note: string }[];
  next_focus?: string;
  created_at: string;
}

export type TargetTimeframe = 'year' | 'quarter';
export type TargetStatus = 'active' | 'achieved' | 'archived';

export interface Target {
  id: ID;
  title: string;
  context_id?: ID;
  linked_system_id?: ID;
  metric_unit: string; // "books", "posts", "km"
  goal_amount: number;
  current_amount: number; // derived; never hand-edited if linked_system_id is set
  timeframe: TargetTimeframe;
  timeframe_label: string; // "2026", "Q3 2026"
  status: TargetStatus;
  created_at: string;
}

export type TargetLogSource = 'manual' | 'system_completion';

export interface TargetLogEntry {
  id: ID;
  target_id: ID;
  amount: number;
  source: TargetLogSource;
  logged_at: string;
  /** Set when source is 'system_completion', so un-completing the Block can reverse this entry. */
  block_id?: ID;
}

export interface AppState {
  contexts: Record<ID, GuiseContext>;
  goals: Record<ID, Goal>;
  blockers: Record<ID, Blocker>;
  blocks: Record<ID, Block>;
  workSessions: Record<ID, WorkSession>;
  systems: Record<ID, GuiseSystem>;
  reflections: Record<ID, Reflection>;
  targets: Record<ID, Target>;
  targetLogEntries: Record<ID, TargetLogEntry>;
  activeTimerBlockId: ID | null;
}
