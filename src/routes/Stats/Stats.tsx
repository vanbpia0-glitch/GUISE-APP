import { useState } from 'react';
import { Link } from 'react-router-dom';
import styles from './Stats.module.css';
import { useStore } from '../../store/StoreContext';
import {
  activeContexts,
  averageWeeklyHours,
  blockActualMinutes,
  blockersResolvedThisWeek,
  blocksOnDay,
  hoursBySourceType,
  hoursByContextThisWeek,
  monthlyConsistency,
  personalRecords,
  reflectionForWeek,
  sessionLengthHistogram,
  sessionsInWeek,
  timeOfDayPattern,
  weekHoursTotal,
  weeklyMomentum,
} from '../../lib/selectors';
import { addDays, elapsedFraction, isSameDay, startOfWeek, weekdayLabel } from '../../lib/date';
import { colorsFor } from '../../lib/contextColors';
import {
  ContextIcon,
  IconAward,
  IconCalendarCheck,
  IconChevronLeft,
  IconChevronRight,
  IconClock,
  IconFlame,
  IconMoonStars,
  IconNotebook,
  IconPlayerPlay,
  IconRefresh,
  IconShare2,
  IconSparkles,
  IconSunHigh,
  IconSunrise,
  IconTargetArrow,
  IconTrophy,
} from '../../lib/icons';

