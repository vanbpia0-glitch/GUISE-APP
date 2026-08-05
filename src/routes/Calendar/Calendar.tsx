import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Calendar.module.css';
import { useStore } from '../../store/StoreContext';
import { activeContexts, blocksOnDay, upcomingBlocks } from '../../lib/selectors';
import { colorsFor } from '../../lib/contextColors';
import { addDays, isSameDay, startOfWeek } from '../../lib/date';
import { formatTimeShort } from '../../lib/format';
import {
  ContextIcon,
  IconArrowRight,
  IconBulb,
  IconChevronLeft,
  IconChevronRight,
  IconPlus,
} from '../../lib/icons';
import type { Block } from '../../types';
import Modal from '../../components/Modal';
import AddBlockForm from '../../components/AddBlockForm';

type View = 'month' | 'week' | 'day';

const HOURS = Array.from({ length: 24 }, (_, i) => i);

function hourLabel(h: number) {
  const displayHour = h % 12 === 0 ? 12 : h % 12;
  const suffix = h < 12 ? 'AM' : 'PM';
  return `${displayHour}:00 ${suffix}`;
}

export default function Calendar() {
  const { state } = useStore();
  const navigate = useNavigate();
  const now = new Date();
  const contexts = activeContexts(state);

  const [view, setView] = useState<View>('month');
  const [cursor, setCursor] = useState<Date>(now); // focused month/week/day
  const [selectedDay, setSelectedDay] = useState<Date>(now);
  const [filterCtx, setFilterCtx] = useState<string>('all');
  const [addOpen, setAddOpen] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);

  const filterBlocks = (blocks: Block[]) =>
    filterCtx === 'all' ? blocks : blocks.filter((b) => b.context_id === filterCtx);

  const ctxFor = (id?: string) => (id ? state.contexts[id] : undefined);

  // ---- Month grid (Sunday-aligned) ----
  const monthGrid = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const gridStart = addDays(first, -first.getDay()); // back to Sunday
    return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  }, [cursor]);

  const monthEvents = useMemo(() => {
    const days: Record<string, Block[]> = {};
    let count = 0;
    monthGrid.forEach((d) => {
      if (d.getMonth() !== cursor.getMonth()) return;
      const bs = filterBlocks(blocksOnDay(state, d));
      if (bs.length) {
        days[d.toDateString()] = bs;
        count += bs.length;
      }
    });
    // busiest weekday
    const byWeekday: Record<number, number> = {};
    Object.entries(days).forEach(([k, v]) => {
      const wd = new Date(k).getDay();
      byWeekday[wd] = (byWeekday[wd] || 0) + v.length;
    });
    const busiest = Object.entries(byWeekday).sort((a, b) => b[1] - a[1])[0];
    const busiestLabel = busiest
      ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][Number(busiest[0])]
      : '—';
    return { days, count, busiestLabel };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthGrid, state, cursor, filterCtx]);

  const upcoming = useMemo(() => filterBlocks(upcomingBlocks(state, 21, now)).slice(0, 4), [state, filterCtx]);

  const selectedBlocks = filterBlocks(blocksOnDay(state, selectedDay));

  // ---- Week ----
  const weekStart = useMemo(() => startOfWeek(cursor), [cursor]);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  // ---- Day ----
  const dayBlocks = filterBlocks(blocksOnDay(state, cursor));
  const dayHours = dayBlocks.reduce((s, b) => {
    const mins = (new Date(b.scheduled_end).getTime() - new Date(b.scheduled_start).getTime()) / 60000;
    return s + mins;
  }, 0);

  // Open the week/day timeline near the earliest event (or 7am) instead of midnight.
  useEffect(() => {
    const el = gridRef.current;
    if (!el || view === 'month') return;
    const blocks =
      view === 'day' ? dayBlocks : weekDays.flatMap((d) => filterBlocks(blocksOnDay(state, d)));
    if (blocks.length === 0) {
      el.scrollTop = 7 * 56;
      return;
    }
    const earliest = Math.min(...blocks.map((b) => new Date(b.scheduled_start).getHours()));
    el.scrollTop = Math.max(0, (earliest - 1) * 56);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, cursor, filterCtx]);

  function shift(delta: number) {
    if (view === 'month') setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + delta, 1));
    else if (view === 'week') setCursor(addDays(cursor, delta * 7));
    else setCursor(addDays(cursor, delta));
  }

  const monthName = cursor.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  const dayName = cursor.toLocaleString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  function eventTop(b: Block) {
    const s = new Date(b.scheduled_start);
    return (s.getHours() + s.getMinutes() / 60) * 56; // 56px per hour row
  }
  function eventHeight(b: Block) {
    const mins = (new Date(b.scheduled_end).getTime() - new Date(b.scheduled_start).getTime()) / 60000;
    return Math.max(24, (mins / 60) * 56);
  }

  return (
    <div className={styles.page}>
      <div className={styles.main}>
        <div className={styles.header}>
          <div>
            <div className={styles.title}>Calendar</div>
            <div className={styles.subtitle}>Blocks, renewals, and deadlines across all contexts</div>
          </div>
          <div className={styles.headerActions}>
            <div className={styles.viewToggle}>
              {(['month', 'week', 'day'] as View[]).map((v) => (
                <button
                  key={v}
                  className={`${styles.viewBtn} ${view === v ? styles.viewBtnActive : ''}`}
                  onClick={() => setView(v)}
                >
                  {v[0].toUpperCase() + v.slice(1)}
                </button>
              ))}
            </div>
            <button className={styles.newEventBtn} onClick={() => setAddOpen(true)}>
              <IconPlus size={14} /> New event
            </button>
          </div>
        </div>

        <div className={styles.filterRow}>
          <button
            className={`${styles.filterChip} ${filterCtx === 'all' ? styles.filterChipAllActive : ''}`}
            onClick={() => setFilterCtx('all')}
          >
            All contexts
          </button>
          {contexts.map((ctx) => {
            const colors = colorsFor(ctx.color_key);
            const active = filterCtx === ctx.id;
            return (
              <button
                key={ctx.id}
                className={styles.filterChip}
                onClick={() => setFilterCtx(ctx.id)}
                style={{
                  borderColor: colors.base,
                  background: active ? colors.tint : 'transparent',
                  color: colors.deep,
                }}
              >
                <span className={styles.filterDot} style={{ background: colors.base }} />
                {ctx.name}
              </button>
            );
          })}
        </div>

        {view === 'month' && (
          <div className={styles.monthCard}>
            <div className={styles.monthHeader}>
              <button className={styles.navBtn} onClick={() => shift(-1)} aria-label="Previous month">
                <IconChevronLeft size={18} />
              </button>
              <div className={styles.monthTitle}>{monthName}</div>
              <button className={styles.navBtn} onClick={() => shift(1)} aria-label="Next month">
                <IconChevronRight size={18} />
              </button>
            </div>
            <div className={styles.dowRow}>
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                <span key={i}>{d}</span>
              ))}
            </div>
            <div className={styles.monthGrid}>
              {monthGrid.map((d) => {
                const inMonth = d.getMonth() === cursor.getMonth();
                const isToday = isSameDay(d, now);
                const isSelected = isSameDay(d, selectedDay);
                const bs = monthEvents.days[d.toDateString()] || [];
                return (
                  <button
                    key={d.toISOString()}
                    className={`${styles.dayCell} ${!inMonth ? styles.dayCellMuted : ''} ${
                      isSelected ? styles.dayCellSelected : ''
                    }`}
                    onClick={() => setSelectedDay(new Date(d))}
                  >
                    <span className={`${styles.dayNum} ${isToday ? styles.dayNumToday : ''}`}>{d.getDate()}</span>
                    {bs.length > 0 && (
                      <span className={styles.dotRow}>
                        {bs.slice(0, 3).map((b) => {
                          const ctx = ctxFor(b.context_id);
                          return (
                            <span
                              key={b.id}
                              className={styles.eventDot}
                              style={{ background: ctx ? colorsFor(ctx.color_key).base : 'var(--muted-2)' }}
                            />
                          );
                        })}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {view === 'week' && (
          <div className={styles.gridCard}>
            <div className={styles.weekHead}>
              <div className={styles.weekHeadSpacer}>
                <button className={styles.navBtn} onClick={() => shift(-1)} aria-label="Previous week">
                  <IconChevronLeft size={16} />
                </button>
                <button className={styles.navBtn} onClick={() => shift(1)} aria-label="Next week">
                  <IconChevronRight size={16} />
                </button>
              </div>
              {weekDays.map((d) => {
                const isToday = isSameDay(d, now);
                return (
                  <div key={d.toISOString()} className={`${styles.weekHeadDay} ${isToday ? styles.weekHeadDayToday : ''}`}>
                    <div className={styles.weekHeadDow}>{d.toLocaleString('en-US', { weekday: 'short' })}</div>
                    <div className={`${styles.weekHeadNum} ${isToday ? styles.weekHeadNumToday : ''}`}>{d.getDate()}</div>
                  </div>
                );
              })}
            </div>
            <div className={`${styles.gridBody} ${styles.gridBodyWeek}`} ref={gridRef}>
              <div className={styles.hourCol}>
                {HOURS.map((h) => (
                  <div key={h} className={styles.hourCell}>
                    <span className={styles.hourLabel}>{hourLabel(h)}</span>
                  </div>
                ))}
              </div>
              {weekDays.map((d) => {
                const bs = filterBlocks(blocksOnDay(state, d));
                return (
                  <div key={d.toISOString()} className={styles.dayColumn}>
                    {HOURS.map((h) => (
                      <div key={h} className={styles.gridLine} />
                    ))}
                    {bs.map((b) => {
                      const ctx = ctxFor(b.context_id);
                      const colors = ctx ? colorsFor(ctx.color_key) : undefined;
                      return (
                        <div
                          key={b.id}
                          className={styles.weekEvent}
                          style={{
                            top: eventTop(b),
                            height: eventHeight(b),
                            background: colors?.tint,
                            borderLeft: `3px solid ${colors?.base}`,
                          }}
                        >
                          <div className={styles.weekEventTitle} style={{ color: colors?.deep }}>
                            {b.title}
                          </div>
                          <div className={styles.weekEventTime} style={{ color: colors?.mid }}>
                            {formatTimeShort(b.scheduled_start)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {view === 'day' && (
          <>
            <div className={styles.dayNavRow}>
              <button className={styles.navBtn} onClick={() => shift(-1)} aria-label="Previous day">
                <IconChevronLeft size={18} />
              </button>
              <div className={styles.dayNavTitle}>{dayName}</div>
              <button className={styles.navBtn} onClick={() => shift(1)} aria-label="Next day">
                <IconChevronRight size={18} />
              </button>
            </div>
            <div className={styles.gridCard}>
              <div className={styles.gridBody} ref={gridRef}>
                <div className={styles.hourCol}>
                  {HOURS.map((h) => (
                    <div key={h} className={styles.hourCell}>
                      <span className={styles.hourLabel}>{hourLabel(h)}</span>
                    </div>
                  ))}
                </div>
                <div className={`${styles.dayColumn} ${styles.dayColumnWide}`}>
                  {HOURS.map((h) => (
                    <div key={h} className={styles.gridLine} />
                  ))}
                  {dayBlocks.map((b) => {
                    const ctx = ctxFor(b.context_id);
                    const colors = ctx ? colorsFor(ctx.color_key) : undefined;
                    return (
                      <div
                        key={b.id}
                        className={styles.dayEvent}
                        style={{
                          top: eventTop(b),
                          height: eventHeight(b),
                          background: colors?.tint,
                          borderLeft: `4px solid ${colors?.base}`,
                        }}
                      >
                        <div className={styles.weekEventTitle} style={{ color: colors?.deep }}>
                          {b.title}
                        </div>
                        <div className={styles.weekEventTime} style={{ color: colors?.mid }}>
                          {formatTimeShort(b.scheduled_start)} · {formatTimeShort(b.scheduled_end)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        )}

        {view === 'month' && (
          <div className={styles.glanceCard}>
            <div className={styles.glanceHead}>
              <span className={styles.glanceTitle}>
                {selectedDay.toLocaleString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })} at a glance
              </span>
              <button
                className={styles.glanceLink}
                onClick={() => {
                  setCursor(new Date(selectedDay));
                  setView('day');
                }}
              >
                Open full day view →
              </button>
            </div>
            <div className={styles.glanceGrid}>
              <div className={styles.glanceEvents}>
                {selectedBlocks.length === 0 && <div className={styles.emptyNote}>Nothing scheduled.</div>}
                {selectedBlocks.map((b) => {
                  const ctx = ctxFor(b.context_id);
                  const colors = ctx ? colorsFor(ctx.color_key) : undefined;
                  return (
                    <div
                      key={b.id}
                      className={styles.glanceEvent}
                      style={{ background: colors?.tint, borderLeft: `3px solid ${colors?.base}` }}
                    >
                      {formatTimeShort(b.scheduled_start)} · {b.title}
                    </div>
                  );
                })}
              </div>
              <div className={styles.glanceStat}>
                <div className={styles.glanceStatValue}>{selectedBlocks.length}</div>
                <div className={styles.glanceStatLabel}>events</div>
              </div>
              <div className={styles.glanceStat}>
                <div className={styles.glanceStatValue}>
                  {new Set(selectedBlocks.map((b) => b.context_id)).size}
                </div>
                <div className={styles.glanceStatLabel}>contexts</div>
              </div>
              <div className={styles.glanceStat}>
                <div className={styles.glanceStatValue}>
                  {Math.round(
                    selectedBlocks.reduce(
                      (s, b) =>
                        s + (new Date(b.scheduled_end).getTime() - new Date(b.scheduled_start).getTime()) / 3600000,
                      0
                    )
                  )}
                  h
                </div>
                <div className={styles.glanceStatLabel}>busy time</div>
              </div>
            </div>
          </div>
        )}
      </div>

      <aside className={styles.rail}>
        {view === 'day' ? (
          <>
            <div className={styles.railCard}>
              <div className={styles.railLabel}>Day recap</div>
              <div className={styles.recapGrid}>
                <div className={styles.recapTile} style={{ background: 'var(--grounds-base)' }}>
                  <div className={styles.recapTileLabel}>Hours</div>
                  <div className={styles.recapTileValue}>{(dayHours / 60).toFixed(1)}h</div>
                </div>
                <div className={styles.recapTile} style={{ background: 'var(--sc-base)' }}>
                  <div className={styles.recapTileLabel}>Events</div>
                  <div className={styles.recapTileValue}>{dayBlocks.length}</div>
                </div>
                <div className={styles.recapTile} style={{ background: 'var(--me-base)' }}>
                  <div className={styles.recapTileLabel}>Contexts</div>
                  <div className={styles.recapTileValue}>{new Set(dayBlocks.map((b) => b.context_id)).size}</div>
                </div>
                <div className={styles.recapTile} style={{ background: 'var(--ink)' }}>
                  <div className={styles.recapTileLabel}>Done</div>
                  <div className={styles.recapTileValue}>{dayBlocks.filter((b) => b.completed_at).length}</div>
                </div>
              </div>
              <button className={styles.railInlineLink} onClick={() => navigate('/stats')}>
                Open stats →
              </button>
            </div>

            <div className={styles.railCard}>
              <div className={styles.railLabel}>Touched today</div>
              {[...new Set(dayBlocks.map((b) => b.context_id))].slice(0, 5).map((cid) => {
                const ctx = ctxFor(cid);
                const colors = ctx ? colorsFor(ctx.color_key) : undefined;
                const first = dayBlocks.find((b) => b.context_id === cid);
                return (
                  <div key={cid} className={styles.touchedRow}>
                    <span className={styles.touchedName}>{ctx?.name || 'Unknown'}</span>
                    <span className={styles.touchedTag} style={{ background: colors?.tint, color: colors?.deep }}>
                      {first?.title.split(' ').slice(0, 2).join(' ')}
                    </span>
                  </div>
                );
              })}
              {dayBlocks.length === 0 && <div className={styles.emptyNote}>No blocks today.</div>}
            </div>

            <div className={styles.tipCard}>
              <IconBulb size={18} color="var(--sc-base)" />
              <div className={styles.tipTitle}>{dayBlocks.length === 0 ? 'Open day' : 'Plan the gaps'}</div>
              <div className={styles.tipText}>
                {dayBlocks.length === 0
                  ? 'Nothing booked — a good window for deep work.'
                  : 'Batch light tasks between your scheduled blocks.'}
              </div>
            </div>
          </>
        ) : (
          <>
            <div className={styles.railCard}>
              <div className={styles.railLabel}>This month</div>
              <div className={styles.monthStatRow}>
                <div className={styles.monthStat}>
                  <div className={styles.monthStatValue}>{monthEvents.count}</div>
                  <div className={styles.monthStatLabel}>events</div>
                </div>
                <div className={styles.monthStat}>
                  <div className={styles.monthStatValue}>{contexts.length}</div>
                  <div className={styles.monthStatLabel}>contexts</div>
                </div>
                <div className={styles.monthStat}>
                  <div className={styles.monthStatValueSm}>{monthEvents.busiestLabel}</div>
                  <div className={styles.monthStatLabel}>busiest day</div>
                </div>
              </div>
            </div>

            <div className={styles.railCard}>
              <div className={styles.railLabel}>Upcoming</div>
              {upcoming.map((b) => {
                const ctx = ctxFor(b.context_id);
                const colors = ctx ? colorsFor(ctx.color_key) : undefined;
                return (
                  <div key={b.id} className={styles.upcomingRow}>
                    {ctx && (
                      <span className={styles.upcomingIcon} style={{ background: colors?.tint }}>
                        <ContextIcon name={ctx.icon} size={13} color={colors?.mid} />
                      </span>
                    )}
                    <span className={styles.upcomingTitle}>{b.title}</span>
                    <span className={styles.upcomingDate} style={{ background: colors?.tint, color: colors?.deep }}>
                      {new Date(b.scheduled_start).toLocaleString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                );
              })}
              {upcoming.length === 0 && <div className={styles.emptyNote}>Nothing coming up.</div>}
            </div>

            <div className={styles.tipCard}>
              <IconBulb size={18} color="var(--sc-base)" />
              <div className={styles.tipTitle}>
                {monthEvents.count < 5 ? 'Light month ahead' : `${monthEvents.count} events this month`}
              </div>
              <div className={styles.tipText}>
                {monthEvents.count < 5
                  ? 'Room to schedule deep-work blocks against your goals.'
                  : 'Well booked — protect your focus time.'}
              </div>
            </div>

            <button className={styles.railGhostLink} onClick={() => navigate('/')}>
              <IconArrowRight size={14} /> Back to dashboard
            </button>
          </>
        )}
      </aside>

      {addOpen && (
        <Modal title="Add a block" onClose={() => setAddOpen(false)}>
          <AddBlockForm onDone={() => setAddOpen(false)} />
        </Modal>
      )}
    </div>
  );
}
