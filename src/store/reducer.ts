import type {
  AppState,
  Block,
  Blocker,
  BlockerCategory,
  ColorKey,
  GuiseContext,
  Goal,
  GuiseSystem,
  MotivationType,
  Reflection,
  SystemDomain,
  Target,
  TargetLogEntry,
  WhyType,
} from '../types';
import { makeId } from '../lib/id';
import { minutesBetween } from '../lib/date';

export type Action =
  | { type: 'ADD_CONTEXT'; payload: { name: string; role_description?: string; color_key: ColorKey; icon: string } }
  | { type: 'UPDATE_CONTEXT'; payload: { id: string; patch: Partial<GuiseContext> } }
  | { type: 'ARCHIVE_CONTEXT'; payload: { id: string } }
  | { type: 'RESTORE_CONTEXT'; payload: { id: string } }
  | { type: 'REORDER_CONTEXTS'; payload: { orderedIds: string[] } }
  | {
      type: 'ADD_GOAL';
      payload: { context_id: string; title: string; why: string; why_type: WhyType; quarter: string };
    }
  | { type: 'UPDATE_GOAL'; payload: { id: string; patch: Partial<Goal> } }
  | { type: 'REORDER_GOALS'; payload: { orderedIds: string[] } }
  | { type: 'ARCHIVE_GOAL'; payload: { id: string } }
  | {
      type: 'ADD_BLOCKER';
      payload: { goal_id: string; description: string; category: BlockerCategory };
    }
  | { type: 'RESOLVE_BLOCKER'; payload: { id: string } }
  | {
      type: 'ADD_BLOCK';
      payload: Omit<Block, 'id' | 'created_at' | 'is_todays_adventure'> & { is_todays_adventure?: boolean };
    }
  | { type: 'UPDATE_BLOCK'; payload: { id: string; patch: Partial<Block> } }
  | { type: 'TOGGLE_BLOCK_COMPLETE'; payload: { id: string } }
  | { type: 'SET_TODAYS_ADVENTURE'; payload: { id: string } }
  | { type: 'START_TIMER'; payload: { block_id: string } }
  | { type: 'STOP_TIMER'; payload?: undefined }
  | {
      type: 'ADD_SYSTEM';
      payload: {
        context_id?: string;
        title: string;
        domain: SystemDomain;
        rule_description?: string;
        recurrence_rule?: string;
        energizer_type: MotivationType;
        linked_goal_id?: string;
      };
    }
  | { type: 'UPDATE_SYSTEM'; payload: { id: string; patch: Partial<GuiseSystem> } }
  | { type: 'ARCHIVE_SYSTEM'; payload: { id: string } }
  | {
      type: 'ADD_REFLECTION';
      payload: Omit<Reflection, 'id' | 'created_at'>;
    }
  | { type: 'UPDATE_REFLECTION'; payload: { id: string; patch: Partial<Reflection> } }
  | {
      type: 'ADD_TARGET';
      payload: Omit<Target, 'id' | 'created_at' | 'current_amount' | 'status'>;
    }
  | { type: 'LOG_TARGET_MANUAL'; payload: { target_id: string; amount: number } };

function nowIso(): string {
  return new Date().toISOString();
}

function withAchievedStatus<T extends { current_amount: number; goal_amount: number; status: string }>(
  t: T
): T {
  if (t.status !== 'archived' && t.current_amount >= t.goal_amount) {
    return { ...t, status: 'achieved' };
  }
  if (t.status === 'achieved' && t.current_amount < t.goal_amount) {
    return { ...t, status: 'active' };
  }
  return t;
}

