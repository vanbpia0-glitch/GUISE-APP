import { useState } from 'react';
import styles from './Modal.module.css';
import { useStore } from '../store/StoreContext';
import { activeContexts, activeSystems } from '../lib/selectors';
import { quarterLabel } from '../lib/date';
import type { TargetTimeframe } from '../types';

export default function AddTargetForm({ onDone }: { onDone: () => void }) {
  const { state, dispatch } = useStore();
  const contexts = activeContexts(state);
  const systems = activeSystems(state);
  const [title, setTitle] = useState('');
  const [contextId, setContextId] = useState(contexts[0]?.id || '');
  const [metricUnit, setMetricUnit] = useState('');
  const [goalAmount, setGoalAmount] = useState('12');
  const [timeframe, setTimeframe] = useState<TargetTimeframe>('year');
  const [linkedSystemId, setLinkedSystemId] = useState('');

  const canSubmit = title.trim().length > 0 && metricUnit.trim().length > 0 && Number(goalAmount) > 0;

  function submit() {
    if (!canSubmit) return;
    const now = new Date();
    dispatch({
      type: 'ADD_TARGET',
      payload: {
        title: title.trim(),
        context_id: contextId || undefined,
        linked_system_id: linkedSystemId || undefined,
        metric_unit: metricUnit.trim(),
        goal_amount: Number(goalAmount),
        timeframe,
        timeframe_label: timeframe === 'year' ? `${now.getFullYear()}` : quarterLabel(now),
      },
    });
    onDone();
  }

  return (
    <div>
      <div className={styles.field}>
        <label className={styles.label}>Title</label>
        <input className={styles.input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Read 12 books" />
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <div className={styles.field} style={{ flex: 1 }}>
          <label className={styles.label}>Goal amount</label>
          <input
            type="number"
            min="1"
            className={styles.input}
            value={goalAmount}
            onChange={(e) => setGoalAmount(e.target.value)}
          />
        </div>
        <div className={styles.field} style={{ flex: 1 }}>
          <label className={styles.label}>Unit</label>
          <input className={styles.input} value={metricUnit} onChange={(e) => setMetricUnit(e.target.value)} placeholder="books" />
        </div>
      </div>
      <div className={styles.field}>
        <label className={styles.label}>Context</label>
        <select className={styles.select} value={contextId} onChange={(e) => setContextId(e.target.value)}>
          <option value="">No context</option>
          {contexts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div className={styles.field}>
        <label className={styles.label}>Timeframe</label>
        <div className={styles.radioRow}>
          <button
            type="button"
            className={`${styles.radioBtn} ${timeframe === 'year' ? styles.radioBtnActive : ''}`}
            onClick={() => setTimeframe('year')}
          >
            This year
          </button>
          <button
            type="button"
            className={`${styles.radioBtn} ${timeframe === 'quarter' ? styles.radioBtnActive : ''}`}
            onClick={() => setTimeframe('quarter')}
          >
            This quarter
          </button>
        </div>
      </div>
      <div className={styles.field}>
        <label className={styles.label}>Auto-track from a System (optional)</label>
        <select className={styles.select} value={linkedSystemId} onChange={(e) => setLinkedSystemId(e.target.value)}>
          <option value="">Log manually instead</option>
          {systems.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title}
            </option>
          ))}
        </select>
      </div>
      <button className={styles.submitBtn} disabled={!canSubmit} onClick={submit}>
        Add target
      </button>
    </div>
  );
}
