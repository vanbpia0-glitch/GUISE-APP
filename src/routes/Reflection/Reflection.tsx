import { useState } from 'react';
import styles from './Reflection.module.css';
import { useStore } from '../../store/StoreContext';
import {
  activeContexts,
  blocksInWeek,
  currentStreakDays,
  openBlockersForGoal,
  previousReflection,
  reflectionForWeek,
  weeklyMomentum,
} from '../../lib/selectors';
import { startOfWeek, startOfDay, addDays } from '../../lib/date';
import { colorsFor } from '../../lib/contextColors';
import {
  IconArrowRight,
  IconBulb,
  IconCheck,
  IconEdit,
  IconFlame,
  IconMoodConfuzed,
  IconMoodHappy,
  IconMoodNeutral,
  IconMoodSad,
  IconMoodSmile,
  IconPlus,
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

const DAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/** Three nested half-ring arcs (outer=blocks, middle=consistency, inner=energy). */
function MomentumRing({ blocks, consistency, energy, label }: { blocks: number; consistency: number; energy: number; label: number }) {
  const arcs = [
    { d: 'M5 185 A140 140 0 0 1 295 185', len: 440, pct: blocks, color: 'var(--grounds-base)' },
    { d: 'M40 185 A105 105 0 0 1 260 185', len: 330, pct: consistency, color: 'var(--night-muted)' },
    { d: 'M75 185 A70 70 0 0 1 225 185', len: 220, pct: energy, color: '#f6a360' },
  ];
  return (
    <svg width="330" height="210" viewBox="-15 -8 330 210" className={styles.ringSvg}>
      {arcs.map((a, i) => (
        <path key={`t${i}`} d={a.d} stroke="rgba(255,255,255,0.12)" strokeWidth="24" fill="none" strokeLinecap="round" />
      ))}
      {arcs.map((a, i) => (
        <path
          key={`f${i}`}
          d={a.d}
          stroke={a.color}
          strokeWidth="24"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={a.len}
          strokeDashoffset={a.len * (1 - Math.max(0, Math.min(100, a.pct)) / 100)}
        />
      ))}
      <text x="150" y="168" textAnchor="middle" fontSize="30" fontWeight="800" fill="var(--night-text)" fontFamily="Urbanist, sans-serif">
        {label}%
      </text>
      <text x="150" y="186" textAnchor="middle" fontSize="10.5" fill="var(--night-faint)" fontFamily="Urbanist, sans-serif">
        overall this week
      </text>
    </svg>
  );
}

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

  const activeIndex = Math.max(0, contexts.findIndex((c) => c.id === activeTab));
  const activeContext = contexts[activeIndex];
  const activeContextName = activeContext?.name;
  const priorNoteForActiveTab = prior?.per_context_notes.find((n) => n.context_id === activeTab)?.note;

  // Per-context "on track" = no open blockers on any of that context's goals.
  const contextGoals = Object.values(state.goals).filter((g) => g.context_id === activeTab && g.status === 'active');
  const contextBlockers = contextGoals.reduce((sum, g) => sum + openBlockersForGoal(state, g.id).length, 0);
  const onTrack = contextBlockers === 0;

  // Sunday-first week dates for the mini calendar header.
  const sundayStart = startOfDay(now);
  sundayStart.setDate(now.getDate() - now.getDay());
  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(sundayStart, i));
  const monthLabel = now.toLocaleDateString(undefined, { month: 'short' }).toUpperCase();

  function nextHat() {
    if (contexts.length === 0) return;
    setActiveTab(contexts[(activeIndex + 1) % contexts.length].id);
  }

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

  const activeColors = activeContext ? colorsFor(activeContext.color_key) : undefined;

  return (
    <div className={styles.page}>
      {/* LEFT — dark purple quick check-in */}
      <div className={styles.leftPanel}>
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
              <MomentumRing
                blocks={momentum.blocksPct}
                consistency={momentum.consistencyPct}
                energy={momentum.energyPct}
                label={momentum.momentum}
              />
            </div>
            <div className={styles.ringLegend}>
              <span className={styles.legendItem}>
                <span className={styles.legendDot} style={{ background: 'var(--grounds-base)' }} /> Blocks {momentum.blocksPct}%
              </span>
              <span className={styles.legendItem}>
                <span className={styles.legendDot} style={{ background: 'var(--night-muted)' }} /> Should/want {momentum.consistencyPct}%
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

          {prior && (prior.biggest_win || prior.next_focus || priorNoteForActiveTab) && (
            <div className={styles.glassCard}>
              <div className={styles.quoteRow}>
                <div className={styles.quoteIconBox}>
                  <IconQuote size={15} color="var(--night-text)" />
                </div>
                <div>
                  <div className={styles.quoteLabel}>What you said last week{activeContextName ? `, ${activeContextName}` : ''}</div>
                  <div className={styles.quoteText}>"{priorNoteForActiveTab || prior.biggest_win || prior.next_focus}"</div>
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
                <div className={styles.fieldLabelInline}>Give yourself credit — biggest win this week?</div>
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
            <div className={styles.quoteRow}>
              <div className={styles.quoteIconBox}>
                <IconBulb size={16} color="var(--night-text)" />
              </div>
              <div style={{ flex: 1 }}>
                <div className={styles.fieldLabelInline}>Good — what's the one thing?</div>
                <div className={styles.fieldHint}>Just one focus per domain for next week. Skip what doesn't stand out.</div>
                <textarea
                  className={styles.textarea}
                  value={nextFocus}
                  onChange={(e) => setNextFocus(e.target.value)}
                  placeholder="e.g. Get Joey's input on Grounds scope, book date night"
                />
              </div>
            </div>
          </div>

          <button className={styles.saveBtn} onClick={save}>
            <IconCheck size={15} /> {existing ? 'Update reflection' : 'Save reflection'}
          </button>
          {justSaved && <div className={styles.savedNote}>Saved.</div>}
        </div>
      </div>

      {/* RIGHT — beige calendar + per-hat detail card */}
      <div className={styles.rightPanel}>
        <div className={styles.calendar}>
          <div className={styles.calMonth}>{monthLabel}</div>
          <div className={styles.calHeaderRow}>
            {DAY_INITIALS.map((d, i) => (
              <span key={i} className={styles.calHeaderCell} style={i === 0 ? { color: 'var(--sc-base)' } : undefined}>
                {d}
              </span>
            ))}
          </div>
          <div className={styles.calDates}>
            {weekDates.map((d, i) => (
              <div key={i} className={styles.calDateCell}>
                {d.getDate()}
              </div>
            ))}
          </div>
        </div>

        <div className={styles.detailCard}>
          <div className={styles.detailTitleRow}>
            <span className={styles.detailIndex}>{activeIndex + 1}</span>
            <span className={styles.detailTitle}>Sunday — Weekly Reflection</span>
          </div>

          <div className={styles.detailTabs}>
            {contexts.map((c) => {
              const on = c.id === activeTab;
              return (
                <button
                  key={c.id}
                  className={styles.detailTab}
                  style={{ background: on ? 'var(--ink)' : 'var(--surface-tint)', color: on ? 'var(--cream)' : 'var(--muted)' }}
                  onClick={() => setActiveTab(c.id)}
                >
                  {c.name}
                </button>
              );
            })}
          </div>

          <hr className={styles.detailRule} />

          <div className={styles.detailMetaRow}>
            <span className={styles.detailEyebrow}>{activeContextName} · this week</span>
            <span
              className={styles.detailBadge}
              style={{
                color: onTrack ? 'var(--grounds-deep)' : 'var(--sc-mid)',
                background: onTrack ? 'var(--grounds-tint)' : 'var(--sc-tint)',
              }}
            >
              ● {onTrack ? 'on track' : `${contextBlockers} blocker${contextBlockers > 1 ? 's' : ''}`}
            </span>
          </div>
          <div className={styles.detailPrompt}>What moved, what didn't?</div>

          <textarea
            className={styles.detailTextarea}
            value={notes[activeTab] || ''}
            onChange={(e) => setNotes((prev) => ({ ...prev, [activeTab]: e.target.value }))}
            placeholder="Write it out…"
          />

          <div className={styles.detailSaveRow}>
            <button className={styles.detailSaveLink} onClick={save} style={{ color: activeColors?.base }}>
              <IconEdit size={14} /> Save
            </button>
          </div>

          {priorNoteForActiveTab && (
            <div className={styles.lastSunday}>
              <div className={styles.lastSundayBar} />
              <span className={styles.lastSundayLabel}>Last Sunday</span>
              <p className={styles.lastSundayText}>{priorNoteForActiveTab}</p>
            </div>
          )}

          <div className={styles.detailFooter}>
            <div>
              <div className={styles.detailDomainCount}>
                {activeIndex + 1} of {contexts.length} domains
              </div>
              <button className={styles.nextHatBtn} onClick={nextHat}>
                Next hat <IconArrowRight size={14} />
              </button>
            </div>
            <button className={styles.detailFab} onClick={save}>
              <IconPlus size={19} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
