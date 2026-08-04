import { useState } from 'react';
import styles from './Targets.module.css';
import { useStore } from '../../store/StoreContext';
import { targetDateRange, targetLogEntriesFor, targetPaceStatus, targetProgressPct } from '../../lib/selectors';
import { colorsFor } from '../../lib/contextColors';
import { weeksLeft } from '../../lib/date';
import { ContextIcon, IconArrowDown, IconArrowUp, IconFlag, IconHourglass, IconPlus, IconTrophy } from '../../lib/icons';
import Modal from '../../components/Modal';
import AddTargetForm from '../../components/AddTargetForm';
import type { PaceStatus } from '../../lib/selectors';
import type { ColorKey, Target } from '../../types';

const PACE_LABEL: Record<PaceStatus, string> = {
  ahead: 'AHEAD',
  on_pace: 'ON PACE',
  behind: 'A BIT BEHIND',
};

export default function Targets() {
  const { state, dispatch } = useStore();
  const now = new Date();
  const [contextFilter, setContextFilter] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showAchieved, setShowAchieved] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [customOpenId, setCustomOpenId] = useState<string | null>(null);
  const [customValue, setCustomValue] = useState('');

  const contexts = Object.values(state.contexts).filter((c) => c.active);
  const allTargets = Object.values(state.targets);
  const active = allTargets.filter((t) => t.status === 'active');
  const achieved = allTargets.filter((t) => t.status === 'achieved');
  const visible = contextFilter ? active.filter((t) => t.context_id === contextFilter) : active;

  const paceCounts = active.reduce(
    (acc, t) => {
      acc[targetPaceStatus(t, now)]++;
      return acc;
    },
    { ahead: 0, on_pace: 0, behind: 0 } as Record<PaceStatus, number>
  );

  function logAmount(target: Target, amount: number) {
    dispatch({ type: 'LOG_TARGET_MANUAL', payload: { target_id: target.id, amount } });
  }

  function submitCustom(target: Target) {
    const n = Number(customValue);
    if (!n || n <= 0) return;
    logAmount(target, Math.round(n));
    setCustomValue('');
    setCustomOpenId(null);
  }

  const C = 2 * Math.PI * 62;
  const trackedPct = active.length === 0 ? 0 : 100;

  return (
    <div className={styles.page}>
      <div className={styles.headerRow}>
        <div>
          <div className={styles.titleRow}>
            <div className={styles.title}>Targets</div>
            <button className={styles.addBtn} onClick={() => setShowAdd(true)}>
              <IconPlus size={13} /> Add target
            </button>
          </div>
          <div className={styles.subtitle}>
            Simple numbers ticking toward other numbers — no whys, no blockers, just count what counts.
          </div>
          <div className={styles.pillRow}>
            <button
              className={styles.pill}
              style={{ background: contextFilter === null ? 'var(--ink)' : 'var(--surface-tint)', color: contextFilter === null ? 'white' : 'var(--ink-soft)' }}
              onClick={() => setContextFilter(null)}
            >
              All
            </button>
            {contexts.map((c) => {
              const colors = colorsFor(c.color_key);
              const isActive = contextFilter === c.id;
              return (
                <button
                  key={c.id}
                  className={styles.pill}
                  style={{ background: isActive ? colors.base : colors.tint, color: isActive ? 'white' : colors.mid }}
                  onClick={() => setContextFilter(c.id)}
                >
                  {c.name}
                </button>
              );
            })}
          </div>
        </div>

        <div className={styles.overviewCard}>
          <svg width="76" height="54" viewBox="0 0 140 90">
            <path d="M8 78 A62 62 0 0 1 132 78" stroke="var(--surface-tint)" strokeWidth="14" fill="none" strokeLinecap="round" />
            <path
              d="M8 78 A62 62 0 0 1 132 78"
              stroke="var(--van-base)"
              strokeWidth="14"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${(trackedPct / 100) * C} ${C}`}
            />
            <text x="70" y="66" textAnchor="middle" fontSize="24" fontWeight="800" fill="var(--ink)">
              {active.length}
            </text>
          </svg>
          <div>
            <div className={styles.overviewLabel}>TARGETS TRACKED</div>
            <div className={styles.overviewLine}>
              <span className={styles.dot} style={{ background: 'var(--grounds-base)' }} />
              {paceCounts.on_pace} on pace
            </div>
            <div className={styles.overviewLine2}>
              <span className={styles.dot} style={{ background: 'var(--van-base)' }} />
              {paceCounts.behind} behind · {paceCounts.ahead} ahead
            </div>
          </div>
        </div>
      </div>

      <div className={styles.list}>
        {visible.map((t) => {
          const ctx = t.context_id ? state.contexts[t.context_id] : undefined;
          const colors = colorsFor((ctx?.color_key || 'purple') as ColorKey);
          const pct = targetProgressPct(t);
          const pace = targetPaceStatus(t, now);
          const { end } = targetDateRange(t);
          const wks = weeksLeft(end, now);
          const expanded = expandedId === t.id;
          const entries = expanded ? targetLogEntriesFor(state, t.id) : [];
          return (
            <div
              key={t.id}
              className={styles.card}
              style={{ background: colors.tint }}
              onClick={() => setExpandedId(expanded ? null : t.id)}
            >
              <div className={styles.cardTop}>
                <div className={styles.cardIconRow}>
                  <div className={styles.cardIconBox}>
                    {ctx ? <ContextIcon name={ctx.icon} size={22} color={colors.mid} /> : <IconFlag size={22} color={colors.mid} />}
                  </div>
                  <div>
                    <div className={styles.cardTitle} style={{ color: colors.deep }}>
                      {t.title}
                    </div>
                    <div className={styles.cardMeta} style={{ color: colors.mid }}>
                      {ctx ? `${ctx.name} · ` : ''}
                      {t.timeframe_label}
                      <span style={{ opacity: 0.5 }}>·</span>
                      <IconHourglass size={10} /> {wks} wks left
                      {t.linked_system_id && (
                        <>
                          <span style={{ opacity: 0.5 }}>·</span> auto-tracked
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className={styles.paceCol}>
                  <span className={styles.paceBadge} style={{ color: colors.deep }}>
                    {PACE_LABEL[pace]}
                  </span>
                  <span style={{ fontSize: 9.5, color: colors.mid, display: 'flex', alignItems: 'center', gap: 3 }}>
                    {pace === 'behind' ? <IconArrowDown size={9} /> : <IconArrowUp size={9} />}
                    {pace === 'ahead' ? 'ahead of pace' : pace === 'behind' ? 'slower than pace' : 'steady'}
                  </span>
                </div>
              </div>

              <div className={styles.progressWrap}>
                <div className={styles.progressTrack}>
                  <div className={styles.progressFill} style={{ width: `${Math.min(100, pct)}%`, background: colors.base }} />
                </div>
                {[25, 50, 75].map((m) => (
                  <div key={m} className={styles.tick} style={{ left: `${m}%` }} />
                ))}
              </div>

              <div className={styles.cardBottom}>
                <span className={styles.cardCount} style={{ color: colors.deep }}>
                  {t.current_amount}
                  <span style={{ fontSize: 12, color: colors.mid, fontWeight: 600 }}> of {t.goal_amount} {t.metric_unit}</span>
                </span>
                <div className={styles.actionsRow} onClick={(e) => e.stopPropagation()}>
                  {t.linked_system_id ? (
                    <span className={styles.autoTag} style={{ color: colors.mid }}>
                      Synced from system
                    </span>
                  ) : customOpenId === t.id ? (
                    <>
                      <input
                        type="number"
                        className={styles.customInput}
                        value={customValue}
                        autoFocus
                        onChange={(e) => setCustomValue(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && submitCustom(t)}
                      />
                      <button className={styles.pillBtn} style={{ color: colors.deep }} onClick={() => submitCustom(t)}>
                        Add
                      </button>
                    </>
                  ) : (
                    <>
                      <button className={styles.pillBtn} style={{ color: colors.deep }} onClick={() => logAmount(t, 1)}>
                        +1
                      </button>
                      <button className={styles.pillBtn} style={{ color: colors.deep }} onClick={() => logAmount(t, 3)}>
                        +3
                      </button>
                      <button className={styles.pillBtn} style={{ color: colors.deep }} onClick={() => setCustomOpenId(t.id)}>
                        Custom
                      </button>
                    </>
                  )}
                </div>
              </div>

              {expanded && (
                <div className={styles.detailPanel}>
                  <div className={styles.detailLabel} style={{ color: colors.mid }}>
                    Log history
                  </div>
                  {entries.length === 0 && (
                    <div style={{ fontSize: 12, color: colors.mid }}>No log entries yet.</div>
                  )}
                  {entries.map((e) => (
                    <div className={styles.logRow} key={e.id} style={{ color: colors.deep }}>
                      <span>
                        +{e.amount} {t.metric_unit} {e.source === 'system_completion' ? '· auto' : ''}
                      </span>
                      <span style={{ color: colors.mid, fontSize: 11.5 }}>
                        {new Date(e.logged_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {visible.length === 0 && active.length > 0 && (
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>No targets for this context filter.</div>
        )}
      </div>

      {active.length > 0 && (
        <button className={styles.achievedLink} onClick={() => setShowAchieved((v) => !v)}>
          <span className={styles.achievedIconBox}>
            <IconTrophy size={15} color="var(--van-mid)" />
          </span>
          {showAchieved ? 'Hide' : 'View'} achieved targets ({achieved.length})
        </button>
      )}
      {showAchieved &&
        achieved.map((t) => (
          <div key={t.id} style={{ maxWidth: 900, fontSize: 12.5, color: 'var(--muted)', marginBottom: 6 }}>
            {t.title} — {t.current_amount} of {t.goal_amount} {t.metric_unit}
          </div>
        ))}

      {active.length === 0 && (
        <div className={styles.emptyState}>
          <div className={styles.emptyIconBox}>
            <IconFlag size={24} color="var(--muted-2)" />
          </div>
          <div className={styles.emptyTitle}>No targets yet</div>
          <div className={styles.emptyDesc}>Add a countable number you want to hit — books, kilometers, sessions, anything.</div>
          <button className={styles.emptyBtn} onClick={() => setShowAdd(true)}>
            + Add your first target
          </button>
        </div>
      )}

      {showAdd && (
        <Modal title="Add a target" onClose={() => setShowAdd(false)}>
          <AddTargetForm onDone={() => setShowAdd(false)} />
        </Modal>
      )}
    </div>
  );
}
