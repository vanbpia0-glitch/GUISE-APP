import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import styles from './Goals.module.css';
import { useStore } from '../../store/StoreContext';
import {
  BLOCKER_RESOLUTION_COPY,
  activeGoals,
  allOpenBlockers,
  blockersResolvedThisWeek,
  blocksCompletedThisWeek,
  blocksForGoal,
  currentStreakDays,
  goalProgressPct,
  goalStatusLabel,
  motivationMix,
  nextGoalMilestone,
  openBlockersForGoal,
  quarterProgress,
} from '../../lib/selectors';
import { quarterDateRange, quarterLabel } from '../../lib/date';
import { colorsFor } from '../../lib/contextColors';
import { IconArrowsSort, IconFlag, IconFlame, IconPlus, IconTrophy } from '../../lib/icons';
import Modal from '../../components/Modal';
import AddGoalForm from '../../components/AddGoalForm';
import AddBlockerForm from '../../components/AddBlockerForm';
import type { Goal } from '../../types';

const BLOCKER_CARD_BG: Record<string, string> = {
  not_in_control: 'var(--sc-mid)',
  somewhat_in_control: 'var(--grounds-base)',
  in_control: 'var(--me-mid)',
};
const BLOCKER_CARD_TEXT: Record<string, string> = {
  not_in_control: 'var(--sc-deep)',
  somewhat_in_control: 'var(--grounds-deep)',
  in_control: 'var(--me-deep)',
};

