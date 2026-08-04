import type { AppState, Block, Goal, GuiseContext, GuiseSystem, MotivationType, Target, WorkSession } from '../types';
import {
  addDays,
  elapsedFraction,
  isSameDay,
  isWithin,
  quarterDateRange,
  startOfDay,
  startOfWeek,
  weekdayLabel,
  yearDateRange,
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

// ---------------------------------------------------------------------------
// Systems

export function activeSystems(state: AppState): GuiseSystem[] {
  return Object.values(state.systems).filter((s) => s.active);
}

export function recurringSystems(state: AppState): GuiseSystem[] {
  return activeSystems(state).filter((s) => !!s.recurrence_rule);
}

export function standingRuleSystems(state: AppState): GuiseSystem[] {
  return activeSystems(state).filter((s) => !s.recurrence_rule);
}

function ruleDays(system: GuiseSystem): string[] {
  return (system.recurrence_rule || '').split(',').map((d) => d.trim()).filter(Boolean);
}

export type DayOccurrence = 'done' | 'scheduled' | 'none';

/** Per-weekday (Mon..Sun of the given week) occurrence status for a System,
 * derived from real Blocks sourced from it — not a separate tracked field. */
export function systemWeekOccurrence(state: AppState, system: GuiseSystem, weekStart: Date): DayOccurrence[] {
  const days = ruleDays(system);
  return Array.from({ length: 7 }, (_, i) => {
    const day = addDays(weekStart, i);
    const abbrev = weekdayLabel(day).slice(0, 3);
    const scheduledToday = days.length === 0 || days.some((d) => d.slice(0, 3).toLowerCase() === abbrev.toLowerCase());
    if (!scheduledToday) return 'none';
    const blocks = Object.values(state.blocks).filter(
      (b) => b.system_id === system.id && isSameDay(new Date(b.scheduled_start), day)
    );
    if (blocks.length === 0) return 'none';
    return blocks.some((b) => !!b.completed_at) ? 'done' : 'scheduled';
  });
}

export function lastActiveDate(state: AppState, system: GuiseSystem): Date | undefined {
  const dates = Object.values(state.blocks)
    .filter((b) => b.system_id === system.id && b.completed_at)
    .map((b) => new Date(b.completed_at!).getTime());
  if (dates.length === 0) return undefined;
  return new Date(Math.max(...dates));
}

export function energizerMix(items: { energizer_type: MotivationType }[]) {
  const total = items.length || 1;
  const count = (t: MotivationType) => items.filter((i) => i.energizer_type === t).length;
  return {
    power: Math.round((count('power') / total) * 100),
    play: Math.round((count('play') / total) * 100),
    people: Math.round((count('people') / total) * 100),
  };
}

/** Total due-vs-done recurring-System days across the whole week (for a summary line). */
export function weeklySystemsDueDone(state: AppState, weekStart: Date) {
  const systems = recurringSystems(state);
  let due = 0;
  let done = 0;
  for (let i = 0; i < 7; i++) {
    const day = addDays(weekStart, i);
    const abbrev = weekdayLabel(day).slice(0, 3).toLowerCase();
    for (const s of systems) {
      if (!ruleDays(s).some((d) => d.slice(0, 3).toLowerCase() === abbrev)) continue;
      due++;
      const blocks = Object.values(state.blocks).filter(
        (b) => b.system_id === s.id && isSameDay(new Date(b.scheduled_start), day)
      );
      if (blocks.some((b) => !!b.completed_at)) done++;
    }
  }
  return { due, done };
}

/** Fraction of this week's "due" recurring-System days that were completed, per weekday. */
export function weeklySystemsRhythm(state: AppState, weekStart: Date) {
  const systems = recurringSystems(state);
  return Array.from({ length: 7 }, (_, i) => {
    const day = addDays(weekStart, i);
    const abbrev = weekdayLabel(day).slice(0, 3).toLowerCase();
    const due = systems.filter((s) => ruleDays(s).some((d) => d.slice(0, 3).toLowerCase() === abbrev));
    if (due.length === 0) return 0;
    const done = due.filter((s) => {
      const blocks = Object.values(state.blocks).filter(
        (b) => b.system_id === s.id && isSameDay(new Date(b.scheduled_start), day)
      );
      return blocks.some((b) => !!b.completed_at);
    }).length;
    return done / due.length;
  });
}

// ---------------------------------------------------------------------------
// Targets

export function targetDateRange(target: Target): { start: Date; end: Date } {
  return target.timeframe === 'year' ? yearDateRange(target.timeframe_label) : quarterDateRange(target.timeframe_label);
}

export function targetProgressPct(target: Target): number {
  if (target.goal_amount <= 0) return 0;
  return Math.round((target.current_amount / target.goal_amount) * 100);
}

export function targetPaceStatus(target: Target, now = new Date()): PaceStatus {
  const { start, end } = targetDateRange(target);
  const progress = target.current_amount / (target.goal_amount || 1);
  const elapsed = elapsedFraction(start, end, now);
  const diff = progress - elapsed;
  if (diff >= 0.08) return 'ahead';
  if (diff <= -0.08) return 'behind';
  return 'on_pace';
}

// ---------------------------------------------------------------------------
// Reflection

export function reflectionForWeek(state: AppState, weekStart: Date) {
  return Object.values(state.reflections).find((r) => isSameDay(new Date(r.week_of), weekStart));
}

/** Most recent reflection strictly before the given week, for "what you said last time." */
export function previousReflection(state: AppState, weekStart: Date) {
  return Object.values(state.reflections)
    .filter((r) => new Date(r.week_of).getTime() < weekStart.getTime())
    .sort((a, b) => new Date(b.week_of).getTime() - new Date(a.week_of).getTime())[0];
}

export function targetLogEntriesFor(state: AppState, targetId: string) {
  return Object.values(state.targetLogEntries)
    .filter((e) => e.target_id === targetId)
    .sort((a, b) => new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime());
}

// ---------------------------------------------------------------------------
// Stats

/** Same 50/50 Blocks-rate / Goals-rate blend as monthlyMomentum, scoped to one week. */
export function weeklyMomentum(state: AppState, weekStart: Date, now = new Date()) {
  const weekEnd = addDays(weekStart, 7);
  const dueBlocks = Object.values(state.blocks).filter((b) => {
    const t = new Date(b.scheduled_start);
    return t.getTime() >= weekStart.getTime() && t.getTime() < weekEnd.getTime() && t.getTime() <= now.getTime();
  });
  const blocksRate =
    dueBlocks.length === 0 ? 0 : dueBlocks.filter((b) => !!b.completed_at).length / dueBlocks.length;
  const daysWithActivity = new Set(
    dueBlocks.filter((b) => b.completed_at).map((b) => startOfDay(new Date(b.completed_at!)).getTime())
  ).size;
  // Divide by days elapsed so far in this week (not always 7) so an
  // in-progress week isn't unfairly compared against a completed one.
  const elapsedDays = Math.min(7, Math.max(1, Math.floor((startOfDay(now).getTime() - weekStart.getTime()) / 86400000) + 1));
  const consistencyRate = Math.min(1, daysWithActivity / elapsedDays);
  const energizedBlocks = dueBlocks.filter((b) => !!b.completed_at && !!b.motivation_type).length;
  const completedCount = dueBlocks.filter((b) => !!b.completed_at).length;
  const energyRate = completedCount === 0 ? 0 : energizedBlocks / completedCount;
  const momentum = Math.round(((blocksRate + consistencyRate + energyRate) / 3) * 100);
  return {
    momentum,
    blocksPct: Math.round(blocksRate * 100),
    consistencyPct: Math.round(consistencyRate * 100),
    energyPct: Math.round(energyRate * 100),
  };
}

export function weekHoursTotal(state: AppState, weekStart: Date, now = new Date()): number {
  const blocks = blocksInWeek(state, weekStart);
  const minutes = blocks.reduce((sum, b) => sum + blockActualMinutes(state, b, now), 0);
  return Math.round((minutes / 60) * 10) / 10;
}

export function sessionsInWeek(state: AppState, weekStart: Date): WorkSession[] {
  const weekEnd = addDays(weekStart, 7);
  return Object.values(state.workSessions).filter((s) => {
    const t = new Date(s.started_at);
    return t.getTime() >= weekStart.getTime() && t.getTime() < weekEnd.getTime() && s.duration_minutes != null;
  });
}

export function sessionLengthHistogram(sessions: WorkSession[]) {
  const buckets = { '15m': 0, '30m': 0, '1h': 0, '1.5h': 0, '2h+': 0 };
  for (const s of sessions) {
    const m = s.duration_minutes || 0;
    if (m <= 22) buckets['15m']++;
    else if (m <= 45) buckets['30m']++;
    else if (m <= 75) buckets['1h']++;
    else if (m <= 105) buckets['1.5h']++;
    else buckets['2h+']++;
  }
  return buckets;
}

export function timeOfDayPattern(sessions: WorkSession[]) {
  let morning = 0;
  let afternoon = 0;
  let evening = 0;
  for (const s of sessions) {
    const hour = new Date(s.started_at).getHours();
    const mins = s.duration_minutes || 0;
    if (hour < 12) morning += mins;
    else if (hour < 17) afternoon += mins;
    else evening += mins;
  }
  const total = morning + afternoon + evening || 1;
  return {
    morningPct: Math.round((morning / total) * 100),
    afternoonPct: Math.round((afternoon / total) * 100),
    eveningPct: Math.round((evening / total) * 100),
  };
}

export function hoursBySourceType(state: AppState, weekStart: Date, now = new Date()) {
  const blocks = blocksInWeek(state, weekStart);
  const minutesBy: Record<Block['source_type'], number> = { goal: 0, system: 0, adhoc: 0 };
  for (const b of blocks) {
    minutesBy[b.source_type] += blockActualMinutes(state, b, now);
  }
  const total = minutesBy.goal + minutesBy.system + minutesBy.adhoc || 1;
  return {
    goalPct: Math.round((minutesBy.goal / total) * 100),
    systemPct: Math.round((minutesBy.system / total) * 100),
    adhocPct: Math.round((minutesBy.adhoc / total) * 100),
  };
}

/** One entry per day of the given month: total logged hours that day. */
export function monthlyConsistency(state: AppState, year: number, month: number, now = new Date()) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => {
    const day = new Date(year, month, i + 1);
    const blocks = blocksOnDay(state, day);
    const minutes = blocks.reduce((sum, b) => sum + blockActualMinutes(state, b, now), 0);
    return { date: day, hours: Math.round((minutes / 60) * 10) / 10 };
  });
  const activeDays = days.filter((d) => d.hours > 0).length;
  let bestDay = days[0];
  for (const d of days) if (d.hours > bestDay.hours) bestDay = d;
  return { days, activeDays, bestDay: bestDay.hours > 0 ? bestDay : undefined };
}

