import type { AppState, Block, Goal, GuiseContext, WorkSession } from '../types';
import {
  addDays,
  elapsedFraction,
  isSameDay,
  isWithin,
  quarterDateRange,
  startOfDay,
  startOfWeek,
} from './date';

export function activeContexts(state: AppState): GuiseContext[] {
  return Object.values(state.contexts)
    .filter((c) => c.active)
    .sort((a, b) => a.sort_order - b.sort_order);
}

export function activeGoals(state: AppState): Goal[] {
  return Object.values(state.goals)
    .filter((g) => g.status === 'active')
    .sort((a, b) => a.priority_order - b.priority_order);
}

export function goalsByContext(state: AppState, contextId: string): Goal[] {
  return activeGoals(state).filter((g) => g.context_id === contextId);
}

export function blocksForGoal(state: AppState, goalId: string): Block[] {
  return Object.values(state.blocks).filter((b) => b.goal_id === goalId);
}

/**
 * Goal progress % = (Blocks linked to this goal, scheduled within its quarter,
 * that are completed) / (all Blocks ever scheduled against this goal within
 * that quarter). No Blocks scheduled yet => 0%, not undefined/NaN.
 */
export function goalProgressPct(state: AppState, goal: Goal): number {
  const { start, end } = quarterDateRange(goal.quarter);
  const blocks = blocksForGoal(state, goal.id).filter((b) =>
    isWithin(new Date(b.scheduled_start), start, end)
  );
  if (blocks.length === 0) return 0;
  const done = blocks.filter((b) => !!b.completed_at).length;
  return Math.round((done / blocks.length) * 100);
}

export type PaceStatus = 'ahead' | 'on_pace' | 'behind';

/**
 * Compares Blocks-completed % against how far through the goal's quarter we
 * are. >=8pts ahead of schedule => 'ahead', >=8pts behind => 'behind',
 * otherwise 'on_pace'. This is what drives "on track" / "needs attention".
 */
export function goalPaceStatus(state: AppState, goal: Goal, now = new Date()): PaceStatus {
  const { start, end } = quarterDateRange(goal.quarter);
  const progress = goalProgressPct(state, goal) / 100;
  const elapsed = elapsedFraction(start, end, now);
  const diff = progress - elapsed;
  if (diff >= 0.08) return 'ahead';
  if (diff <= -0.08) return 'behind';
  return 'on_pace';
}

export function openBlockersForGoal(state: AppState, goalId: string) {
  return Object.values(state.blockers).filter((b) => b.goal_id === goalId && b.status === 'open');
}

export function goalStatusLabel(state: AppState, goal: Goal, now = new Date()): string {
  const openBlockers = openBlockersForGoal(state, goal.id).length;
  if (openBlockers > 0) return `${openBlockers} blocker${openBlockers > 1 ? 's' : ''}`;
  const pct = goalProgressPct(state, goal);
  if (pct === 0) return 'Just started';
  const pace = goalPaceStatus(state, goal, now);
  if (pace === 'ahead') return 'Ahead';
  if (pace === 'behind') return 'Needs attention';
  return 'On track';
}

export function allOpenBlockers(state: AppState) {
  return Object.values(state.blockers).filter((b) => b.status === 'open');
}

export const BLOCKER_RESOLUTION_COPY: Record<string, string> = {
  not_in_control: 'Ignore and outperform',
  somewhat_in_control: 'Take the action, accept the rest',
  in_control: "Fix it — you have the lever",
};

/** Actual minutes spent on a Block: summed WorkSessions if any exist (a
 * still-running session counts its elapsed-so-far), else the scheduled
 * duration if checked off without a timer, else 0 if not done. */