export default function Stats() {
  const { state } = useStore();
  const now = new Date();
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);
  const [shared, setShared] = useState(false);

  const weekStart = addDays(startOfWeek(now), weekOffset * 7);
  const weekEnd = addDays(weekStart, 6);
  const viewingNow = addDays(weekStart, 3);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const momentum = weeklyMomentum(state, weekStart, now);
  const lastWeekMomentum = weeklyMomentum(state, addDays(weekStart, -7), now);
  const momentumDelta = momentum.momentum - lastWeekMomentum.momentum;

  const thisWeekHours = weekHoursTotal(state, weekStart, now);
  const avgHours = averageWeeklyHours(state, weekStart);
  // Compare against pace-through-the-week, not the full weekly average — a
  // Tuesday shouldn't look "behind" a completed week just because it's
  // earlier in its own week.
  const weekElapsedFrac = elapsedFraction(weekStart, addDays(weekStart, 7), now);
  const paceAvgHours = avgHours * weekElapsedFrac;
  const vsAvgPct = paceAvgHours === 0 ? 0 : Math.round(((thisWeekHours - paceAvgHours) / paceAvgHours) * 100);

  const last4 = [-3, -2, -1, 0].map((o) => weeklyMomentum(state, addDays(weekStart, o * 7), now).momentum);

  // Percentile of this week vs. the prior 7 weeks (self-referential, not cross-user).
  const last8 = [-7, -6, -5, -4, -3, -2, -1, 0].map((o) => weeklyMomentum(state, addDays(weekStart, o * 7), now).momentum);
  const priorWeeks = last8.slice(0, -1);
  const currentWk = last8[last8.length - 1];
  const betterThanPct =
    priorWeeks.length === 0 ? 0 : Math.round((priorWeeks.filter((m) => m < currentWk).length / priorWeeks.length) * 100);

  const sessions = sessionsInWeek(state, weekStart);
  const avgSessionMin = sessions.length === 0 ? 0 : Math.round(sessions.reduce((s, w) => s + (w.duration_minutes || 0), 0) / sessions.length);
  const histogram = sessionLengthHistogram(sessions);
  const maxHisto = Math.max(1, ...Object.values(histogram));

  const tod = timeOfDayPattern(sessions);
  const source = hoursBySourceType(state, weekStart, now);
  const contexts = activeContexts(state);
  const hoursByContext = hoursByContextThisWeek(state, viewingNow);
  const maxContextHours = Math.max(0.5, ...contexts.map((c) => hoursByContext[c.id] || 0));

  const records = personalRecords(state);
  const resolvedThisWeek = blockersResolvedThisWeek(state, viewingNow);

  const monthDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const consistency = monthlyConsistency(state, monthDate.getFullYear(), monthDate.getMonth(), now);
  const firstWeekday = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1).getDay();
  const heatCells: { hours: number; date: Date }[] = [
    ...Array.from({ length: firstWeekday }, () => ({ hours: -1, date: monthDate })),
    ...consistency.days,
  ];

  const reflection = reflectionForWeek(state, weekStart);

  const maxDayMinutes = Math.max(
    60,
    ...weekDays.map((d) => blocksOnDay(state, d).reduce((s, b) => s + blockActualMinutes(state, b, now), 0))
  );

  function heatColor(hours: number) {
    if (hours < 0) return 'transparent';
    if (hours === 0) return 'rgba(41,39,35,0.08)';
    if (hours < 1) return '#b4c48d';
    if (hours < 2.5) return '#7d944d';
    return '#5a6b38';
  }

  async function shareRecap() {
    const text = `Guise recap — week of ${weekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}\n${thisWeekHours}h logged · momentum ${momentum.momentum}% · ${sessions.length} focus sessions`;
    try {
      await navigator.clipboard.writeText(text);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    } catch {
      // clipboard permission denied — nothing to fall back to, silently ignore
    }
  }

  const sourceNote =
    source.goalPct >= source.systemPct && source.goalPct >= source.adhocPct
      ? 'Mostly goal-driven this week.'
      : source.systemPct >= source.adhocPct
        ? 'Systems carried most of this week quietly.'
        : 'Mostly ad-hoc this week — worth scheduling more of it on purpose?';

  const todNote =
    tod.morningPct >= tod.afternoonPct && tod.morningPct >= tod.eveningPct && tod.morningPct > 0
      ? 'You do your best focused work before noon — worth protecting that block.'
      : tod.eveningPct >= tod.morningPct && tod.eveningPct >= tod.afternoonPct && tod.eveningPct > 0
        ? "You're an evening worker — plan demanding tasks accordingly."
        : 'Your focus time is fairly even across the day.';

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <div className={styles.title}>Stats</div>
          <div className={styles.subRow}>
            <span className={styles.weekLabel}>
              Week of {weekStart.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })} —{' '}
              {weekEnd.toLocaleDateString(undefined, { day: 'numeric' })}
            </span>
            <span className={styles.streakBadge}>
              <IconFlame size={15} /> {records.longestStreakDays} wk best streak
            </span>
          </div>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.milestoneRow}>
            <div className={styles.trophyCircle}>
              <IconTrophy size={22} color="white" />
            </div>
            <div>
              <div className={styles.milestoneValue}>{resolvedThisWeek} blockers resolved this week</div>
              <div className={styles.milestoneNote}>{sessions.length} focus sessions logged</div>
            </div>
          </div>
          <div className={styles.weekNavRow}>
            <div className={styles.weekNav}>
              <button className={styles.navBtn} onClick={() => setWeekOffset((w) => w - 1)} aria-label="Previous week">
                <IconChevronLeft size={13} />
              </button>
              <span className={styles.navLabel}>{weekOffset === 0 ? 'This week' : weekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
              <button
                className={styles.navBtn}
                onClick={() => setWeekOffset((w) => Math.min(0, w + 1))}
                aria-label="Next week"
                disabled={weekOffset === 0}
              >
                <IconChevronRight size={13} />
              </button>
            </div>
            <button className={styles.shareBtn} onClick={shareRecap}>
              <IconShare2 size={12} /> {shared ? 'Copied!' : 'Share recap'}
            </button>
          </div>
        </div>
      </div>

      <div className={styles.grid}>
        <div className={styles.card} style={{ gridColumn: 'span 3' }}>
          <div className={styles.cardLabel}>Momentum · this week</div>
          <div className={styles.momentumRow}>
            <div className={styles.momentumLegend}>
              <span className={styles.momentumLegendItem}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--grounds-base)', display: 'inline-block' }} />
                Blocks
              </span>
              <span className={styles.momentumLegendItem}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--me-base)', display: 'inline-block' }} />
                Consistency
              </span>
              <span className={styles.momentumLegendItem}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--sc-base)', display: 'inline-block' }} />
                Energy
              </span>
            </div>
            <svg width="80" height="80" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(41,39,35,0.08)" strokeWidth="10" />
              {(() => {
                const circ = 2 * Math.PI * 32;
                const parts = [
                  { pct: momentum.blocksPct, color: 'var(--grounds-base)' },
                  { pct: momentum.consistencyPct, color: 'var(--me-base)' },
                  { pct: momentum.energyPct, color: 'var(--sc-base)' },
                ];
                const sum = parts.reduce((s, p) => s + p.pct, 0) || 1;
                const filled = (momentum.momentum / 100) * circ;
                let cursor = 0;
                return parts.map((p, i) => {
                  const len = (p.pct / sum) * filled;
                  const el = (
                    <circle
                      key={i}
                      cx="40"
                      cy="40"
                      r="32"
                      fill="none"
                      stroke={p.color}
                      strokeWidth="10"
                      strokeDasharray={`${len} ${circ}`}
                      strokeDashoffset={-cursor}
                      strokeLinecap="butt"
                      transform="rotate(-90 40 40)"
                    />
                  );
                  cursor += len;
                  return el;
                });
              })()}
              <text x="40" y="45" textAnchor="middle" fontSize="17" fontWeight="800" fill="var(--ink)">
                {momentum.momentum}%
              </text>
            </svg>
          </div>
          <div className={styles.momentumDelta} style={{ color: momentumDelta >= 0 ? 'var(--grounds-mid)' : 'var(--sc-mid)' }}>
            {momentumDelta >= 0 ? 'up' : 'down'} {Math.abs(momentumDelta)}pts vs last week
          </div>
        </div>

        <div className={`${styles.card} ${styles.avgCard}`} style={{ gridColumn: 'span 3' }}>
          <div className={styles.avgLabel}>You're better than</div>
          <div className={styles.avgValue}>{betterThanPct}%</div>
          {(() => {
            const w = 160;
            const h = 40;
            const n = last8.length;
            const max = Math.max(1, ...last8);
            const pts = last8.map((m, i) => {
              const x = (i / (n - 1)) * w;
              const y = h - 4 - (m / max) * (h - 10);
              return { x, y };
            });
            const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
            const last = pts[pts.length - 1];
            return (
              <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} className={styles.betterSpark}>
                <path d={line} fill="none" stroke="rgba(41,35,80,0.35)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <line x1={last.x} y1={last.y - 2} x2={last.x} y2={h - 4} stroke="var(--me-deep)" strokeWidth="2" />
                <circle cx={last.x} cy={last.y} r="4" fill="var(--me-deep)" />
              </svg>
            );
          })()}
          <div className={styles.avgNote}>You're the marked point on your own weekly curve</div>
        </div>

        <div className={styles.card} style={{ gridColumn: 'span 3' }}>
          <div className={styles.cardLabel}>Last 4 weeks</div>
          {(() => {
            const w = 160;
            const h = 60;
            const pts = last4.map((m, i) => ({ x: (i / 3) * w, y: h - 8 - (m / 100) * (h - 16), m }));
            const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
            const area = `${line} L ${w} ${h} L 0 ${h} Z`;
            return (
              <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`}>
                {[12, 30, 48].map((y) => (
                  <line key={y} x1="0" y1={y} x2={w} y2={y} stroke="rgba(41,39,35,0.08)" strokeWidth="1" />
                ))}
                <path d={area} fill="var(--grounds-base)" opacity="0.12" />
                <path d={line} fill="none" stroke="var(--grounds-base)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                {pts.map((p, i) => (
                  <circle key={i} cx={p.x} cy={p.y} r={i === 3 ? 4.5 : 3} fill={i === 3 ? 'var(--grounds-base)' : 'var(--green-40)'} />
                ))}
              </svg>
            );
          })()}
          <div className={styles.sparkLabels}>
            {last4.map((m, i) => (
              <span key={i} style={i === 3 ? { color: 'var(--grounds-mid)', fontWeight: 700 } : undefined}>
                {m}%
              </span>
            ))}
          </div>
        </div>

        <div className={styles.card} style={{ gridColumn: 'span 3', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div className={styles.cardLabel}>This week's hours</div>
          <div className={styles.vsAvgTop}>
            <span className={styles.vsAvgValue}>{thisWeekHours}h</span>
          </div>
          <div className={styles.vsAvgNote}>{avgHours > 0 ? `avg week is ${avgHours}h` : 'building your average'}</div>
        </div>

        <div className={styles.card} style={{ gridColumn: 'span 8' }}>
          <div className={styles.momentumRow} style={{ marginBottom: 14 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>Focus hours by day</span>
            <span style={{ fontSize: 10.5, color: 'var(--muted-2)' }}>{thisWeekHours}h total</span>
          </div>
          <div className={styles.dayBarsRow}>
            {weekDays.map((day) => {
              const blocks = blocksOnDay(state, day);
              const minutes = blocks.reduce((s, b) => s + blockActualMinutes(state, b, now), 0);
              const heightPct = Math.max(3, (minutes / maxDayMinutes) * 100);
              const today_ = isSameDay(day, now);
              return (
                <div className={styles.dayBarCol} key={day.toISOString()}>
                  <div className={styles.dayBar} style={{ height: `${heightPct}%`, background: minutes > 0 ? 'var(--sc-base)' : 'var(--van-tint)' }} />
                  <span className={`${styles.dayBarLabel} ${today_ ? styles.dayBarLabelToday : ''}`}>{weekdayLabel(day)}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className={`${styles.card} ${styles.sessionsCard}`} style={{ gridColumn: 'span 4' }}>
          <div className={styles.sessionsTop}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <IconPlayerPlay size={16} color="var(--van-deep)" />
              <span className={styles.cardLabel} style={{ marginBottom: 0, color: 'var(--van-deep)' }}>
                Focus sessions
              </span>
            </div>
          </div>
          <div className={styles.sessionsBig}>{sessions.length}</div>
          <div className={styles.sessionsSub}>avg {avgSessionMin}min each</div>
          <div style={{ fontSize: 9, color: 'var(--van-deep)', opacity: 0.7, fontWeight: 700, marginBottom: 6 }}>Session length</div>
          <div className={styles.histoBars}>
            {Object.entries(histogram).map(([label, count]) => (
              <div key={label} className={styles.histoBar} style={{ height: `${Math.max(6, (count / maxHisto) * 100)}%` }} />
            ))}
          </div>
          <div className={styles.histoLabels}>
            {Object.keys(histogram).map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>
        </div>

        <div className={styles.card} style={{ gridColumn: 'span 5' }}>
          <div className={styles.todTitle}>Time-of-day pattern</div>
          <div className={styles.todTiles}>
            <div className={styles.todTile} style={{ background: 'rgba(125,148,77,0.18)' }}>
              <IconSunrise size={26} color="var(--grounds-mid)" />
              <div className={styles.todValue} style={{ color: 'var(--grounds-deep)' }}>
                {tod.morningPct}%
              </div>
              <div className={styles.todLabel} style={{ color: 'var(--grounds-deep)' }}>
                Morning
              </div>
            </div>
            <div className={styles.todTile} style={{ background: 'rgba(255,189,26,0.18)' }}>
              <IconSunHigh size={26} color="var(--van-mid)" />
              <div className={styles.todValue} style={{ color: 'var(--van-deep)' }}>
                {tod.afternoonPct}%
              </div>
              <div className={styles.todLabel} style={{ color: 'var(--van-deep)' }}>
                Afternoon
              </div>
            </div>
            <div className={styles.todTile} style={{ background: 'rgba(137,120,227,0.18)' }}>
              <IconMoonStars size={26} color="var(--me-mid)" />
              <div className={styles.todValue} style={{ color: 'var(--me-deep)' }}>
                {tod.eveningPct}%
              </div>
              <div className={styles.todLabel} style={{ color: 'var(--me-deep)' }}>
                Evening
              </div>
            </div>
          </div>
          <div className={styles.todNote}>{todNote}</div>
        </div>

        <div className={styles.card} style={{ gridColumn: 'span 4' }}>
          <div className={styles.donutTitle}>Hours came from</div>
          <div className={styles.donutRow}>
            <svg width="90" height="90" viewBox="0 0 70 70">
              <circle cx="35" cy="35" r="27" fill="none" stroke="rgba(41,39,35,0.08)" strokeWidth="12" />
              <circle
                cx="35"
                cy="35"
                r="27"
                fill="none"
                stroke="var(--sc-base)"
                strokeWidth="12"
                strokeDasharray={`${(source.goalPct / 100) * 2 * Math.PI * 27} ${2 * Math.PI * 27}`}
                transform="rotate(-90 35 35)"
              />
              <circle
                cx="35"
                cy="35"
                r="27"
                fill="none"
                stroke="var(--grounds-base)"
                strokeWidth="12"
                strokeDasharray={`${(source.systemPct / 100) * 2 * Math.PI * 27} ${2 * Math.PI * 27}`}
                strokeDashoffset={`-${(source.goalPct / 100) * 2 * Math.PI * 27}`}
                transform="rotate(-90 35 35)"
              />
            </svg>
            <div className={styles.donutLegend}>
              <div className={styles.donutLegendRow}>
                <div className={styles.donutIconBox} style={{ background: 'rgba(237,126,28,0.2)' }}>
                  <IconTargetArrow size={15} color="var(--sc-mid)" />
                </div>
                <span style={{ fontSize: 13, color: 'var(--sc-deep)', flex: 1 }}>Goal blocks</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--sc-deep)' }}>{source.goalPct}%</span>
              </div>
              <div className={styles.donutLegendRow}>
                <div className={styles.donutIconBox} style={{ background: 'rgba(125,148,77,0.2)' }}>
                  <IconRefresh size={15} color="var(--grounds-mid)" />
                </div>
                <span style={{ fontSize: 13, color: 'var(--grounds-deep)', flex: 1 }}>Systems</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--grounds-deep)' }}>{source.systemPct}%</span>
              </div>
              <div className={styles.donutLegendRow}>
                <div className={styles.donutIconBox} style={{ background: 'rgba(41,39,35,0.08)' }}>
                  <IconSparkles size={15} color="var(--muted)" />
                </div>
                <span style={{ fontSize: 13, color: 'var(--ink-soft)', flex: 1 }}>Ad-hoc</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--ink-soft)' }}>{source.adhocPct}%</span>
              </div>
            </div>
          </div>
          <div className={styles.todNote}>{sourceNote}</div>
        </div>

        <div className={`${styles.card} ${styles.recordsCard}`} style={{ gridColumn: 'span 3' }}>
          <div className={styles.recordsTitle}>
            <IconAward size={14} /> Personal Records
          </div>
          <div className={styles.recordRow}>
            <div className={styles.recordIconBox} style={{ background: 'rgba(237,126,28,0.18)' }}>
              <IconFlame size={14} color="var(--sc-base)" />
            </div>
            <span className={styles.recordLabel}>Longest streak</span>
            <span className={styles.recordValue}>{records.longestStreakDays}d</span>
          </div>
          <div className={styles.recordRow}>
            <div className={styles.recordIconBox} style={{ background: 'rgba(137,120,227,0.18)' }}>
              <IconClock size={14} color="var(--me-base)" />
            </div>
            <span className={styles.recordLabel}>Best week</span>
            <span className={styles.recordValue}>{records.bestWeekHours}h</span>
          </div>
          <div className={styles.recordRow}>
            <div className={styles.recordIconBox} style={{ background: 'rgba(125,148,77,0.18)' }}>
              <IconCalendarCheck size={14} color="var(--grounds-base)" />
            </div>
            <span className={styles.recordLabel}>Best month</span>
            <span className={styles.recordValue}>{records.bestMonthName || '—'}</span>
          </div>
          <div className={styles.recordRow}>
            <div className={styles.recordIconBox} style={{ background: 'rgba(255,189,26,0.18)' }}>
              <IconTrophy size={14} color="#ffbd1a" />
            </div>
            <span className={styles.recordLabel}>Blockers resolved</span>
            <span className={styles.recordValue}>{records.milestonesCount}</span>
          </div>
        </div>

        <div className={styles.card} style={{ gridColumn: 'span 4' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', marginBottom: 28 }}>Hours by context</div>
          <div className={styles.contextBarsWrap}>
            {contexts.map((c) => {
              const colors = colorsFor(c.color_key);
              const hrs = hoursByContext[c.id] || 0;
              return (
                <div className={styles.contextBarCol} key={c.id}>
                  <span className={styles.contextBarValue} style={{ color: colors.deep }}>
                    {hrs}h
                  </span>
                  <div className={styles.contextBar} style={{ height: `${Math.max(4, (hrs / maxContextHours) * 90)}px`, background: colors.base }} />
                  <div className={styles.contextBarDot} style={{ background: colors.base }}>
                    <ContextIcon name={c.icon} size={12} color="white" />
                  </div>
                  <span className={styles.contextBarLabel} style={{ color: colors.deep }}>
                    {c.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className={styles.card} style={{ gridColumn: 'span 8' }}>
          <div className={styles.consistencyHeader}>
            <span className={styles.consistencyTitle}>Monthly consistency</span>
            <div className={styles.weekNav}>
              <button className={styles.navBtn} onClick={() => setMonthOffset((m) => m - 1)} aria-label="Previous month">
                <IconChevronLeft size={11} />
              </button>
              <span className={styles.navLabel}>{monthDate.toLocaleDateString(undefined, { month: 'long' })}</span>
              <button
                className={styles.navBtn}
                onClick={() => setMonthOffset((m) => Math.min(0, m + 1))}
                aria-label="Next month"
                disabled={monthOffset === 0}
              >
                <IconChevronRight size={11} />
              </button>
            </div>
          </div>
          <div className={styles.consistencyBody}>
            <div style={{ flexShrink: 0, width: 400, maxWidth: '100%' }}>
              <div className={styles.heatmapWeekdayRow}>
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                  <span className={styles.heatmapWeekday} key={i}>
                    {d}
                  </span>
                ))}
              </div>
              <div className={styles.heatmapGrid}>
                {heatCells.map((cell, i) => (
                  <div
                    key={i}
                    className={`${styles.heatCell} ${cell.hours >= 0 && isSameDay(cell.date, now) ? styles.heatCellToday : ''}`}
                    style={{ background: heatColor(cell.hours) }}
                    title={cell.hours >= 0 ? `${cell.date.toDateString()}: ${cell.hours}h` : undefined}
                  />
                ))}
              </div>
            </div>
            <div className={styles.consistencySide}>
              <div>
                <div className={styles.sideLabel}>Days active</div>
                <div className={styles.sideValue}>
                  {consistency.activeDays}
                  <span style={{ fontSize: 13, color: 'var(--muted-2)', fontWeight: 600 }}> / {consistency.days.length}</span>
                </div>
              </div>
              <div>
                <div className={styles.sideLabel}>Best day this month</div>
                <div className={styles.sideValueSmall}>
                  {consistency.bestDay ? consistency.bestDay.date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) : 'None yet'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.footer}>
        <Link to="/reflection" className={styles.footerLink}>
          <IconNotebook size={18} color="var(--me-deep)" />
          {reflection ? "See this week's reflection" : "Write this week's reflection"}
          <IconChevronRight size={15} />
        </Link>
        {reflection?.biggest_win && <div className={styles.footerQuote}>"{reflection.biggest_win}"</div>}
      </div>
    </div>
  );
}
