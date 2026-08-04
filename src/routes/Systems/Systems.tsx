import { useState } from 'react';
import styles from './Systems.module.css';
import { useStore } from '../../store/StoreContext';
import {
  activeSystems,
  energizerMix,
  recurringSystems,
  standingRuleSystems,
  systemWeekOccurrence,
  weeklySystemsDueDone,
  weeklySystemsRhythm,
} from '../../lib/selectors';
import { colorsFor } from '../../lib/contextColors';
import { ContextIcon, IconArchive, IconEdit, IconFlame, IconPlus, IconRefresh, IconTargetArrow } from '../../lib/icons';
import { startOfWeek, weekdayLabel, addDays } from '../../lib/date';
import Modal from '../../components/Modal';
import AddSystemForm from '../../components/AddSystemForm';
import type { GuiseSystem, SystemDomain } from '../../types';

const DOMAIN_COLORS: Record<SystemDomain, string> = {
  health: 'var(--grounds-base)',
  work: 'var(--sc-base)',
  relationships: 'var(--me-base)',
  finance: 'var(--van-base)',
};
const DOMAIN_LABELS: Record<SystemDomain, string> = {
  health: 'Health',
  work: 'Work',
  relationships: 'Relationships',
  finance: 'Finance',
};

export default function Systems() {
  const { state, dispatch } = useStore();
  const now = new Date();
  const weekStart = startOfWeek(now);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const [showAdd, setShowAdd] = useState(false);
  const [editSystem, setEditSystem] = useState<GuiseSystem | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const standing = standingRuleSystems(state);
  const recurring = recurringSystems(state);
  const active = activeSystems(state);
  const archived = Object.values(state.systems).filter((s) => !s.active);
  const rhythm = weeklySystemsRhythm(state, weekStart);
  const { due, done } = weeklySystemsDueDone(state, weekStart);
  const mix = energizerMix(active);

  const domainCounts = active.reduce<Record<string, number>>((acc, s) => {
    acc[s.domain] = (acc[s.domain] || 0) + 1;
    return acc;
  }, {});
  const longestCurrentStreakSystem = recurring
    .map((s) => {
      const occ = systemWeekOccurrence(state, s, weekStart);
      return { s, doneDays: occ.filter((o) => o === 'done').length };
    })
    .sort((a, b) => b.doneDays - a.doneDays)[0];

  const C = 2 * Math.PI * 106;

  return (
    <div className={styles.page}>
      <div className={styles.leftRail}>
        <div className={styles.leftHeader}>Standing rules</div>
        {standing.map((s) => {
          const ctx = s.context_id ? state.contexts[s.context_id] : undefined;
          const colors = ctx ? colorsFor(ctx.color_key) : undefined;
          return (
            <div className={styles.ruleCard} key={s.id} style={{ background: colors?.tint || 'var(--surface-tint)' }}>
              <div className={styles.ruleTop}>
                <div className={styles.ruleIconBox}>
                  {ctx ? <ContextIcon name={ctx.icon} size={16} color={colors?.mid} /> : <IconRefresh size={16} color="var(--muted-2)" />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className={styles.ruleTitle} style={{ color: colors?.deep || 'var(--ink)' }}>
                    {s.title}
                  </div>
                  <div className={styles.ruleMeta} style={{ color: colors?.mid || 'var(--muted-2)' }}>
                    {DOMAIN_LABELS[s.domain]} · always on
                  </div>
                </div>
              </div>
              <div className={styles.ruleDesc} style={{ color: colors?.deep || 'var(--ink-soft)' }}>
                {s.rule_description}
              </div>
            </div>
          );
        })}
        {standing.length === 0 && <div className={styles.emptyMiddle}>No standing rules yet.</div>}

        <button className={styles.addNewBtn} onClick={() => setShowAdd(true)} type="button">
          <div className={styles.addNewIcon}>
            <IconPlus size={13} color="white" />
          </div>
          <span className={styles.addNewLabel}>Add new system</span>
        </button>
      </div>

      <div className={styles.middle}>
        <div className={styles.middleHeader}>
          <span className={styles.middleTitle}>Your systems</span>
        </div>

        {recurring.map((s) => {
          const ctx = s.context_id ? state.contexts[s.context_id] : undefined;
          const colors = ctx ? colorsFor(ctx.color_key) : undefined;
          const occ = systemWeekOccurrence(state, s, weekStart);
          const linkedGoal = s.linked_goal_id ? state.goals[s.linked_goal_id] : undefined;
          return (
            <div className={styles.sysCard} key={s.id}>
              <div className={styles.sysTop}>
                <div className={styles.sysIconBox}>
                  {ctx ? <ContextIcon name={ctx.icon} size={18} color={colors?.mid} /> : <IconRefresh size={18} color="var(--muted-2)" />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className={styles.sysTitle}>{s.title}</div>
                  <div className={styles.sysMeta}>{s.recurrence_rule}</div>
                </div>
                <div className={styles.sysActions}>
                  <button className={styles.iconBtn} onClick={() => setEditSystem(s)} aria-label="Edit system">
                    <IconEdit size={13} color="var(--ink-soft)" />
                  </button>
                  <button
                    className={styles.iconBtn}
                    onClick={() => dispatch({ type: 'ARCHIVE_SYSTEM', payload: { id: s.id } })}
                    aria-label="Archive system"
                  >
                    <IconArchive size={13} color="var(--ink-soft)" />
                  </button>
                </div>
              </div>
              <div className={styles.tagRow}>
                <span className={styles.tag}>{s.energizer_type}</span>
                {linkedGoal && (
                  <span className={styles.tag}>
                    <IconTargetArrow size={9} /> Linked: {linkedGoal.title}
                  </span>
                )}
              </div>
              <div className={styles.dotsRow}>
                {weekDays.map((day, i) => (
                  <div className={styles.dotCol} key={day.toISOString()}>
                    <div className={styles.dotDay}>{weekdayLabel(day)[0]}</div>
                    <div
                      className={styles.dot}
                      style={
                        occ[i] === 'done'
                          ? { background: colors?.base || 'var(--grounds-base)' }
                          : occ[i] === 'scheduled'
                            ? { border: `1.5px dashed ${colors?.base || 'var(--grounds-base)'}` }
                            : { background: 'var(--surface-tint)' }
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        {recurring.length === 0 && <div className={styles.emptyMiddle}>No recurring systems yet — add one from the left.</div>}
      </div>

      <div className={styles.rightRail}>
        <div>
          <div className={styles.sectionLabel}>This week</div>
          <div className={styles.ringWrap}>
            <svg width="220" height="140" viewBox="0 0 240 150">
              <path d="M14 130 A106 106 0 0 1 226 130" stroke="var(--surface-tint)" strokeWidth="30" fill="none" strokeLinecap="round" />
              <path
                d="M14 130 A106 106 0 0 1 226 130"
                stroke="var(--sc-base)"
                strokeWidth="30"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${C} ${C}`}
              />
              <text x="120" y="105" textAnchor="middle" fontSize="36" fontWeight="800" fill="var(--ink)">
                {active.length}
              </text>
              <text x="120" y="128" textAnchor="middle" fontSize="12" fill="var(--muted-2)">
                active systems
              </text>
            </svg>
          </div>
          <div className={styles.domainLegend}>
            {(Object.keys(DOMAIN_LABELS) as SystemDomain[])
              .filter((d) => domainCounts[d])
              .map((d) => (
                <span className={styles.legendItem} key={d} style={{ color: DOMAIN_COLORS[d] }}>
                  <span className={styles.legendDot} style={{ background: DOMAIN_COLORS[d] }} />
                  {DOMAIN_LABELS[d]} {domainCounts[d]}
                </span>
              ))}
          </div>
          {longestCurrentStreakSystem && longestCurrentStreakSystem.doneDays > 0 && (
            <div className={styles.streakLine}>
              <IconFlame size={14} color="var(--sc-base)" />
              {longestCurrentStreakSystem.doneDays}/7 days this week on {longestCurrentStreakSystem.s.title}
            </div>
          )}
        </div>

        <div className={styles.rhythmCard}>
          <div className={styles.rhythmTitle}>This week's rhythm</div>
          <div className={styles.rhythmBars}>
            {rhythm.map((frac, i) => (
              <div key={i} className={styles.rhythmBar} style={{ height: `${Math.max(6, frac * 100)}%`, opacity: frac > 0 ? 1 : 0.3 }} />
            ))}
          </div>
          <div className={styles.rhythmDayLabels}>
            {weekDays.map((d) => (
              <span key={d.toISOString()}>{weekdayLabel(d)[0]}</span>
            ))}
          </div>
          <div className={styles.rhythmNote}>
            {done} of {due} system day{due === 1 ? '' : 's'} happened this week. That's the data — no grade attached.
          </div>
        </div>

        <div>
          <div className={styles.sectionLabel}>Energizer mix</div>
          <div className={styles.energizerBar}>
            <div style={{ width: `${mix.power}%`, background: 'var(--ink)' }} />
            <div style={{ width: `${mix.play}%`, background: 'var(--sc-base)' }} />
            <div style={{ width: `${mix.people}%`, background: 'var(--me-base)' }} />
          </div>
          <div className={styles.energizerLegend}>
            <span>Power {mix.power}%</span>
            <span>Play {mix.play}%</span>
            <span>People {mix.people}%</span>
          </div>
          {mix.play === 0 && active.length > 0 && (
            <div className={styles.energizerNote}>Mostly Power systems — worth adding one for Play?</div>
          )}
        </div>

        <button className={styles.viewArchived} onClick={() => setShowArchived((v) => !v)}>
          <IconArchive size={13} /> {showArchived ? 'Hide' : 'View'} archived systems ({archived.length})
        </button>
        {showArchived && (
          <div className={styles.archivedList}>
            {archived.length === 0 && <div className={styles.emptyMiddle}>Nothing archived.</div>}
            {archived.map((s) => (
              <div className={styles.archivedRow} key={s.id}>
                <span>{s.title}</span>
                <button
                  className={styles.restoreLink}
                  onClick={() => dispatch({ type: 'UPDATE_SYSTEM', payload: { id: s.id, patch: { active: true, archived_at: undefined } } })}
                >
                  Restore
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {showAdd && (
        <Modal title="Add a system" onClose={() => setShowAdd(false)}>
          <AddSystemForm onDone={() => setShowAdd(false)} />
        </Modal>
      )}
      {editSystem && (
        <Modal title="Edit system" onClose={() => setEditSystem(null)}>
          <AddSystemForm system={editSystem} onDone={() => setEditSystem(null)} />
        </Modal>
      )}
    </div>
  );
}
