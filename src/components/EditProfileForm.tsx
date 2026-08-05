import { useRef, useState } from 'react';
import { useStore } from '../store/StoreContext';
import { IconCamera } from '../lib/icons';
import styles from './EditProfileForm.module.css';

export default function EditProfileForm({ onDone }: { onDone: () => void }) {
  const { state, dispatch } = useStore();
  const [name, setName] = useState(state.profile.name);
  const [role, setRole] = useState(state.profile.role);
  const [photo, setPhoto] = useState<string | null>(state.profile.photo);
  const fileRef = useRef<HTMLInputElement>(null);

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhoto(typeof reader.result === 'string' ? reader.result : null);
    reader.readAsDataURL(file);
  }

  function save() {
    dispatch({
      type: 'UPDATE_PROFILE',
      payload: { patch: { name: name.trim() || 'Van', role: role.trim(), photo } },
    });
    onDone();
  }

  const initial = (name.trim()[0] || 'V').toUpperCase();

  return (
    <div className={styles.form}>
      <div className={styles.avatarRow}>
        <button
          type="button"
          className={styles.avatarBtn}
          onClick={() => fileRef.current?.click()}
          aria-label="Upload photo"
        >
          {photo ? (
            <img src={photo} alt="" className={styles.avatarImg} />
          ) : (
            <span className={styles.avatarInitial}>{initial}</span>
          )}
          <span className={styles.avatarOverlay}>
            <IconCamera size={16} color="white" />
          </span>
        </button>
        <div className={styles.avatarActions}>
          <button type="button" className={styles.linkBtn} onClick={() => fileRef.current?.click()}>
            {photo ? 'Change photo' : 'Upload photo'}
          </button>
          {photo && (
            <button type="button" className={styles.linkBtnMuted} onClick={() => setPhoto(null)}>
              Remove
            </button>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={onPickFile}
          style={{ display: 'none' }}
        />
      </div>

      <label className={styles.label}>
        Name
        <input className={styles.input} value={name} onChange={(e) => setName(e.target.value)} placeholder="Van" />
      </label>
      <label className={styles.label}>
        Role
        <input
          className={styles.input}
          value={role}
          onChange={(e) => setRole(e.target.value)}
          placeholder="Head of Creatives, SC"
        />
      </label>

      <div className={styles.actions}>
        <button type="button" className={styles.cancel} onClick={onDone}>
          Cancel
        </button>
        <button type="button" className={styles.save} onClick={save}>
          Save
        </button>
      </div>
    </div>
  );
}