export function blockActualMinutes(state: AppState, block: Block, now = new Date()): number {
  const sessions = Object.values(state.workSessions).filter((s) => s.block_id === block.id);
  if (sessions.length > 0) {
    return sessions.reduce((sum, s) => sum + sessionMinutes(s, now), 0);
  }
  if (block.completed_at) {
    return Math.round(
      (new Date(block.scheduled_end).getTime() - new Date(block.scheduled_start).getTime()) / 60000
    );
  }
  return 0;
}

function sessionMinutes(s: WorkSession, now: Date): number {
  if (s.duration_minutes != null) return s.duration_minutes;
  if (!s.ended_at) return Math.max(0, Math.round((now.getTime() - new Date(s.started_at).getTime()) / 60000));
  return Math.round((new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 60000);
}

export function blocksOnDay(state: AppState, day: Date): Block[] {
  return Object.values(state.blocks)
    .filter((b) => isSameDay(new Date(b.scheduled_start), day))
    .sort((a, b) => new Date(a.scheduled_start).getTime() - new Date(b.scheduled_start).getTime());
}

export function todaysBlocks(state: AppState, now = new Date()): Block[] {
  return blocksOnDay(state, now);
}

export function todaysAdventureBlock(state: AppState): Block | undefined {
  return Object.values(state.blocks).find((b) => b.is_todays_adventure);
}

export function upcomingBlocks(state: AppState, days: number, now = new Date()): Block[] {
  const start = now;
  const end = addDays(startOfDay(now), days);
  return Object.values(state.blocks)
    .filter((b) => {
      const t = new Date(b.scheduled_start);
      return t.getTime() >= start.getTime() && t.getTime() <= end.getTime() && !b.completed_at;
    })
    .sort((a, b) => new Date(a.scheduled_start).getTime() - new Date(b.scheduled_start).getTime());
}

export function blocksInWeek(state: AppState, weekStart: Date): Block[] {
  const end = addDays(weekStart, 7);
  return Object.values(state.blocks).filter((b) => {
    const t = new Date(b.scheduled_start);
    return t.getTime() >= weekStart.getTime() && t.getTime() < end.getTime();
  });
}

/** Sum of actual logged hours per context, for the week containing `now`. */
export function hoursByContextThisWeek(state: AppState, now = new Date()): Record<string, number> {
  const weekStart = startOfWeek(now);
  const blocks = blocksInWeek(state, weekStart);
  const minutesByContext: Record<string, number> = {};
  for (const block of blocks) {
    const mins = blockActualMinutes(state, block, now);
    if (mins <= 0) continue;
    minutesByContext[block.context_id] = (minutesByContext[block.context_id] || 0) + mins;
  }
  const hoursByContext: Record<string, number> = {};
  for (const [ctxId, mins] of Object.entries(minutesByContext)) {
    hoursByContext[ctxId] = Math.round((mins / 60) * 10) / 10;
  }
  return hoursByContext;
}

/** Planned vs actually-logged minutes this week, across every context. */
export function weekPlannedVsActualMinutes(state: AppState, now = new Date()) {
  const weekStart = startOfWeek(now);
  const blocks = blocksInWeek(state, weekStart);
  let planned = 0;
  let actual = 0;
  for (const block of blocks) {
    planned += Math.round(
      (new Date(block.scheduled_end).getTime() - new Date(block.scheduled_start).getTime()) / 60000
    );
    actual += blockActualMinutes(state, block, now);
  }
  return { plannedMinutes: planned, actualMinutes: actual };
}

/**
 * Monthly momentum ring on the Dashboard: 50% weight on Blocks-completed
 * rate (of Blocks already due this month), 50% weight on average Goal
 * progress % across active goals in the current quarter.
 */
export function monthlyMomentum(state: AppState, now = new Date()) {
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  const dueBlocks = Object.values(state.blocks).filter((b) => {
    const t = new Date(b.scheduled_start);
    return isWithin(t, monthStart, monthEnd) && t.getTime() <= now.getTime();
  });
  const blocksRate =
    dueBlocks.length === 0 ? 0 : dueBlocks.filter((b) => !!b.completed_at).length / dueBlocks.length;

  const goals = activeGoals(state);
  const goalsRate =
    goals.length === 0 ? 0 : goals.reduce((sum, g) => sum + goalProgressPct(state, g), 0) / goals.length / 100;

  const momentum = Math.round(((blocksRate + goalsRate) / 2) * 100);
  return { momentum, blocksPct: Math.round(blocksRate * 100), goalsPct: Math.round(goalsRate * 100) };
}

/** Consecutive days (ending today) with at least one completed Block. */
export function currentStreakDays(state: AppState, now = new Date()): number {
  let streak = 0;
  let cursor = startOfDay(now);
  // Today only counts once something's actually been completed on it.
  for (let i = 0; i < 365; i++) {
    const day = addDays(cursor, -i);
    const hasCompleted = Object.values(state.blocks).some(
      (b) => b.completed_at && isSameDay(new Date(b.completed_at), day)
    );
    if (hasCompleted) {
      streak++;
    } else if (i === 0) {
      continue; // today not done yet doesn't break a streak that started yesterday
    } else {
      break;
    }
  }
  return streak;
}

export function blockersResolvedThisWeek(state: AppState, now = new Date()): number {
  const weekStart = startOfWeek(now);
  return Object.values(state.blockers).filter(
    (b) => b.resolved_at && new Date(b.resolved_at).getTime() >= weekStart.getTime()
  ).length;
}

export function blocksCompletedThisWeek(state: AppState, now = new Date()): number {
  const weekStart = startOfWeek(now);
  return Object.values(state.blocks).filter(
    (b) => b.completed_at && new Date(b.completed_at).getTime() >= weekStart.getTime()
  ).length;
}

/**
 * Next un-hit progress milestone (25/50/75/100) for a goal, with how many
 * more completed Blocks it would take — derived from the same denominator
 * goalProgressPct uses, never typed in.
 */
export function nextGoalMilestone(state: AppState, goal: Goal) {
  const { start, end } = quarterDateRange(goal.quarter);
  const blocks = blocksForGoal(state, goal.id).filter((b) =>
    isWithin(new Date(b.scheduled_start), start, end)
  );
  const total = blocks.length;
  const done = blocks.filter((b) => !!b.completed_at).length;
  if (total === 0) return null;
  const pct = (done / total) * 100;
  const thresholds = [25, 50, 75, 100];
  const next = thresholds.find((t) => t > pct);
  if (next === undefined) return null;
  const neededCompleted = Math.ceil((next / 100) * total) - done;
  return { threshold: next, blocksNeeded: Math.max(1, neededCompleted) };
}

/** Count of active goals by why_type — the pull/push motivation mix. */
export function motivationMix(state: AppState) {
  const goals = activeGoals(state);
  const pull = goals.filter((g) => g.why_type === 'pull').length;
  const push = goals.length - pull;
  const total = goals.length || 1;
  return {
    pullPct: Math.round((pull / total) * 100),
    pushPct: Math.round((push / total) * 100),
    pushGoals: goals.filter((g) => g.why_type === 'push'),
  };
}

export function quarterProgress(state: AppState, quarter: string, now = new Date()) {
  const { start, end } = quarterDateRange(quarter);
  const elapsedPct = Math.round(elapsedFraction(start, end, now) * 100);
  const goals = activeGoals(state).filter((g) => g.quarter === quarter);
  const onTrack = goals.filter((g) => {
    const pace = goalPaceStatus(state, g, now);
    return pace !== 'behind' && openBlockersForGoal(state, g.id).length === 0;
  }).length;
  const needAttention = goals.length - onTrack;
  const avgProgress =
    goals.length === 0 ? 0 : Math.round(goals.reduce((s, g) => s + goalProgressPct(state, g), 0) / goals.length);
  return { elapsedPct, avgProgress, onTrack, needAttention, totalGoals: goals.length };
}
