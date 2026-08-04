import { useState } from 'react';
import styles from './Modal.module.css';
import { useStore } from '../store/StoreContext';
import { activeContexts } from '../lib/selectors';
import { quarterLabel } from '../lib/date';
import type { WhyType } from '../types';

export default function AddGoalForm({
  defaultContextId,
  onDone,
}: {
  defaultContextId?: string;
  onDone: () => void;
}) {
  const { state, dispatch } = useStore();
  const contexts = activeContexts(state);
  const [title, setTitle] = useState('');
  const [why, setWhy] = useState('');
  const [whyType, setWhyType] = useState<WhyType>('pull');
  const [contextId, setContextId] = useState(defaultContextId || contexts[0]?.id || '');

  const canSubmit = title.trim().length > 0 && why.trim().length > 0 && !!contextId;

  function submit() {
    if (!canSubmit) return;
    dispatch({
      type: 'ADD_GOAL',
      payload: { context_id: contextId, title: title.trim(), why: why.trim(), why_type: whyType, quarter: quarterLabel(new Date()) },
    });
    onDone();
  }

  return (
    <div>
      <div className={styles.field}>
        <label className={styles.label}>Title</label>
        <input className={styles.input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. SC digital LOB traction" />
      </div>
      <div className={styles.field}>
        <label className={styles.label}>Context</label>
        <select className={styles.select} value={contextId} onChange={(e) => setContextId(e.target.value)}>
          {contexts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div className={styles.field}>
        <label className={styles.label}>Why does this matter?</label>
        <textarea className={styles.textarea} value={why} onChange={(e) => setWhy(e.target.value)} placeholder="Be honest — is this pull or push?" />
      </div>
      <div className={styles.field}>
        <label className={styles.label}>Pull or push?</label>
        <div className={styles.radioRow}>
          <button
            className={`${styles.radioBtn} ${whyType === 'pull' ? styles.radioBtnActive : ''}`}
            onClick={() => setWhyType('pull')}
            type="button"
          >
            Pull — I want this
          </button>
          <button
            className={`${styles.radioBtn} ${whyType === 'push' ? styles.radioBtnActive : ''}`}
            onClick={() => setWhyType('push')}
            type="button"
          >
            Push — I "should"
          </button>
        </div>
      </div>
      <button className={styles.submitBtn} disabled={!canSubmit} onClick={submit}>
        Add goal
      </button>
    </div>
  );
}
