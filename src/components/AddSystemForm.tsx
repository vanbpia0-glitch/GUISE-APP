import { useState } from 'react';
import styles from './Modal.module.css';
import { useStore } from '../store/StoreContext';
import { activeContexts } from '../lib/selectors';
import type { GuiseSystem, MotivationType, SystemDomain } from '../types';

const DOMAIN_OPTIONS: { value: SystemDomain; label: string }[] = [
  { value: 'health', label: 'Health' },
  { value: 'work', label: 'Work' },
  { value: 'relationships', label: 'Relationships' },
  { value: 'finance', label: 'Finance' },
];

const ENERGIZER_OPTIONS: { value: MotivationType; label: string }[] = [
  { value: 'power', label: 'Power' },
  { value: 'play', label: 'Play' },
  { value: 'people', label: 'People' },
];

type Shape = 'recurring' | 'standing';

export default function AddSystemForm({ system, onDone }: { system?: GuiseSystem; onDone: () => void }) {
  const { state, dispatch } = useStore();
  const contexts = activeContexts(state);
  const [title, setTitle] = useState(system?.title || '');
  const [contextId, setContextId] = useState(system?.context_id || contexts[0]?.id || '');
  const [domain, setDomain] = useState<SystemDomain>(system?.domain || 'health');
  const [shape, setShape] = useState<Shape>(system?.rule_description ? 'standing' : 'recurring');
  const [recurrenceRule, setRecurrenceRule] = useState(system?.recurrence_rule || '');
  const [ruleDescription, setRuleDescription] = useState(system?.rule_description || '');
  const [energizerType, setEnergizerType] = useState<MotivationType>(system?.energizer_type || 'power');

  const canSubmit =
    title.trim().length > 0 && (shape === 'recurring' ? recurrenceRule.trim().length > 0 : ruleDescription.trim().length > 0);

  function submit() {
    if (!canSubmit) return;
    const payload = {
      context_id: contextId || undefined,
      title: title.trim(),
      domain,
      recurrence_rule: shape === 'recurring' ? recurrenceRule.trim() : undefined,
      rule_description: shape === 'standing' ? ruleDescription.trim() : undefined,
      energizer_type: energizerType,
    };
    if (system) {
      dispatch({ type: 'UPDATE_SYSTEM', payload: { id: system.id, patch: payload } });
    } else {
      dispatch({ type: 'ADD_SYSTEM', payload });
    }
    onDone();
  }

  return (
    <div>
      <div className={styles.field}>
        <label className={styles.label}>Title</label>
        <input className={styles.input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Gym" />
      </div>
      <div className={styles.field}>
        <label className={styles.label}>Context (optional — leave blank for a standing rule with no owner)</label>
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
        <label className={styles.label}>Domain</label>
        <select className={styles.select} value={domain} onChange={(e) => setDomain(e.target.value as SystemDomain)}>
          {DOMAIN_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      <div className={styles.field}>
        <label className={styles.label}>Shape</label>
        <div className={styles.radioRow}>
          <button
            type="button"
            className={`${styles.radioBtn} ${shape === 'recurring' ? styles.radioBtnActive : ''}`}
            onClick={() => setShape('recurring')}
          >
            Recurring
          </button>
          <button
            type="button"
            className={`${styles.radioBtn} ${shape === 'standing' ? styles.radioBtnActive : ''}`}
            onClick={() => setShape('standing')}
          >
            Standing rule
          </button>
        </div>
      </div>
      {shape === 'recurring' ? (
        <div className={styles.field}>
          <label className={styles.label}>Recurrence (days)</label>
          <input
            className={styles.input}
            value={recurrenceRule}
            onChange={(e) => setRecurrenceRule(e.target.value)}
            placeholder="e.g. Mon,Wed,Fri"
          />
        </div>
      ) : (
        <div className={styles.field}>
          <label className={styles.label}>The rule</label>
          <textarea
            className={styles.textarea}
            value={ruleDescription}
            onChange={(e) => setRuleDescription(e.target.value)}
            placeholder={'e.g. "No cooking on Tuesdays. That\'s the whole rule."'}
          />
        </div>
      )}
      <div className={styles.field}>
        <label className={styles.label}>Energizer</label>
        <div className={styles.radioRow}>
          {ENERGIZER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`${styles.radioBtn} ${energizerType === opt.value ? styles.radioBtnActive : ''}`}
              onClick={() => setEnergizerType(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      <button className={styles.submitBtn} disabled={!canSubmit} onClick={submit}>
        {system ? 'Save changes' : 'Add system'}
      </button>
    </div>
  );
}