export default function GoalsList() {
  const { state, dispatch } = useStore();
  const navigate = useNavigate();
  const now = new Date();
  const currentQuarter = quarterLabel(now);

  const [showAddGoal, setShowAddGoal] = useState(false);
  const [showAddBlocker, setShowAddBlocker] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [showResolved, setShowResolved] = useState(false);

  const quarterGoals = useMemo(
    () => activeGoals(state).filter((g) => g.quarter === currentQuarter),
    [state, currentQuarter]
  );
  const openBlockers = allOpenBlockers(state);
  const resolvedBlockers = Object.values(state.blockers).filter((b) => b.status === 'resolved');
  const qp = quarterProgress(state, currentQuarter, now);
  const mix = motivationMix(state);
  const streak = currentStreakDays(state, now);
  const completedThisWeek = blocksCompletedThisWeek(state, now);
  const resolvedThisWeek = blockersResolvedThisWeek(state, now);

  const archivedGoals = Object.values(state.goals).filter(
    (g) => g.status !== 'active' || g.quarter !== currentQuarter
  );

  const notInControl = openBlockers.filter((b) => b.category === 'not_in_control').length;
  const somewhat = openBlockers.filter((b) => b.category === 'somewhat_in_control').length;
  const inControl = openBlockers.filter((b) => b.category === 'in_control').length;

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = quarterGoals.map((g) => g.id);
    const oldIndex = ids.indexOf(active.id as string);
    const newIndex = ids.indexOf(over.id as string);
    if (oldIndex < 0 || newIndex < 0) return;
    const reordered = arrayMove(ids, oldIndex, newIndex);
    dispatch({ type: 'REORDER_GOALS', payload: { orderedIds: reordered } });
  }

  const achievements: { icon: JSX.Element; label: string }[] = [];
  if (streak >= 2) achievements.push({ icon: <IconFlame size={17} color="white" />, label: `${streak}-day streak` });
  if (completedThisWeek > 0)
    achievements.push({
      icon: <span style={{ color: 'white', fontWeight: 700 }}>{completedThisWeek}</span>,
      label: `blocks done this wk`,
    });
  if (resolvedThisWeek > 0)
    achievements.push({
      icon: <IconFlag size={15} color="white" />,
      label: `${resolvedThisWeek} blocker${resolvedThisWeek > 1 ? 's' : ''} resolved`,
    });
  const bestGoal = quarterGoals
    .map((g) => ({ g, pct: goalProgressPct(state, g) }))
    .filter((x) => x.pct >= 75)
    .sort((a, b) => b.pct - a.pct)[0];
  if (bestGoal) achievements.push({ icon: <IconTrophy size={15} color="white" />, label: `${bestGoal.g.title} at ${bestGoal.pct}%` });

  function timelineBar(goal: Goal) {
    const { start, end } = quarterDateRange(goal.quarter);
    const totalMs = end.getTime() - start.getTime();
    const blocks = blocksForGoal(state, goal.id).filter((b) => {
      const t = new Date(b.scheduled_start).getTime();
      return t >= start.getTime() && t <= end.getTime();
    });
    if (blocks.length === 0) return null;
    const times = blocks.map((b) => new Date(b.scheduled_start).getTime());
    const minT = Math.min(...times);
    const maxT = Math.max(...times);
    const leftPct = ((minT - start.getTime()) / totalMs) * 100;
    const widthPct = Math.max(4, ((maxT - minT) / totalMs) * 100);
    return { leftPct, widthPct };
  }

  return (
    <div className={styles.page}>
      <div className={styles.main}>
        <div className={styles.header}>
          <div>
            <div className={styles.eyebrow}>{currentQuarter.replace('-', ' ')}</div>
            <div className={styles.title}>Your goals</div>
          </div>
          <button className={styles.addBtn} onClick={() => setShowAddGoal(true)}>
            <IconPlus size={13} /> Add goal
          </button>
        </div>

        <div className={styles.darkCard}>
          <div className={styles.darkCardHeader}>
            <span className={styles.darkCardTitle}>Achievements this week</span>
          </div>
          {achievements.length > 0 ? (
            <div className={styles.achievementsGrid}>
              {achievements.slice(0, 6).map((a, i) => (
                <div className={styles.achievementTile} key={i}>
                  <div className={styles.achievementIcon} style={{ background: 'rgba(255,255,255,0.12)' }}>
                    {a.icon}
                  </div>
                  <div className={styles.achievementLabel}>{a.label}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.emptyAchievements}>
              Good — nothing to show yet this week. Get a block done and it'll show up here.
            </div>
          )}
        </div>

        <div className={styles.statsTrio}>
          <div className={styles.statTile} style={{ background: 'var(--sc-base)', color: 'white' }}>
            <div className={styles.statTileValue}>{quarterGoals.length}</div>
            <div className={styles.statTileLabel}>active goals</div>
          </div>
          <div className={styles.statTile} style={{ background: 'var(--grounds-base)', color: 'white' }}>
            <div className={styles.statTileValue}>{qp.needAttention}</div>
            <div className={styles.statTileLabel}>need attention</div>
          </div>
          <div className={styles.statTile} style={{ background: 'var(--van-base)', color: 'var(--ink)' }}>
            <div className={styles.statTileValue}>{qp.elapsedPct}%</div>
            <div className={styles.statTileLabel}>quarter elapsed</div>
          </div>
        </div>

        <div className={styles.priorityHeader}>
          <span className={styles.priorityLabel}>Priority order</span>
          <span className={styles.reorderHint}>
            <IconArrowsSort size={12} /> Drag to reorder
          </span>
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={quarterGoals.map((g) => g.id)} strategy={rectSortingStrategy}>
            <div className={styles.priorityGrid}>
              {quarterGoals.map((g, idx) => (
                <SortableGoalCard key={g.id} goal={g} rank={idx + 1} onOpen={() => navigate(`/goals/${g.id}`)} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
        {quarterGoals.length === 0 && (
          <div className={styles.emptyNote} style={{ marginBottom: 16 }}>
            No active goals this quarter yet — add one to turn ambition into calendar time.
          </div>
        )}

        <button className={styles.archiveLink} onClick={() => setShowArchive((v) => !v)}>
          <IconFlag size={13} /> {showArchive ? 'Hide' : 'View'} archive ({archivedGoals.length})
        </button>
        {showArchive && (
          <div className={styles.archivedList}>
            {archivedGoals.length === 0 && <div className={styles.emptyNote}>Nothing archived yet.</div>}
            {archivedGoals.map((g) => (
              <div className={styles.archivedRow} key={g.id}>
                <span>{g.title}</span>
                <span>
                  {g.quarter} · {g.status}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className={styles.darkCard} style={{ marginBottom: 0 }}>
          <div className={styles.darkCardHeader}>
            <span className={styles.priorityLabel} style={{ color: 'var(--faint)' }}>
              Timeline this quarter
            </span>
          </div>
          <div>
            {quarterGoals.map((g) => {
              const bar = timelineBar(g);
              const ctx = state.contexts[g.context_id];
              const colors = ctx ? colorsFor(ctx.color_key) : undefined;
              return (
                <div className={styles.timelineRow} key={g.id}>
                  <span className={styles.timelineGoalLabel}>{g.title}</span>
                  <div className={styles.timelineTrack}>
                    {bar && (
                      <div
                        className={styles.timelineBar}
                        style={{ left: `${bar.leftPct}%`, width: `${bar.widthPct}%`, background: colors?.base }}
                      >
                        <span className={styles.timelineBarLabel}>{g.title}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {quarterGoals.every((g) => !timelineBar(g)) && (
              <div className={styles.emptyAchievements}>
                No Blocks scheduled against these goals yet — the timeline fills in once you do.
              </div>
            )}
          </div>
        </div>
      </div>

      <aside className={styles.sidebar}>
        <div className={styles.quarterCard}>
          <div className={styles.quarterHeader}>
            <span className={styles.quarterHeaderLabel}>Quarter progress</span>
            <span className={styles.streakBadge}>
              <IconFlame size={13} /> {streak}d
            </span>
          </div>
          <div className={styles.quarterRingWrap}>
            <svg width="150" height="150" viewBox="0 0 160 160">
              <circle cx="80" cy="80" r="66" fill="none" stroke="var(--surface-tint)" strokeWidth="15" />
              <circle
                cx="80"
                cy="80"
                r="66"
                fill="none"
                stroke="var(--grounds-base)"
                strokeWidth="15"
                strokeDasharray={`${(qp.avgProgress / 100) * 2 * Math.PI * 66} ${2 * Math.PI * 66}`}
                strokeLinecap="round"
                transform="rotate(-90 80 80)"
              />
              <text x="80" y="76" textAnchor="middle" fontSize="30" fontWeight="700" fill="var(--ink)">
                {qp.avgProgress}%
              </text>
              <text x="80" y="98" textAnchor="middle" fontSize="11" fill="var(--muted-2)">
                avg progress
              </text>
            </svg>
          </div>
          <div className={styles.quarterLegend}>
            <span className={styles.legendItem} style={{ color: 'var(--grounds-mid)' }}>
              <span className={styles.legendDot} style={{ background: 'var(--grounds-base)' }} />
              {qp.onTrack} on track
            </span>
            <span className={styles.legendItem} style={{ color: 'var(--sc-mid)' }}>
              <span className={styles.legendDot} style={{ background: 'var(--sc-mid)' }} />
              {qp.needAttention} need attention
            </span>
          </div>
        </div>

        <div className={styles.triageCard}>
          <div className={styles.triageLabel}>Blocker triage</div>
          <div className={styles.triageCount}>{openBlockers.length} open blockers</div>
          <div className={styles.triageStats}>
            <div>
              <div className={styles.triageStatLabel}>Not in control</div>
              <div className={styles.triageStatValue} style={{ color: 'var(--sc-base)' }}>
                {notInControl}
              </div>
            </div>
            <div>
              <div className={styles.triageStatLabel}>Somewhat</div>
              <div className={styles.triageStatValue} style={{ color: 'var(--van-base)' }}>
                {somewhat}
              </div>
            </div>
            <div>
              <div className={styles.triageStatLabel}>In control</div>
              <div className={styles.triageStatValue} style={{ color: 'var(--me-base)' }}>
                {inControl}
              </div>
            </div>
          </div>
        </div>

        {openBlockers.map((b) => {
          const goal = state.goals[b.goal_id];
          return (
            <div className={styles.blockerCard} key={b.id} style={{ background: BLOCKER_CARD_BG[b.category] }}>
              <div className={styles.blockerCardTop}>
                <span className={styles.blockerCardGoal}>{goal?.title || 'Unknown goal'}</span>
                <span className={styles.blockerCardBadge}>{b.category.replace(/_/g, ' ')}</span>
              </div>
              <div className={styles.blockerCardDesc}>{b.description}</div>
              <div className={styles.blockerCardVerb}>→ {BLOCKER_RESOLUTION_COPY[b.category]}</div>
              <button
                className={styles.markHandledBtn}
                style={{ color: BLOCKER_CARD_TEXT[b.category] }}
                onClick={() => dispatch({ type: 'RESOLVE_BLOCKER', payload: { id: b.id } })}
              >
                Mark handled
              </button>
            </div>
          );
        })}

        <button className={styles.flagBlockerBtn} onClick={() => setShowAddBlocker(true)}>
          <IconFlag size={13} /> Flag a new blocker
        </button>

        <div className={styles.tintCard} style={{ background: 'var(--van-tint)' }}>
          <div className={styles.tintCardTitle} style={{ color: 'var(--van-mid)' }}>
            Upcoming milestones
          </div>
          {quarterGoals
            .map((g) => ({ g, m: nextGoalMilestone(state, g) }))
            .filter((x) => x.m)
            .slice(0, 3)
            .map(({ g, m }) => (
              <div className={styles.milestoneRow} key={g.id}>
                <IconFlag size={12} color="var(--sc-mid)" />
                <span className={styles.milestoneLabel} style={{ color: 'var(--van-deep)' }}>
                  {g.title} hits {m!.threshold}%
                </span>
                <span className={styles.milestoneMeta} style={{ color: 'var(--van-mid)' }}>
                  ~{m!.blocksNeeded} block{m!.blocksNeeded === 1 ? '' : 's'}
                </span>
              </div>
            ))}
          {quarterGoals.every((g) => !nextGoalMilestone(state, g)) && (
            <div className={styles.emptyNote}>Schedule Blocks against a goal to see milestones here.</div>
          )}
        </div>

        <div className={styles.tintCard} style={{ background: 'var(--me-tint)' }}>
          <div className={styles.tintCardTitle} style={{ color: 'var(--me-mid)' }}>
            Goal motivation mix
          </div>
          <div className={styles.motivationBarTrack}>
            <div style={{ width: `${mix.pullPct}%`, background: 'var(--me-base)' }} />
            <div style={{ width: `${mix.pushPct}%`, background: 'var(--me-deep)' }} />
          </div>
          <div className={styles.motivationLegend}>
            <span style={{ color: 'var(--me-mid)' }}>● {mix.pullPct}% pull-motivated</span>
            <span style={{ color: 'var(--me-deep)' }}>● {mix.pushPct}% push</span>
          </div>
          {mix.pushGoals.length > 0 && (
            <div className={styles.pushFlag} style={{ color: 'var(--me-mid)' }}>
              Goals people "should" want fail more than goals they want — {mix.pushGoals.map((g) => g.title).join(', ')}{' '}
              {mix.pushGoals.length > 1 ? 'are' : 'is'} worth a second look.
            </div>
          )}
        </div>

        <button className={styles.resolvedHistoryLink} onClick={() => setShowResolved((v) => !v)}>
          {showResolved ? 'Hide' : 'View'} resolved history ({resolvedBlockers.length})
        </button>
        {showResolved && (
          <div className={styles.resolvedList}>
            {resolvedBlockers.length === 0 && <div className={styles.emptyNote}>Nothing resolved yet.</div>}
            {resolvedBlockers.map((b) => (
              <div className={styles.resolvedRow} key={b.id}>
                {b.description}
              </div>
            ))}
          </div>
        )}
      </aside>

      {showAddGoal && (
        <Modal title="Add a goal" onClose={() => setShowAddGoal(false)}>
          <AddGoalForm onDone={() => setShowAddGoal(false)} />
        </Modal>
      )}
      {showAddBlocker && (
        <Modal title="Flag a blocker" onClose={() => setShowAddBlocker(false)}>
          <AddBlockerForm onDone={() => setShowAddBlocker(false)} />
        </Modal>
      )}
    </div>
  );
}

function SortableGoalCard({ goal, rank, onOpen }: { goal: Goal; rank: number; onOpen: () => void }) {
  const { state } = useStore();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: goal.id });
  const ctx = state.contexts[goal.context_id];
  const colors = ctx ? colorsFor(ctx.color_key) : undefined;
  const pct = goalProgressPct(state, goal);
  const label = goalStatusLabel(state, goal);
  const hasBlockers = openBlockersForGoal(state, goal.id).length > 0;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={styles.sortableWrapper}
      data-testid="goal-card"
      data-goal-id={goal.id}
    >
      <button
        className={`${styles.goalCard} ${isDragging ? styles.goalCardDragging : ''}`}
        style={{ background: colors?.tint }}
        onClick={onOpen}
        type="button"
      >
        <div className={styles.rankBadge} style={{ color: colors?.mid }}>
          {rank}
        </div>
        <svg width="34" height="34" viewBox="0 0 38 38" style={{ flexShrink: 0 }}>
          <circle cx="19" cy="19" r="16" fill="white" />
          <circle
            cx="19"
            cy="19"
            r="16"
            fill="none"
            stroke={colors?.base}
            strokeWidth="4"
            strokeDasharray={`${(pct / 100) * 100.5} 100.5`}
            strokeLinecap="round"
            transform="rotate(-90 19 19)"
          />
        </svg>
        <div className={styles.goalCardBody}>
          <div className={styles.goalCardTitle} style={{ color: colors?.deep }}>
            {goal.title}
          </div>
          <div className={styles.goalCardStatus} style={{ color: colors?.mid }}>
            {label}
          </div>
        </div>
        {hasBlockers && <span className={styles.blockerDot} />}
      </button>
    </div>
  );
}
