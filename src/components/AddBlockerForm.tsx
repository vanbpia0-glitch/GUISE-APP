import { useState } from 'react';
import styles from './Modal.module.css';
import { useStore } from '../store/StoreContext';
import { activeGoals } from '../lib/selectors';
import type { BlockerCategory } from '../types';

const CATEGORY_OPTIONS: { value: BlockerCategory; label: string }[] = [
  { value: 'not_in_control', label: 'Not in control' },
  { value: 'somewhat_in_control', label: 'Somewhat' },
  { value: 'in_control', label: 'In control' },
];

export default function AddBlockerForm({
  goalId,
  onDone,
}: {
  goalId?: string;
  onDone: () => void;
}) {
  const { state, dispatch } = useStore();
  const goals = activeGoals(state);
  const [selectedGoalId, setSelectedGoalId] = useState(goalId || goals[0]?.id || '');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<BlockerCategory>('somewhat_in_control');

  const canSubmit = description.trim().length > 0 && !!selectedGoalId;

  function submit() {
    if (!canSubmit) return;
    dispatch({
      type: 'ADD_BLOCKER',
      payload: { goal_id: selectedGoalId, description: description.trim(), category },
    });
    onDone();
  }

  return (
    <div>
      {!goalId && (
        <div className={styles.field}>
          <label className={styles.label}>Which goal?</label>
          <select className={styles.select} value={selectedGoalId} onChange={(e) => setSelectedGoalId(e.target.value)}>
            {goals.map((g) => (
              <option key={g.id} value={g.id}>
                {g.title}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className={styles.field}>
        <label className={styles.label}>What's in the way?</label>
        <textarea
          className={styles.textarea}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe it plainly — you're investigating, not confessing."
        />
      </div>
      <div className={styles.field}>
        <label className={styles.label}>How much control do you have?</label>
        <div className={styles.radioRow}>
          {CATEGORY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`${styles.radioBtn} ${category === opt.value ? styles.radioBtnActive : ''}`}
              onClick={() => setCategory(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      <button className={styles.submitBtn} disabled={!canSubmit} onClick={submit}>
        Flag blocker
      </button>
    </div>
  );
}