function unsetOtherAdventures(blocks: AppState['blocks'], keepId: string): AppState['blocks'] {
  const next = { ...blocks };
  for (const id of Object.keys(next)) {
    if (id !== keepId && next[id].is_todays_adventure) {
      next[id] = { ...next[id], is_todays_adventure: false };
    }
  }
  return next;
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'ADD_CONTEXT': {
      const id = makeId('ctx');
      const sortOrder = Object.values(state.contexts).length;
      const ctx: GuiseContext = {
        id,
        name: action.payload.name,
        role_description: action.payload.role_description,
        color_key: action.payload.color_key,
        icon: action.payload.icon,
        sort_order: sortOrder,
        active: true,
        created_at: nowIso(),
      };
      return { ...state, contexts: { ...state.contexts, [id]: ctx } };
    }
    case 'UPDATE_CONTEXT': {
      const existing = state.contexts[action.payload.id];
      if (!existing) return state;
      return {
        ...state,
        contexts: { ...state.contexts, [existing.id]: { ...existing, ...action.payload.patch } },
      };
    }
    case 'ARCHIVE_CONTEXT': {
      const existing = state.contexts[action.payload.id];
      if (!existing) return state;
      return {
        ...state,
        contexts: {
          ...state.contexts,
          [existing.id]: { ...existing, active: false, archived_at: nowIso() },
        },
      };
    }
    case 'RESTORE_CONTEXT': {
      const existing = state.contexts[action.payload.id];
      if (!existing) return state;
      return {
        ...state,
        contexts: {
          ...state.contexts,
          [existing.id]: { ...existing, active: true, archived_at: undefined },
        },
      };
    }
    case 'REORDER_CONTEXTS': {
      const next = { ...state.contexts };
      action.payload.orderedIds.forEach((id, idx) => {
        if (next[id]) next[id] = { ...next[id], sort_order: idx };
      });
      return { ...state, contexts: next };
    }

    case 'ADD_GOAL': {
      const id = makeId('goal');
      const maxOrder = Object.values(state.goals).reduce((m, g) => Math.max(m, g.priority_order), -1);
      const goal: Goal = {
        id,
        context_id: action.payload.context_id,
        title: action.payload.title,
        why: action.payload.why,
        why_type: action.payload.why_type,
        quarter: action.payload.quarter,
        status: 'active',
        priority_order: maxOrder + 1,
        created_at: nowIso(),
      };
      return { ...state, goals: { ...state.goals, [id]: goal } };
    }
    case 'UPDATE_GOAL': {
      const existing = state.goals[action.payload.id];
      if (!existing) return state;
      return { ...state, goals: { ...state.goals, [existing.id]: { ...existing, ...action.payload.patch } } };
    }
    case 'REORDER_GOALS': {
      const next = { ...state.goals };
      action.payload.orderedIds.forEach((id, idx) => {
        if (next[id]) next[id] = { ...next[id], priority_order: idx };
      });
      return { ...state, goals: next };
    }
    case 'ARCHIVE_GOAL': {
      const existing = state.goals[action.payload.id];
      if (!existing) return state;
      return {
        ...state,
        goals: { ...state.goals, [existing.id]: { ...existing, status: 'archived' } },
      };
    }

    case 'ADD_BLOCKER': {
      const id = makeId('blocker');
      const blocker: Blocker = {
        id,
        goal_id: action.payload.goal_id,
        description: action.payload.description,
        category: action.payload.category,
        status: 'open',
        created_at: nowIso(),
      };
      return { ...state, blockers: { ...state.blockers, [id]: blocker } };
    }
    case 'RESOLVE_BLOCKER': {
      const existing = state.blockers[action.payload.id];
      if (!existing) return state;
      return {
        ...state,
        blockers: {
          ...state.blockers,
          [existing.id]: { ...existing, status: 'resolved', resolved_at: nowIso() },
        },
      };
    }

    case 'ADD_BLOCK': {
      const id = makeId('block');
      const isAdventure = !!action.payload.is_todays_adventure;
      const block: Block = {
        ...action.payload,
        id,
        is_todays_adventure: isAdventure,
        created_at: nowIso(),
      };
      let blocks = { ...state.blocks, [id]: block };
      if (isAdventure) blocks = unsetOtherAdventures(blocks, id);
      return { ...state, blocks };
    }
    case 'UPDATE_BLOCK': {
      const existing = state.blocks[action.payload.id];
      if (!existing) return state;
      let blocks = { ...state.blocks, [existing.id]: { ...existing, ...action.payload.patch } };
      if (action.payload.patch.is_todays_adventure) {
        blocks = unsetOtherAdventures(blocks, existing.id);
      }
      return { ...state, blocks };
    }
    case 'SET_TODAYS_ADVENTURE': {
      const existing = state.blocks[action.payload.id];
      if (!existing) return state;
      const blocks = unsetOtherAdventures(
        { ...state.blocks, [existing.id]: { ...existing, is_todays_adventure: true } },
        existing.id
      );
      return { ...state, blocks };
    }

    case 'TOGGLE_BLOCK_COMPLETE': {
      const existing = state.blocks[action.payload.id];
      if (!existing) return state;

      if (!existing.completed_at) {
        // Completing: stamp it, and if this Block is sourced from a System
        // linked to a Target, auto-log +1 toward that Target.
        const blocks = { ...state.blocks, [existing.id]: { ...existing, completed_at: nowIso() } };
        let targets = state.targets;
        let targetLogEntries = state.targetLogEntries;
        if (existing.system_id) {
          const linkedTarget = Object.values(state.targets).find(
            (t) => t.linked_system_id === existing.system_id && t.status !== 'archived'
          );
          if (linkedTarget) {
            const updated = withAchievedStatus({
              ...linkedTarget,
              current_amount: linkedTarget.current_amount + 1,
            });
            targets = { ...targets, [updated.id]: updated };
            const logId = makeId('tlog');
            const entry: TargetLogEntry = {
              id: logId,
              target_id: updated.id,
              amount: 1,
              source: 'system_completion',
              logged_at: nowIso(),
              block_id: existing.id,
            };
            targetLogEntries = { ...targetLogEntries, [logId]: entry };
          }
        }
        return { ...state, blocks, targets, targetLogEntries };
      } else {
        // Un-completing: clear the stamp and reverse any auto target log it caused.
        const blocks = { ...state.blocks, [existing.id]: { ...existing, completed_at: undefined } };
        const reversalEntry = Object.values(state.targetLogEntries).find(
          (e) => e.block_id === existing.id && e.source === 'system_completion'
        );
        if (!reversalEntry) return { ...state, blocks };
        const targetLogEntries = { ...state.targetLogEntries };
        delete targetLogEntries[reversalEntry.id];
        const target = state.targets[reversalEntry.target_id];
        let targets = state.targets;
        if (target) {
          const updated = withAchievedStatus({
            ...target,
            current_amount: Math.max(0, target.current_amount - reversalEntry.amount),
          });
          targets = { ...targets, [updated.id]: updated };
        }
        return { ...state, blocks, targets, targetLogEntries };
      }
    }

    case 'START_TIMER': {
      let workSessions = state.workSessions;
      // Finalize any other running session first — one active timer at a time.
      if (state.activeTimerBlockId && state.activeTimerBlockId !== action.payload.block_id) {
        const running = Object.values(workSessions).find(
          (s) => s.block_id === state.activeTimerBlockId && !s.ended_at
        );
        if (running) {
          const ended = nowIso();
          workSessions = {
            ...workSessions,
            [running.id]: {
              ...running,
              ended_at: ended,
              duration_minutes: minutesBetween(running.started_at, ended),
            },
          };
        }
      }
      const id = makeId('sess');
      const session = { id, block_id: action.payload.block_id, started_at: nowIso() };
      return {
        ...state,
        workSessions: { ...workSessions, [id]: session },
        activeTimerBlockId: action.payload.block_id,
      };
    }
    case 'STOP_TIMER': {
      if (!state.activeTimerBlockId) return state;
      const running = Object.values(state.workSessions).find(
        (s) => s.block_id === state.activeTimerBlockId && !s.ended_at
      );
      if (!running) return { ...state, activeTimerBlockId: null };
      const ended = nowIso();
      const workSessions = {
        ...state.workSessions,
        [running.id]: {
          ...running,
          ended_at: ended,
          duration_minutes: minutesBetween(running.started_at, ended),
        },
      };
      return { ...state, workSessions, activeTimerBlockId: null };
    }

    case 'ADD_SYSTEM': {
      const id = makeId('sys');
      const system: GuiseSystem = {
        id,
        context_id: action.payload.context_id,
        title: action.payload.title,
        domain: action.payload.domain,
        rule_description: action.payload.rule_description,
        recurrence_rule: action.payload.recurrence_rule,
        energizer_type: action.payload.energizer_type,
        linked_goal_id: action.payload.linked_goal_id,
        active: true,
        created_at: nowIso(),
      };
      return { ...state, systems: { ...state.systems, [id]: system } };
    }
    case 'UPDATE_SYSTEM': {
      const existing = state.systems[action.payload.id];
      if (!existing) return state;
      return {
        ...state,
        systems: { ...state.systems, [existing.id]: { ...existing, ...action.payload.patch } },
      };
    }
    case 'ARCHIVE_SYSTEM': {
      const existing = state.systems[action.payload.id];
      if (!existing) return state;
      return {
        ...state,
        systems: {
          ...state.systems,
          [existing.id]: { ...existing, active: false, archived_at: nowIso() },
        },
      };
    }

    case 'ADD_REFLECTION': {
      const id = makeId('refl');
      const reflection: Reflection = { ...action.payload, id, created_at: nowIso() };
      return { ...state, reflections: { ...state.reflections, [id]: reflection } };
    }
    case 'UPDATE_REFLECTION': {
      const existing = state.reflections[action.payload.id];
      if (!existing) return state;
      return {
        ...state,
        reflections: { ...state.reflections, [existing.id]: { ...existing, ...action.payload.patch } },
      };
    }

    case 'ADD_TARGET': {
      const id = makeId('tgt');
      const target: Target = { ...action.payload, id, current_amount: 0, status: 'active', created_at: nowIso() };
      return { ...state, targets: { ...state.targets, [id]: target } };
    }
    case 'LOG_TARGET_MANUAL': {
      const target = state.targets[action.payload.target_id];
      if (!target || target.linked_system_id) return state; // linked targets can't be hand-logged
      const logId = makeId('tlog');
      const entry: TargetLogEntry = {
        id: logId,
        target_id: target.id,
        amount: action.payload.amount,
        source: 'manual',
        logged_at: nowIso(),
      };
      const updated = withAchievedStatus({
        ...target,
        current_amount: target.current_amount + action.payload.amount,
      });
      return {
        ...state,
        targets: { ...state.targets, [updated.id]: updated },
        targetLogEntries: { ...state.targetLogEntries, [logId]: entry },
      };
    }

    default:
      return state;
  }
}
