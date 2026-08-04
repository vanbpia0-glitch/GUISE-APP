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
import {
  ContextIcon,
  IconArchive,
  IconChevronLeft,
  IconChevronRight,
  IconEdit,
  IconFlame,
  IconPlus,
  IconRefresh,
  IconTargetArrow,
} from '../../lib/icons';
import { startOfWeek, weekdayLabel, addDays, isSameDay } from '../../lib/date';
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
const DOMAIN_ORDER: SystemDomain[] = ['health', 'relationships', 'work', 'finance'];

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

  // Precompute this week's occurrence per recurring system (reused by cards + calendar).
  const occBySystem = recurring.map((s) => ({ s, occ: systemWeekOccurrence(state, s, weekStart) }));

  const domainCounts = active.reduce<Record<string, number>>((acc, s) => {
    acc[s.domain] = (acc[s.domain] || 0) + 1;
    return acc;
  }, {});
  const longestCurrentStreakSystem = occBySystem
    .map(({ s, occ }) => ({ s, doneDays: occ.filter((o) => o === 'done').length }))
    .sort((a, b) => b.doneDays - a.doneDays)[0];

  const C = 2 * Math.PI * 106;

  // Donut ("By domain") segments.
  const donutR = 30;
  const donutC = 2 * Math.PI * donutR;
  const totalActive = active.length || 1;
  let donutCursor = 0;
  const donutSegs = DOMAIN_ORDER.filter((d) => domainCounts[d]).map((d) => {
    const len = (domainCounts[d] / totalActive) * donutC;
    const seg = { d, len, offset: -donutCursor };
    donutCursor += len;
    return seg;
  });

  // Mini-calendar: per-weekday domain dots from completed systems this week.
  const calDots = weekDays.map((_, i) =>
    occBySystem.filter(({ occ }) => occ[i] === 'done').map(({ s }) => DOMAIN_COLORS[s.domain]).slice(0, 3)
  );
  const monthLabel = now.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  return (
    <div className={styles.page}>
      <div className={styles.leftRail}>
        <div className={styles.leftHeader}>
          <span>Standing rules</span>
          <span className={styles.viewAll}>View all</span>
        </div>
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

        <div className={styles.calCard}>
          <div className={styles.calHeader}>
            <span className={styles.calMonth}>{monthLabel}</span>
            <div className={styles.calNav}>
              <span className={styles.calNavBtn}>
                <IconChevronLeft size={11} color="var(--muted-2)" />
              </span>
              <span className={styles.calNavBtn}>
                <IconChevronRight size={11} color="var(--muted-2)" />
              </span>
            </div>
          </div>
          <div className={styles.calDow}>
            {weekDays.map((d, i) => (
              <span key={i} className={styles.calDowCell} style={i === 0 ? { color: 'var(--sc-base)' } : undefined}>
                {weekdayLabel(d)[0]}
              </span>
            ))}
          </div>
          <div className={styles.calWeek}>
            {weekDays.map((d, i) => {
              const today = isSameDay(d, now);
              return (
                <div key={i} className={styles.calDayCell}>
                  {today ? (
                    <div className={styles.calToday}>{d.getDate()}</div>
                  ) : (
                    <div className={styles.calDayNum}>{d.getDate()}</div>
                  )}
                  {!today && calDots[i].length > 0 && (
                    <div className={styles.calDotRow}>
                      {calDots[i].map((c, j) => (
                        <span key={j} className={styles.calDot} style={{ background: c }} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className={styles.calLegend}>
            {DOMAIN_ORDER.filter((d) => domainCounts[d]).map((d) => (
              <span key={d} className={styles.calLegendItem} style={{ color: DOMAIN_COLORS[d] }}>
                <span className={styles.legendDot} style={{ background: DOMAIN_COLORS[d] }} />
                {DOMAIN_LABELS[d]}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.middle}>
        <svg className={styles.middleBg} viewBox="0 0 480 1700" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <rect width="480" height="1700" fill="var(--van-tint)" />
          <g fill="none" stroke="var(--sc-base)" strokeWidth="95" strokeLinecap="round" strokeLinejoin="round" opacity="0.28">
            <path d="M-40 60 C 40 10, 60 120, 140 90 S 260 -10, 320 60 S 420 160, 500 100" />
            <path d="M-40 280 C 60 320, 100 220, 180 260 S 300 360, 380 290 S 460 200, 520 280" />
            <path d="M-40 500 C 40 460, 90 560, 170 520 S 290 440, 360 510 S 450 600, 520 520" />
            <path d="M-40 720 C 60 760, 110 670, 190 710 S 310 790, 380 720 S 460 650, 520 720" />
            <path d="M-40 940 C 40 900, 90 990, 170 950 S 300 880, 370 950 S 450 1030, 520 960" />
            <path d="M-40 1160 C 60 1200, 110 1110, 190 1150 S 310 1230, 380 1160 S 460 1090, 520 1160" />
            <path d="M-40 1380 C 40 1340, 90 1430, 170 1390 S 300 1320, 370 1390 S 450 1470, 520 1400" />
            <path d="M-40 1600 C 60 1640, 110 1550, 190 1590 S 310 1670, 380 1600 S 460 1530, 520 1600" />
          </g>
          <g fill="none" stroke="var(--sc-base)" strokeWidth="70" strokeLinecap="round" strokeLinejoin="round" opacity="0.22">
            <path d="M100 -40 C 140 40, 60 80, 100 160 S 180 260, 130 340 S 60 440, 110 520 S 190 600, 140 680 S 70 780, 120 860 S 200 940, 150 1020 S 80 1120, 130 1200 S 210 1300, 160 1400 S 90 1480, 140 1560 S 200 1650, 150 1700" />
            <path d="M340 -40 C 300 60, 380 100, 340 180 S 260 280, 310 360 S 390 460, 340 540 S 270 640, 320 720 S 400 820, 350 900 S 280 1000, 330 1080 S 410 1180, 360 1260 S 290 1360, 340 1440 S 400 1490, 340 1560 S 280 1650, 340 1700" />
          </g>
        </svg>

        <div className={styles.middleInner}>
          <div className={styles.middleHeader}>
            <span className={styles.middleTitle}>Your systems</span>
            <button className={styles.middleAdd} onClick={() => setShowAdd(true)} aria-label="Add system">
              <IconPlus size={16} color="var(--sc-deep)" />
            </button>
          </div>

          {occBySystem.map(({ s, occ }) => {
            const ctx = s.context_id ? state.contexts[s.context_id] : undefined;
            const colors = ctx ? colorsFor(ctx.color_key) : undefined;
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
                              : { background: 'rgba(41,39,35,0.12)' }
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
      </div>

      <div className={styles.rightRail}>
        <div>
          <div className={styles.sectionLabel}>This week</div>
          <div className={styles.ringWrap}>
            <svg width="240" height="150" viewBox="0 0 240 150" className={styles.ringSvg}>
              <defs>
                <linearGradient id="sysRingGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="var(--grounds-base)" />
                  <stop offset="35%" stopColor="var(--me-base)" />
                  <stop offset="65%" stopColor="var(--sc-base)" />
                  <stop offset="100%" stopColor="var(--van-base)" />
                </linearGradient>
              </defs>
              <path d="M20 128 A100 100 0 0 1 220 128" stroke="var(--surface-tint)" strokeWidth="28" fill="none" strokeLinecap="round" />
              <path
                d="M20 128 A100 100 0 0 1 220 128"
                stroke="url(#sysRingGrad)"
                strokeWidth="28"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${Math.PI * 100} ${Math.PI * 100}`}
              />
              <text x="120" y="108" textAnchor="middle" fontSize="36" fontWeight="800" fill="var(--ink)">
                {active.length}
              </text>
              <text x="120" y="130" textAnchor="middle" fontSize="12" fill="var(--muted-2)">
                active systems
              </text>
            </svg>
          </div>
          <div className={styles.domainLegend}>
            {DOMAIN_ORDER.filter((d) => domainCounts[d]).map((d) => (
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

        <div className={styles.byDomainCard}>
          <div className={styles.byDomainTitle}>By domain</div>
          <div className={styles.byDomainRow}>
            <svg width="80" height="80" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r={donutR} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="14" />
              {donutSegs.map((seg) => (
                <circle
                  key={seg.d}
                  cx="40"
                  cy="40"
                  r={donutR}
                  fill="none"
                  stroke={DOMAIN_COLORS[seg.d]}
                  strokeWidth="14"
                  strokeDasharray={`${seg.len} ${donutC}`}
                  strokeDashoffset={seg.offset}
                  transform="rotate(-90 40 40)"
                />
              ))}
              <text x="40" y="45" textAnchor="middle" fontSize="18" fontWeight="800" fill="var(--ink)">
                {active.length}
              </text>
            </svg>
            <div className={styles.byDomainLegend}>
              {DOMAIN_ORDER.filter((d) => domainCounts[d]).map((d) => (
                <span key={d} className={styles.byDomainLegendItem}>
                  <span className={styles.legendDot} style={{ background: DOMAIN_COLORS[d] }} />
                  {DOMAIN_LABELS[d]} · {domainCounts[d]}
                </span>
              ))}
            </div>
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
