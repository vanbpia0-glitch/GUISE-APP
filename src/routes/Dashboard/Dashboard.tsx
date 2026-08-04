import { useMemo, useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import styles from './Dashboard.module.css';
import { useStore } from '../../store/StoreContext';
import {
  activeContexts,
  blockActualMinutes,
  blocksOnDay,
  goalProgressPct,
  goalStatusLabel,
  goalsByContext,
  hoursByContextThisWeek,
  monthlyMomentum,
  todaysAdventureBlock,
  todaysBlocks,
  upcomingBlocks,
  weekPlannedVsActualMinutes,
} from '../../lib/selectors';
import { colorsFor } from '../../lib/contextColors';
import {
  ContextIcon,
  IconArrowRight,
  IconBell,
  IconClock,
  IconPlayerPlay,
  IconPlayerStopFilled,
  IconPlus,
  IconRefresh,
  IconSearch,
  IconTargetArrow,
} from '../../lib/icons';
import { addDays, startOfWeek, weekdayLabel, isSameDay, formatDateLong } from '../../lib/date';
import { formatClock, formatHours, formatTimeShort } from '../../lib/format';
import { useNow } from '../../lib/useNow';
import { useClickOutside } from '../../lib/useClickOutside';
import Modal from '../../components/Modal';
import AddGoalForm from '../../components/AddGoalForm';
import AddBlockForm from '../../components/AddBlockForm';
import AddSystemForm from '../../components/AddSystemForm';

export default function Dashboard() {
  const { state, dispatch } = useStore();
  const now = new Date();
  const contexts = activeContexts(state);
  const hoursByContext = useMemo(() => hoursByContextThisWeek(state, now), [state]);
  const today = todaysBlocks(state, now);
  const adventure = todaysAdventureBlock(state);
  const upcoming = useMemo(() => upcomingBlocks(state, 7, now).slice(0, 3), [state]);
  const momentum = useMemo(() => monthlyMomentum(state, now), [state]);
  const { plannedMinutes, actualMinutes } = useMemo(() => weekPlannedVsActualMinutes(state, now), [state]);
  const activeSystems = Object.values(state.systems).filter((s) => s.active);
  const weekRef = useRef<HTMLDivElement>(null);

  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [addModalKind, setAddModalKind] = useState<null | 'goal' | 'block' | 'system'>(null);
  const quickAddRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  useClickOutside(quickAddRef, quickAddOpen, () => setQuickAddOpen(false));
  useClickOutside(notifRef, notifOpen, () => setNotifOpen(false));
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Escape') return;
      setQuickAddOpen(false);
      setNotifOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const weekStart = startOfWeek(now);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const runningSession = state.activeTimerBlockId
    ? Object.values(state.workSessions).find((s) => s.block_id === state.activeTimerBlockId && !s.ended_at)
    : undefined;
  const runningBlock = runningSession ? state.blocks[runningSession.block_id] : undefined;
  const liveNow = useNow(!!runningSession);

  const contextById = (id?: string) => (id ? state.contexts[id] : undefined);

  function toggleComplete(id: string) {
    dispatch({ type: 'TOGGLE_BLOCK_COMPLETE', payload: { id } });
  }

  function startTimer(blockId: string) {
    dispatch({ type: 'START_TIMER', payload: { block_id: blockId } });
  }

  function stopTimer() {
    dispatch({ type: 'STOP_TIMER' });
  }

  function swapAdventure() {
    const candidates = today.filter((b) => !b.completed_at && !b.is_todays_adventure);
    if (candidates.length === 0) return;
    dispatch({ type: 'SET_TODAYS_ADVENTURE', payload: { id: candidates[0].id } });
  }

  const greeting = (() => {
    const h = now.getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  })();

  const C = 2 * Math.PI * 54;

  return (
    <div className={styles.page}>
      <div className={styles.main}>
        <div className={styles.header}>
          <div>
            <div className={styles.headerDate}>{formatDateLong(now)}</div>
            <div className={styles.headerGreeting}>{greeting}</div>
          </div>
          <div className={styles.headerActions}>
            <div className={styles.searchWrap}>
              <IconSearch size={13} className={styles.searchIcon} />
              <input type="text" placeholder="Search" className={styles.searchInput} />
            </div>
            <div className={styles.quickAddWrap} ref={quickAddRef}>
              <button
                className={styles.iconBtn}
                aria-label="Quick add"
                title="Quick add"
                aria-haspopup="menu"
                aria-expanded={quickAddOpen}
                onClick={() => {
                  setNotifOpen(false);
                  setQuickAddOpen((v) => !v);
                }}
              >
                <IconPlus size={16} />
              </button>
              {quickAddOpen && (
                <div className={styles.quickAddMenu} role="menu">
                  <button
                    className={styles.quickAddItem}
                    role="menuitem"
                    onClick={() => {
                      setQuickAddOpen(false);
                      setAddModalKind('goal');
                    }}
                  >
                    <IconTargetArrow size={14} color="var(--sc-mid)" /> New goal
                  </button>
                  <button
                    className={styles.quickAddItem}
                    role="menuitem"
                    onClick={() => {
                      setQuickAddOpen(false);
                      setAddModalKind('block');
                    }}
                  >
                    <IconClock size={14} color="var(--grounds-mid)" /> New block
                  </button>
                  <button
                    className={styles.quickAddItem}
                    role="menuitem"
                    onClick={() => {
                      setQuickAddOpen(false);
                      setAddModalKind('system');
                    }}
                  >
                    <IconRefresh size={14} color="var(--me-mid)" /> New system
                  </button>
                </div>
              )}
            </div>
            <div className={styles.bellWrap} ref={notifRef}>
              <button
                className={styles.iconBtn}
                aria-label="Notifications"
                title="Notifications"
                aria-haspopup="dialog"
                aria-expanded={notifOpen}
                onClick={() => {
                  setQuickAddOpen(false);
                  setNotifOpen((v) => !v);
                }}
              >
                <IconBell size={16} />
              </button>
              {upcoming.length > 0 && <div className={styles.bellDot} />}
              {notifOpen && (
                <div className={styles.notifPanel} role="dialog" aria-label="Notifications">
                  <div className={styles.notifHeader}>Notifications</div>
                  {/* TODO: no Notification entity exists yet — once one does (e.g. blocker
                      flagged, milestone hit, adventure not started by midday), replace this
                      stub with real records instead of a hardcoded empty state. */}
                  <div className={styles.notifEmpty}>No notifications yet.</div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className={styles.sectionLabel}>Contexts, last 7 days</div>
        <div className={styles.contextsGrid}>
          {contexts.map((ctx) => {
            const colors = colorsFor(ctx.color_key);
            const goals = goalsByContext(state, ctx.id);
            const primaryGoal = goals[0];
            const pct = primaryGoal ? goalProgressPct(state, primaryGoal) : 0;
            const label = primaryGoal ? goalStatusLabel(state, primaryGoal, now) : 'No active goal';
            const hrs = hoursByContext[ctx.id] || 0;
            return (
              <div key={ctx.id} className={styles.contextCard} style={{ background: colors.tint }}>
                <div className={styles.contextIconBox}>
                  <div className={styles.contextIconLabel} style={{ color: colors.mid }}>
                    {ctx.name}
                  </div>
                  <ContextIcon name={ctx.icon} size={16} color={colors.mid} />
                </div>
                <div className={styles.contextBody}>
                  <div className={styles.contextTopRow}>
                    <span className={styles.contextStatus} style={{ color: colors.deep }}>
                      {label}
                    </span>
                    <span className={styles.contextPct} style={{ color: colors.mid }}>
                      {pct}%
                    </span>
                  </div>
                  <div className={styles.barTrack}>
                    <div className={styles.barFill} style={{ width: `${pct}%`, background: colors.base }} />
                  </div>
                </div>
                <div className={styles.contextHours}>
                  <div className={styles.contextHoursValue} style={{ color: colors.deep }}>
                    {formatHours(hrs)}
                  </div>
                  <div className={styles.contextHoursLabel} style={{ color: colors.mid }}>
                    this wk
                  </div>
                </div>
              </div>
            );
          })}
          {contexts.length === 0 && (
            <div className={styles.emptyNote}>
              No contexts yet — contexts are managed in Settings, coming next.
            </div>
          )}
        </div>

        <div className={styles.panel} ref={weekRef}>
          <div className={styles.panelTitle}>This week</div>
          {weekDays.map((day) => {
            const blocks = blocksOnDay(state, day);
            const today_ = isSameDay(day, now);
            return (
              <div className={styles.weekRow} key={day.toISOString()}>
                <span className={`${styles.weekDayLabel} ${today_ ? styles.weekDayLabelToday : ''}`}>
                  {weekdayLabel(day)}
                </span>
                <div className={styles.weekChips}>
                  {blocks.length === 0 && <span className={styles.weekEmpty}>—</span>}
                  {blocks.map((b) => {
                    const ctx = contextById(b.context_id);
                    const colors = ctx ? colorsFor(ctx.color_key) : undefined;
                    return (
                      <span
                        key={b.id}
                        className={`${styles.chip} ${b.completed_at ? styles.chipDone : ''}`}
                        style={{ background: colors?.tint, color: colors?.deep }}
                      >
                        <span className={styles.chipDot} style={{ background: colors?.mid }} />
                        {b.title} · {formatTimeShort(b.scheduled_start)}
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className={styles.row2}>
          <div className={styles.panel}>
            <div className={styles.panelTitle}>Statistics on {now.toLocaleDateString(undefined, { month: 'long' })}</div>
            <div className={styles.momentumRingWrap}>
              <svg width="120" height="120" viewBox="0 0 130 130">
                <circle cx="65" cy="65" r="54" fill="none" stroke="var(--surface-tint)" strokeWidth="12" />
                <circle
                  cx="65"
                  cy="65"
                  r="54"
                  fill="none"
                  stroke="var(--sc-base)"
                  strokeWidth="12"
                  strokeDasharray={`${(momentum.momentum / 100) * C} ${C}`}
                  strokeLinecap="round"
                  transform="rotate(-90 65 65)"
                />
                <text x="65" y="62" textAnchor="middle" fontSize="22" fontWeight="700" fill="var(--ink)">
                  {momentum.momentum}%
                </text>
                <text x="65" y="80" textAnchor="middle" fontSize="10" fill="var(--muted-2)">
                  momentum
                </text>
              </svg>
            </div>
            <div className={styles.momentumLegend}>
              <span className={styles.legendItem} style={{ color: 'var(--sc-deep)' }}>
                <span className={styles.legendDot} style={{ background: 'var(--sc-base)' }} />
                Blocks {momentum.blocksPct}%
              </span>
              <span className={styles.legendItem} style={{ color: 'var(--grounds-deep)' }}>
                <span className={styles.legendDot} style={{ background: 'var(--grounds-base)' }} />
                Goals {momentum.goalsPct}%
              </span>
            </div>
          </div>

          <div className={styles.panel}>
            <div className={styles.panelTitle}>
              Upcoming schedule
              <button
                className={styles.seeAll}
                onClick={() => weekRef.current?.scrollIntoView({ behavior: 'smooth' })}
              >
                See all →
              </button>
            </div>
            <div className={styles.listGap}>
              {upcoming.map((b) => {
                const ctx = contextById(b.context_id);
                const colors = ctx ? colorsFor(ctx.color_key) : undefined;
                return (
                  <div className={styles.listRow} key={b.id}>
                    <div className={styles.rowIconBox} style={{ background: colors?.tint }}>
                      {ctx && <ContextIcon name={ctx.icon} size={13} color={colors?.mid} />}
                    </div>
                    <div className={styles.rowBody}>
                      <div className={styles.rowTitle}>{b.title}</div>
                    </div>
                    <span className={styles.rowTime}>{formatTimeShort(b.scheduled_start)}</span>
                  </div>
                );
              })}
              {upcoming.length === 0 && (
                <div className={styles.emptyNote}>Nothing scheduled in the next 7 days.</div>
              )}
            </div>
          </div>
        </div>

        <div className={styles.row2Even}>
          <div className={styles.panel}>
            <div className={styles.panelTitle}>
              Systems
              <Link to="/systems" className={styles.seeAll}>
                Manage →
              </Link>
            </div>
            <div className={`${styles.listGap} gscroll`} style={{ maxHeight: 200, overflowY: 'auto' }}>
              {activeSystems.map((s) => {
                const ctx = contextById(s.context_id);
                const colors = ctx ? colorsFor(ctx.color_key) : undefined;
                return (
                  <div className={styles.listRow} key={s.id}>
                    <div className={styles.rowIconBox} style={{ background: colors?.tint || 'var(--surface-tint)' }}>
                      {ctx ? (
                        <ContextIcon name={ctx.icon} size={13} color={colors?.mid} />
                      ) : (
                        <IconArrowRight size={13} color="var(--muted-2)" />
                      )}
                    </div>
                    <div className={styles.rowBody}>
                      <div className={styles.rowTitle}>{s.title}</div>
                      <div className={styles.rowSub}>{s.recurrence_rule || 'Standing rule · always on'}</div>
                    </div>
                  </div>
                );
              })}
              {activeSystems.length === 0 && <div className={styles.emptyNote}>No systems yet.</div>}
            </div>
          </div>

          <div className={styles.panel}>
            <div className={styles.panelTitle}>Hours by context</div>
            <div className={styles.plannedNote}>
              {formatHours(actualMinutes / 60)} of ~{formatHours(plannedMinutes / 60)} planned this week
            </div>
            <div className={styles.barsRow}>
              {weekDays.map((day) => {
                const dayBlocks = blocksOnDay(state, day);
                const mins = dayBlocks.reduce((sum, b) => sum + blockActualMinutes(state, b, now), 0);
                const maxMins = Math.max(
                  60,
                  ...weekDays.map((d) =>
                    blocksOnDay(state, d).reduce((s, b) => s + blockActualMinutes(state, b, now), 0)
                  )
                );
                const heightPct = Math.max(4, (mins / maxMins) * 100);
                const today_ = isSameDay(day, now);
                return (
                  <div className={styles.barCol} key={day.toISOString()}>
                    <div
                      className={styles.barColBar}
                      style={{ height: `${mins > 0 ? heightPct : 2}%`, opacity: mins > 0 ? 1 : 0.25 }}
                    />
                    <span className={`${styles.barColLabel} ${today_ ? styles.barColLabelToday : ''}`}>
                      {weekdayLabel(day).slice(0, 3)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <aside className={styles.rightRail}>
        <div className={styles.railInner}>
          <div className={styles.profileCard}>
            <div className={styles.avatar}>G</div>
            <div className={styles.profileName}>{greeting.split(' ')[1] === 'morning' ? 'Welcome back' : 'Welcome back'}</div>
            <div className={styles.profileRole}>{contexts[0]?.role_description || 'Your day, at a glance'}</div>
          </div>

          <div>
            <div className={styles.railLabel}>Today's adventure</div>
            {adventure ? (
              (() => {
                const ctx = contextById(adventure.context_id);
                const colors = ctx ? colorsFor(ctx.color_key) : undefined;
                const isRunning = state.activeTimerBlockId === adventure.id;
                return (
                  <div className={styles.adventureCard}>
                    <div className={styles.adventureTopRow}>
                      <span className={styles.adventureEyebrow}>Focus task</span>
                      {ctx && (
                        <span className={styles.adventureBadge} style={{ background: colors?.base }}>
                          {ctx.name}
                        </span>
                      )}
                    </div>
                    <div className={styles.adventureTitle}>{adventure.title}</div>
                    <div className={styles.adventureActions}>
                      <button
                        className={styles.btnPrimary}
                        disabled={isRunning || !!adventure.completed_at}
                        onClick={() => startTimer(adventure.id)}
                      >
                        <IconPlayerPlay size={11} /> {isRunning ? 'Running' : 'Start'}
                      </button>
                      <button className={styles.btnGhost} onClick={swapAdventure}>
                        Swap
                      </button>
                    </div>
                  </div>
                );
              })()
            ) : (
              <div className={styles.adventureCard}>
                <div className={styles.emptyNote}>
                  No adventure picked for today — mark one of today's blocks as the focus from the list below.
                </div>
              </div>
            )}
          </div>

          <div className={styles.timerCard}>
            {runningSession && runningBlock ? (
              <>
                <div className={styles.timerLabel}>{runningBlock.title}</div>
                <div className={styles.timerClock}>
                  {formatClock((liveNow.getTime() - new Date(runningSession.started_at).getTime()) / 1000)}
                </div>
                <button className={styles.stopBtn} onClick={stopTimer}>
                  <IconPlayerStopFilled size={11} /> Stop & log
                </button>
              </>
            ) : (
              <>
                <div className={styles.timerLabel}>No focus session running</div>
                <div className={styles.emptyNote}>Start one from Today's Adventure or Today's Blocks.</div>
              </>
            )}
          </div>

          <div>
            <div className={styles.railLabel}>Time on goal, this wk</div>
            <div className={styles.goalHoursCard}>
              {contexts.map((ctx) => {
                const hrs = hoursByContext[ctx.id] || 0;
                const max = Math.max(0.5, ...contexts.map((c) => hoursByContext[c.id] || 0));
                const colors = colorsFor(ctx.color_key);
                return (
                  <div key={ctx.id}>
                    <div className={styles.goalHoursRow}>
                      <span className={styles.goalHoursName} style={{ color: colors.deep }}>
                        {ctx.name}
                      </span>
                      <span className={styles.goalHoursValue}>{formatHours(hrs)}</span>
                    </div>
                    <div className={styles.goalHoursTrack}>
                      <div className={styles.goalHoursFill} style={{ width: `${(hrs / max) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <div className={styles.railLabel}>Today's blocks</div>
            <div className={styles.blocksList}>
              {today.map((b) => (
                <div className={styles.blockRow} key={b.id}>
                  <button
                    className={`${styles.checkbox} ${b.completed_at ? styles.checkboxDone : ''}`}
                    onClick={() => toggleComplete(b.id)}
                    aria-label={b.completed_at ? 'Mark incomplete' : 'Mark complete'}
                  >
                    {b.completed_at && '✓'}
                  </button>
                  <span className={`${styles.blockTitle} ${b.completed_at ? styles.blockTitleDone : ''}`}>
                    {b.title}
                  </span>
                  {!b.completed_at && state.activeTimerBlockId !== b.id && (
                    <button
                      className={styles.blockStartBtn}
                      onClick={() => startTimer(b.id)}
                      aria-label="Start focus session"
                      title="Start focus session"
                    >
                      <IconPlayerPlay size={12} />
                    </button>
                  )}
                  <span className={styles.blockTime}>{formatTimeShort(b.scheduled_start)}</span>
                </div>
              ))}
              {today.length === 0 && <div className={styles.emptyNote}>Nothing on the books today.</div>}
            </div>
          </div>
        </div>
      </aside>

      {addModalKind === 'goal' && (
        <Modal title="Add a goal" onClose={() => setAddModalKind(null)}>
          <AddGoalForm onDone={() => setAddModalKind(null)} />
        </Modal>
      )}
      {addModalKind === 'block' && (
        <Modal title="Add a block" onClose={() => setAddModalKind(null)}>
          <AddBlockForm onDone={() => setAddModalKind(null)} />
        </Modal>
      )}
      {addModalKind === 'system' && (
        <Modal title="Add a system" onClose={() => setAddModalKind(null)}>
          <AddSystemForm onDone={() => setAddModalKind(null)} />
        </Modal>
      )}
    </div>
  );
}
