import { useState } from 'react';
import styles from './Modal.module.css';
import { useStore } from '../store/StoreContext';
import { CONTEXT_ICONS, ContextIcon } from '../lib/icons';
import { COLOR_RAMPS } from '../lib/contextColors';
import type { ColorKey } from '../types';

const COLOR_KEYS: ColorKey[] = ['orange', 'green', 'yellow', 'purple'];
const ICON_NAMES = Object.keys(CONTEXT_ICONS);

export default function AddContextForm({ onDone }: { onDone: () => void }) {
  const { dispatch } = useStore();
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [icon, setIcon] = useState(ICON_NAMES[0]);
  const [colorKey, setColorKey] = useState<ColorKey>('orange');

  const canSubmit = name.trim().length > 0;

  function submit() {
    if (!canSubmit) return;
    dispatch({
      type: 'ADD_CONTEXT',
      payload: { name: name.trim(), role_description: role.trim() || undefined, color_key: colorKey, icon },
    });
    onDone();
  }

  return (
    <div>
      <div className={styles.field}>
        <label className={styles.label}>Name</label>
        <input className={styles.input} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Freelance Design" />
      </div>
      <div className={styles.field}>
        <label className={styles.label}>Role / description</label>
        <input className={styles.input} value={role} onChange={(e) => setRole(e.target.value)} placeholder="What is this hat, in a phrase?" />
      </div>
      <div className={styles.field}>
        <label className={styles.label}>Icon</label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {ICON_NAMES.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setIcon(n)}
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: icon === n ? 'var(--ink)' : 'var(--surface-tint)',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <ContextIcon name={n} size={16} color={icon === n ? 'white' : 'var(--muted)'} />
            </button>
          ))}
        </div>
      </div>
      <div className={styles.field}>
        <label className={styles.label}>Color</label>
        <div style={{ display: 'flex', gap: 10 }}>
          {COLOR_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setColorKey(key)}
              aria-label={key}
              style={{
                width: 30,
                height: 30,
                borderRadius: '50%',
                background: COLOR_RAMPS[key].base,
                border: 'none',
                cursor: 'pointer',
                boxShadow: colorKey === key ? '0 0 0 3px white, 0 0 0 5px var(--ink)' : 'none',
              }}
            />
          ))}
        </div>
      </div>
      <button className={styles.submitBtn} disabled={!canSubmit} onClick={submit}>
        Add context
      </button>
    </div>
  );
}
