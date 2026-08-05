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
  IconFeather,
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

  // "A reminder": first system day that was due this week but not done (in the past).
  const missedReminder = (() => {
    for (const { s, occ } of occBySystem) {
      for (let i = 0; i < 7; i++) {
        const day = addDays(weekStart, i);
        if (occ[i] === 'scheduled' && day.getTime() < now.getTime()) {
          return { title: s.title, day: day.toLocaleDateString(undefined, { weekday: 'long' }) };
        }
      }
    }
    return null;
  })();

  // Full-month calendar grid with per-day domain dots from completed system blocks.
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const leadingBlanks = (monthStart.getDay() + 6) % 7; // Monday-first offset
  const monthCells: ({ date: Date; dots: string[] } | null)[] = [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => {
      const date = new Date(now.getFullYear(), now.getMonth(), i + 1);
      const dots = recurring
        .filter((s) =>
          Object.values(state.blocks).some(
            (b) => b.system_id === s.id && b.completed_at && isSameDay(new Date(b.completed_at), date)
          )
        )
        .map((s) => DOMAIN_COLORS[s.domain])
        .slice(0, 3);
      return { date, dots };
    }),
  ];
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
                  {ctx ? <ContextIcon name={ctx.icon} size={19} color={colors?.mid} /> : <IconRefresh size={19} color="var(--muted-2)" />}
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
            <IconPlus size={15} color="white" />
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
          <div className={styles.calMonthGrid}>
            {monthCells.map((cell, i) => {
              if (!cell) return <div key={i} className={styles.calDayCell} />;
              const today = isSameDay(cell.date, now);
              return (
                <div key={i} className={styles.calDayCell}>
                  {today ? (
                    <div className={styles.calToday}>{cell.date.getDate()}</div>
                  ) : (
                    <div className={styles.calDayNum}>{cell.date.getDate()}</div>
                  )}
                  {!today && cell.dots.length > 0 && (
                    <div className={styles.calDotRow}>
                      {cell.dots.map((c, j) => (
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
          <g fill="var(--sc-base)" opacity="0.22">
            <path d="M120 40 C 210 -10 300 30 300 110 C 300 190 220 220 150 200 C 70 178 40 90 120 40 Z" />
            <path d="M370 210 C 450 190 500 260 470 330 C 445 390 360 400 320 350 C 278 296 300 228 370 210 Z" />
            <path d="M90 360 C 170 330 250 380 235 460 C 222 528 140 550 90 505 C 38 458 22 388 90 360 Z" />
            <path d="M330 560 C 420 540 470 620 430 690 C 396 748 315 745 285 685 C 256 626 262 578 330 560 Z" />
            <path d="M130 720 C 220 695 295 755 270 835 C 249 900 160 910 115 855 C 72 803 62 745 130 720 Z" />
            <path d="M360 900 C 445 885 495 960 460 1030 C 430 1088 350 1090 315 1035 C 282 982 292 916 360 900 Z" />
            <path d="M100 1080 C 190 1055 270 1115 245 1195 C 224 1262 135 1272 92 1215 C 52 1162 42 1105 100 1080 Z" />
            <path d="M350 1260 C 440 1240 495 1315 458 1388 C 427 1448 345 1450 310 1392 C 278 1338 285 1280 350 1260 Z" />
            <path d="M120 1420 C 210 1398 288 1460 262 1540 C 240 1606 150 1614 108 1556 C 68 1502 58 1444 120 1420 Z" />
            <path d="M360 1580 C 445 1562 500 1636 465 1706 C 436 1762 352 1760 318 1704 C 286 1650 294 1596 360 1580 Z" />
          </g>
          <g fill="var(--sc-base)" opacity="0.12">
            <path d="M300 120 C 360 100 410 150 388 210 C 368 262 300 268 268 220 C 238 174 245 140 300 120 Z" />
            <path d="M150 470 C 210 452 258 502 236 560 C 216 610 150 616 120 570 C 92 526 98 490 150 470 Z" />
            <path d="M370 730 C 430 714 478 762 456 820 C 436 870 372 876 342 830 C 314 786 320 748 370 730 Z" />
            <path d="M160 980 C 220 964 266 1012 245 1070 C 226 1120 162 1126 132 1080 C 104 1036 110 998 160 980 Z" />
            <path d="M340 1140 C 400 1124 446 1172 425 1230 C 406 1280 342 1286 312 1240 C 284 1196 290 1158 340 1140 Z" />
            <path d="M150 1660 C 210 1644 256 1692 235 1750 C 216 1800 152 1806 122 1760 C 94 1716 100 1678 150 1660 Z" />
          </g>
        </svg>

        <div className={styles.middleInner}>
          <div className={styles.middleHeader}>
            <span className={styles.middleTitle}>Your systems</span>
            <button className={styles.middleAdd} onClick={() => setShowAdd(true)} aria-label="Add system">
              <IconPlus size={18} color="var(--sc-deep)" />
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
                    {ctx ? <ContextIcon name={ctx.icon} size={22} color={colors?.mid} /> : <IconRefresh size={22} color="var(--muted-2)" />}
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
            <svg width="270" height="169" viewBox="0 0 240 150" className={styles.ringSvg}>
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

        <div className={styles.reminderRow}>
          <div className={styles.reminderIconBox}>
            <IconFeather size={16} color="var(--me-mid)" />
          </div>
          <div>
            <div className={styles.reminderLabel}>A reminder</div>
            <div className={styles.reminderText}>
              {missedReminder
                ? `Missed ${missedReminder.title} ${missedReminder.day}? That's information, not failure.`
                : 'Every system you kept this week was a choice. Off days are data, not failure.'}
            </div>
          </div>
        </div>

        <div className={styles.byDomainCard}>
          <div className={styles.byDomainTitle}>By domain</div>
          <div className={styles.byDomainRow}>
            <svg width="92" height="92" viewBox="0 0 80 80">
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