/** Average total hours per week, across every week that has any logged time, excluding one week (typically the current one). */
export function averageWeeklyHours(state: AppState, excludingWeekStart: Date): number {
  const weekTotals = new Map<number, number>();
  for (const block of Object.values(state.blocks)) {
    const minutes = blockActualMinutes(state, block);
    if (minutes <= 0) continue;
    const wk = startOfWeek(new Date(block.scheduled_start)).getTime();
    weekTotals.set(wk, (weekTotals.get(wk) || 0) + minutes);
  }
  weekTotals.delete(excludingWeekStart.getTime());
  const values = Array.from(weekTotals.values());
  if (values.length === 0) return 0;
  const avgMinutes = values.reduce((a, b) => a + b, 0) / values.length;
  return Math.round((avgMinutes / 60) * 10) / 10;
}

/** Longest-ever streak, best single week's hours, and the month name with the most hours. */
export function personalRecords(state: AppState) {
  const completedDates = Object.values(state.blocks)
    .filter((b) => !!b.completed_at)
    .map((b) => startOfDay(new Date(b.completed_at!)).getTime());
  const uniqueDays = Array.from(new Set(completedDates)).sort((a, b) => a - b);
  let longestStreak = 0;
  let current = 0;
  let prev: number | null = null;
  for (const d of uniqueDays) {
    if (prev !== null && d - prev === 24 * 60 * 60 * 1000) current++;
    else current = 1;
    longestStreak = Math.max(longestStreak, current);
    prev = d;
  }

  const weekTotals = new Map<number, number>();
  const monthTotals = new Map<string, number>();
  for (const block of Object.values(state.blocks)) {
    const minutes = blockActualMinutes(state, block);
    if (minutes <= 0) continue;
    const d = new Date(block.scheduled_start);
    const wk = startOfWeek(d).getTime();
    weekTotals.set(wk, (weekTotals.get(wk) || 0) + minutes);
    const mk = `${d.getFullYear()}-${d.getMonth()}`;
    monthTotals.set(mk, (monthTotals.get(mk) || 0) + minutes);
  }
  const bestWeekMinutes = Math.max(0, ...weekTotals.values());
  let bestMonthKey = '';
  let bestMonthMinutes = 0;
  for (const [k, v] of monthTotals) {
    if (v > bestMonthMinutes) {
      bestMonthMinutes = v;
      bestMonthKey = k;
    }
  }
  const bestMonthName = bestMonthKey
    ? new Date(Number(bestMonthKey.split('-')[0]), Number(bestMonthKey.split('-')[1]), 1).toLocaleDateString(
        undefined,
        { month: 'long' }
      )
    : undefined;

  const milestonesCount = Object.values(state.blockers).filter((b) => b.status === 'resolved').length;

  return {
    longestStreakDays: longestStreak,
    bestWeekHours: Math.round((bestWeekMinutes / 60) * 10) / 10,
    bestMonthName,
    milestonesCount,
  };
}
