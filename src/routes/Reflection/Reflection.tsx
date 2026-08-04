import { useState } from 'react';
import styles from './Reflection.module.css';
import { useStore } from '../../store/StoreContext';
import { activeContexts, blocksInWeek, currentStreakDays, previousReflection, reflectionForWeek, weeklyMomentum } from '../../lib/selectors';
import { startOfWeek, addDays } from '../../lib/date';
import {
  IconCheck,
  IconFlame,
  IconMoodConfuzed,
  IconMoodHappy,
  IconMoodNeutral,
  IconMoodSad,
  IconMoodSmile,
  IconQuote,
  IconTrophy,
} from '../../lib/icons';
import type { Mood } from '../../types';

const MOODS: { key: Mood; label: string; Icon: typeof IconMoodSad }[] = [
  { key: 'drained', label: 'Drained', Icon: IconMoodSad },
  { key: 'rough', label: 'Rough', Icon: IconMoodConfuzed },
  { key: 'okay', label: 'Okay', Icon: IconMoodNeutral },
  { key: 'good', label: 'Good', Icon: IconMoodSmile },
  { key: 'great', label: 'Great', Icon: IconMoodHappy },
];

export default function Reflection() {
  const { state, dispatch } = useStore();
  const now = new Date();
  const weekStart = startOfWeek(now);
  const weekEnd = addDays(weekStart, 6);
  const existing = reflectionForWeek(state, weekStart);
  const prior = previousReflection(state, weekStart);
  const contexts = activeContexts(state);

  const [mood, setMood] = useState<Mood | undefined>(existing?.mood);
  const [biggestWin, setBiggestWin] = useState(existing?.biggest_win || '');
  const [nextFocus, setNextFocus] = useState(existing?.next_focus || '');
  const [notes, setNotes] = useState<Record<string, string>>(
    Object.fromEntries((existing?.per_context_notes || []).map((n) => [n.context_id, n.note]))
  );
  const [activeTab, setActiveTab] = useState(contexts[0]?.id || '');
  const [justSaved, setJustSaved] = useState(false);

  const momentum = weeklyMomentum(state, weekStart, now);
  const weekBlocks = blocksInWeek(state, weekStart);
  const done = weekBlocks.filter((b) => !!b.completed_at).length;
  const streak = currentStreakDays(state, now);
  const openBlockersCount = Object.values(state.blockers).filter((b) => b.status === 'open').length;

  const priorNoteForActiveTab = prior?.per_context_notes.find((n) => n.context_id === activeTab)?.note;
  const activeContextName = state.contexts[activeTab]?.name;

  function save() {
    const per_context_notes = Object.entries(notes)
      .filter(([, note]) => note.trim().length > 0)
      .map(([context_id, note]) => ({ context_id, note: note.trim() }));
    if (existing) {
      dispatch({
        type: 'UPDATE_REFLECTION',
        payload: { id: existing.id, patch: { mood, biggest_win: biggestWin.trim(), next_focus: nextFocus.trim(), per_context_notes } },
      });
    } else {
      dispatch({
        type: 'ADD_REFLECTION',
        payload: {
          week_of: weekStart.toISOString(),
          mood,
          biggest_win: biggestWin.trim(),
          next_focus: nextFocus.trim(),
          per_context_notes,
        },
      });
    }
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2500);
  }

  const C = 2 * Math.PI * 140;

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <div className={styles.headerRow}>
          <div>
            <div className={styles.eyebrow}>
              Week of {weekStart.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })} —{' '}
              {weekEnd.toLocaleDateString(undefined, { day: 'numeric' })}
            </div>
            <div className={styles.title}>Sunday reflection</div>
          </div>
          <span className={styles.streak}>
            <IconFlame size={14} /> {streak} wk streak
          </span>
        </div>

        <div className={styles.ringCard}>
          <div className={styles.ringHeaderRow}>
            <span className={styles.ringHeaderLabel}>This week</span>
            <span className={styles.ringHeaderLabel}>10 min, then you're free</span>
          </div>
          <div className={styles.ringWrap}>
            <svg width="240" height="160" viewBox="0 0 300 200">
              <path d="M5 185 A140 140 0 0 1 295 185" stroke="rgba(255,255,255,0.12)" strokeWidth="24" fill="none" strokeLinecap="round" />
              <path
                d="M5 185 A140 140 0 0 1 295 185"
                stroke="var(--grounds-base)"
                strokeWidth="24"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${(momentum.blocksPct / 100) * C} ${C}`}
              />
              <text x="150" y="168" textAnchor="middle" fontSize="30" fontWeight="800" fill="var(--night-text)">
                {momentum.momentum}%
              </text>
              <text x="150" y="186" textAnchor="middle" fontSize="10.5" fill="var(--night-faint)">
                overall this week
              </text>
            </svg>
          </div>
          <div className={styles.ringLegend}>
            <span className={styles.legendItem}>
              <span className={styles.legendDot} style={{ background: 'var(--grounds-base)' }} /> Blocks {momentum.blocksPct}%
            </span>
            <span className={styles.legendItem}>
              <span className={styles.legendDot} style={{ background: 'var(--night-muted)' }} /> Consistency {momentum.consistencyPct}%
            </span>
            <span className={styles.legendItem}>
              <span className={styles.legendDot} style={{ background: '#f6a360' }} /> Energy {momentum.energyPct}%
            </span>
          </div>
          <div className={styles.statsRow}>
            <div>
              <div className={styles.statValue}>
                {done}
                <span style={{ fontSize: 11, color: 'var(--night-muted)' }}>/{weekBlocks.length}</span>
              </div>
              <div className={styles.statLabel}>blocks</div>
            </div>
            <div>
              <div className={styles.statValue}>{streak} wk</div>
              <div className={styles.statLabel}>streak</div>
            </div>
            <div>
              <div className={styles.statValue} style={{ color: '#f6a360' }}>
                {openBlockersCount}
              </div>
              <div className={styles.statLabel}>blockers</div>
            </div>
          </div>
        </div>

        {prior && (
          <div className={styles.glassCard}>
            <div className={styles.quoteRow}>
              <div className={styles.quoteIconBox}>
                <IconQuote size={15} color="var(--night-text)" />
              </div>
              <div>
                <div className={styles.quoteLabel}>What you said last week</div>
                <div className={styles.quoteText}>"{prior.biggest_win || prior.next_focus || 'No note left.'}"</div>
              </div>
            </div>
          </div>
        )}

        <div className={styles.whiteCard}>
          <div className={styles.whiteCardTitle}>How's your energy this week?</div>
          <div className={styles.moodRow}>
            {MOODS.map(({ key, label, Icon }) => {
              const selected = mood === key;
              return (
                <button key={key} className={styles.moodItem} onClick={() => setMood(key)} type="button">
                  <div className={`${styles.moodIconBox} ${selected ? styles.moodIconBoxSelected : ''}`}>
                    <Icon size={20} color={selected ? 'var(--sc-base)' : 'var(--muted)'} />
                  </div>
                  <div className={`${styles.moodLabel} ${selected ? styles.moodLabelSelected : ''}`}>{label}</div>
                </button>
              );
            })}
          </div>
        </div>

        <div className={styles.glassCard}>
          <div className={styles.quoteRow}>
            <div className={styles.quoteIconBox}>
              <IconTrophy size={16} color="var(--night-text)" />
            </div>
            <div style={{ flex: 1 }}>
              <div className={styles.fieldLabel}>Give yourself credit — biggest win this week?</div>
              <input
                className={styles.input}
                value={biggestWin}
                onChange={(e) => setBiggestWin(e.target.value)}
                placeholder="e.g. Finally shipped the SC deck"
              />
            </div>
          </div>
        </div>

        <div className={styles.glassCard}>
          <div className={styles.fieldLabel}>What moved, what didn't — by hat</div>
          <div className={styles.contextTabs}>
            {contexts.map((c) => (
              <button
                key={c.id}
                className={styles.contextTab}
                style={{
                  background: activeTab === c.id ? 'var(--sc-base)' : 'rgba(255,255,255,0.14)',
                  color: activeTab === c.id ? 'white' : 'var(--night-text)',
                }}
                onClick={() => setActiveTab(c.id)}
              >
                {c.name}
              </button>
            ))}
          </div>
          {priorNoteForActiveTab && (
            <div className={styles.fieldHint}>Last time on {activeContextName}: "{priorNoteForActiveTab}"</div>
          )}
          <textarea
            className={styles.textarea}
            value={notes[activeTab] || ''}
            onChange={(e) => setNotes((prev) => ({ ...prev, [activeTab]: e.target.value }))}
            placeholder={`What moved, what didn't, for ${activeContextName || 'this hat'}?`}
          />
        </div>

        <div className={styles.glassCard}>
          <div className={styles.fieldLabel}>Good — what's the one thing?</div>
          <div className={styles.fieldHint}>Just one focus per domain for next week. Skip what doesn't stand out.</div>
          <textarea
            className={styles.textarea}
            value={nextFocus}
            onChange={(e) => setNextFocus(e.target.value)}
            placeholder="e.g. Get Joey's input on Grounds scope, book date night"
          />
        </div>

        <button className={styles.saveBtn} onClick={save}>
          <IconCheck size={15} /> {existing ? 'Update reflection' : 'Save reflection'}
        </button>
        {justSaved && <div className={styles.savedNote}>Saved.</div>}
      </div>
    </div>
  );
}
