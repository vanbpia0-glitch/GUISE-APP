import { useMemo, useState } from 'react';
import styles from './Modal.module.css';
import { useStore } from '../store/StoreContext';
import { activeContexts, activeGoals } from '../lib/selectors';
import type { BlockSourceType } from '../types';

const SOURCE_OPTIONS: { value: BlockSourceType; label: string }[] = [
  { value: 'goal', label: 'Goal' },
  { value: 'system', label: 'System' },
  { value: 'adhoc', label: 'Ad-hoc' },
];

/**
 * If `goalId` is provided (e.g. from Goal Detail), the block is locked to
 * that goal and its context — matches the original goal-scoped behavior.
 * Otherwise (e.g. Dashboard quick-add) the user picks what the block is
 * sourced from: a Goal, a System, or a plain ad-hoc entry.
 */
export default function AddBlockForm({
  goalId,
  onDone,
}: {
  goalId?: string;
  onDone: () => void;
}) {
  const { state, dispatch } = useStore();
  const presetGoal = goalId ? state.goals[goalId] : undefined;
  const goals = activeGoals(state);
  const systems = useMemo(() => Object.values(state.systems).filter((s) => s.active), [state]);
  const contexts = activeContexts(state);

  const [sourceType, setSourceType] = useState<BlockSourceType>(goals.length > 0 ? 'goal' : 'adhoc');
  const [selectedGoalId, setSelectedGoalId] = useState(goals[0]?.id || '');
  const [selectedSystemId, setSelectedSystemId] = useState(systems[0]?.id || '');
  const [selectedContextId, setSelectedContextId] = useState(contexts[0]?.id || '');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('10:00');

  const canSubmit = title.trim().length > 0;

  function submit() {
    if (!canSubmit) return;
    const scheduled_start = new Date(`${date}T${start}:00`).toISOString();
    const scheduled_end = new Date(`${date}T${end}:00`).toISOString();

    if (presetGoal) {
      dispatch({
        type: 'ADD_BLOCK',
        payload: {
          title: title.trim(),
          context_id: presetGoal.context_id,
          goal_id: presetGoal.id,
          source_type: 'goal',
          scheduled_start,
          scheduled_end,
        },
      });
      onDone();
      return;
    }

    if (sourceType === 'goal') {
      const goal = state.goals[selectedGoalId];
      if (!goal) return;
      dispatch({
        type: 'ADD_BLOCK',
        payload: {
          title: title.trim(),
          context_id: goal.context_id,
          goal_id: goal.id,
          source_type: 'goal',
          scheduled_start,
          scheduled_end,
        },
      });
    } else if (sourceType === 'system') {
      const system = state.systems[selectedSystemId];
      if (!system) return;
      dispatch({
        type: 'ADD_BLOCK',
        payload: {
          title: title.trim(),
          context_id: system.context_id || selectedContextId,
          system_id: system.id,
          source_type: 'system',
          scheduled_start,
          scheduled_end,
        },
      });
    } else {
      if (!selectedContextId) return;
      dispatch({
        type: 'ADD_BLOCK',
        payload: {
          title: title.trim(),
          context_id: selectedContextId,
          source_type: 'adhoc',
          scheduled_start,
          scheduled_end,
        },
      });
    }
    onDone();
  }

  return (
    <div>
      <div className={styles.field}>
        <label className={styles.label}>Title</label>
        <input
          className={styles.input}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What are you doing?"
        />
      </div>

      {!presetGoal && (
        <div className={styles.field}>
          <label className={styles.label}>Linked to</label>
          <div className={styles.radioRow}>
            {SOURCE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`${styles.radioBtn} ${sourceType === opt.value ? styles.radioBtnActive : ''}`}
                onClick={() => setSourceType(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {!presetGoal && sourceType === 'goal' && (
        <div className={styles.field}>
          <label className={styles.label}>Goal</label>
          <select className={styles.select} value={selectedGoalId} onChange={(e) => setSelectedGoalId(e.target.value)}>
            {goals.map((g) => (
              <option key={g.id} value={g.id}>
                {g.title}
              </option>
            ))}
          </select>
          {goals.length === 0 && <div className={styles.label} style={{ marginTop: 6 }}>No active goals yet.</div>}
        </div>
      )}

      {!presetGoal && sourceType === 'system' && (
        <div className={styles.field}>
          <label className={styles.label}>System</label>
          <select
            className={styles.select}
            value={selectedSystemId}
            onChange={(e) => setSelectedSystemId(e.target.value)}
          >
            {systems.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
          {systems.length === 0 && <div className={styles.label} style={{ marginTop: 6 }}>No active systems yet.</div>}
        </div>
      )}

      {!presetGoal && sourceType === 'adhoc' && (
        <div className={styles.field}>
          <label className={styles.label}>Context</label>
          <select
            className={styles.select}
            value={selectedContextId}
            onChange={(e) => setSelectedContextId(e.target.value)}
          >
            {contexts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className={styles.field}>
        <label className={styles.label}>Date</label>
        <input type="date" className={styles.input} value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <div className={styles.field} style={{ flex: 1 }}>
          <label className={styles.label}>Start</label>
          <input type="time" className={styles.input} value={start} onChange={(e) => setStart(e.target.value)} />
        </div>
        <div className={styles.field} style={{ flex: 1 }}>
          <label className={styles.label}>End</label>
          <input type="time" className={styles.input} value={end} onChange={(e) => setEnd(e.target.value)} />
        </div>
      </div>
      <button className={styles.submitBtn} disabled={!canSubmit} onClick={submit}>
        Add block
      </button>
    </div>
  );
}
