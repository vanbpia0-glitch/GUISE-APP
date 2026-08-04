import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import styles from './GoalDetail.module.css';
import modalStyles from '../../components/Modal.module.css';
import { useStore } from '../../store/StoreContext';
import {
  BLOCKER_RESOLUTION_COPY,
  blocksForGoal,
  goalPaceStatus,
  goalProgressPct,
  nextGoalMilestone,
  openBlockersForGoal,
} from '../../lib/selectors';
import { colorsFor } from '../../lib/contextColors';
import ProgressRing from '../../components/ProgressRing';
import Modal from '../../components/Modal';
import AddBlockerForm from '../../components/AddBlockerForm';
import { ContextIcon, IconChevronLeft, IconFlag, IconPlayerPlay, IconPlus } from '../../lib/icons';
import { formatTimeShort } from '../../lib/format';

const BLOCKER_CARD_BG: Record<string, string> = {
  not_in_control: 'var(--sc-mid)',
  somewhat_in_control: 'var(--grounds-base)',
  in_control: 'var(--me-mid)',
};

export default function GoalDetail() {
  const { goalId } = useParams();
  const { state, dispatch } = useStore();
  const navigate = useNavigate();
  const goal = goalId ? state.goals[goalId] : undefined;
  const [showAddBlocker, setShowAddBlocker] = useState(false);
  const [showAddBlock, setShowAddBlock] = useState(false);

  if (!goal) {
    return (
      <div className={styles.page}>
        <div className={styles.notFound}>
          <p>That goal doesn't exist (or was archived).</p>
          <Link to="/goals" className={styles.back}>
            <IconChevronLeft size={16} /> Back to goals
          </Link>
        </div>
      </div>
    );
  }

  const ctx = state.contexts[goal.context_id];
  const colors = colorsFor(ctx?.color_key || 'orange');
  const pct = goalProgressPct(state, goal);
  const pace = goalPaceStatus(state, goal);
  const blockers = openBlockersForGoal(state, goal.id);
  const blocks = blocksForGoal(state, goal.id).sort(
    (a, b) => new Date(a.scheduled_start).getTime() - new Date(b.scheduled_start).getTime()
  );
  const doneCount = blocks.filter((b) => !!b.completed_at).length;
  const milestone = nextGoalMilestone(state, goal);

  function toggleComplete(id: string) {
    dispatch({ type: 'TOGGLE_BLOCK_COMPLETE', payload: { id } });
  }

  function makeAdventure(id: string) {
    dispatch({ type: 'SET_TODAYS_ADVENTURE', payload: { id } });
  }

  function archiveGoal() {
    dispatch({ type: 'ARCHIVE_GOAL', payload: { id: goal!.id } });
    navigate('/goals');
  }

  return (
    <div className={styles.page}>
      <Link to="/goals" className={styles.back}>
        <IconChevronLeft size={16} /> Back to goals
      </Link>

      <div className={styles.headerCard} style={{ background: colors.tint }}>
        <div className={styles.headerTop}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {ctx && (
              <span className={styles.contextPill} style={{ background: 'rgba(255,255,255,0.6)', color: colors.deep }}>
                <ContextIcon name={ctx.icon} size={12} color={colors.mid} /> {ctx.name}
              </span>
            )}
            <span
              className={styles.whyBadge}
              style={{
                background: goal.why_type === 'pull' ? 'rgba(255,255,255,0.6)' : 'rgba(41,39,35,0.12)',
                color: colors.deep,
              }}
            >
              {goal.why_type === 'pull' ? 'Pull — I want this' : 'Push — I "should"'}
            </span>
          </div>
          <button className={styles.archiveBtn} style={{ color: colors.deep }} onClick={archiveGoal}>
            Archive goal
          </button>
        </div>
        <div className={styles.title} style={{ color: colors.deep }}>
          {goal.title}
        </div>
        <div className={styles.why} style={{ color: colors.mid }}>
          "{goal.why}"
        </div>
      </div>

      <div className={styles.statsRow}>
        <ProgressRing pct={pct} size={64} strokeWidth={8} color={colors.base}>
          <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--ink)' }}>{pct}%</span>
        </ProgressRing>
        <div className={styles.statBlock}>
          <div>
            <div className={styles.statValue}>
              {doneCount}
              <span style={{ fontSize: 11, color: 'var(--muted-2)', fontWeight: 600 }}> / {blocks.length}</span>
            </div>
            <div className={styles.statLabel}>blocks done</div>
          </div>
        </div>
        <div className={styles.statBlock}>
          <div>
            <div className={styles.statValue}>{blockers.length}</div>
            <div className={styles.statLabel}>open blockers</div>
          </div>
        </div>
        <div className={styles.statBlock}>
          <div>
            <div className={styles.statValue} style={{ textTransform: 'capitalize' }}>
              {pace.replace('_', ' ')}
            </div>
            <div className={styles.statLabel}>pace vs quarter</div>
          </div>
        </div>
      </div>

      {milestone && (
        <div className={styles.milestoneCard}>
          <IconFlag size={18} color="var(--van-mid)" />
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--van-deep)' }}>
              Next milestone: {milestone.threshold}%
            </div>
            <div style={{ fontSize: 11, color: 'var(--van-mid)' }}>
              ~{milestone.blocksNeeded} more block{milestone.blocksNeeded === 1 ? '' : 's'} to get there
            </div>
          </div>
        </div>
      )}

      <div className={styles.sectionTitle}>
        Blockers
        <button className={styles.addLink} onClick={() => setShowAddBlocker(true)}>
          <IconPlus size={12} /> Flag one
        </button>
      </div>
      <div className={styles.blockersGrid}>
        {blockers.map((b) => (
          <div className={styles.blockerCard} key={b.id} style={{ background: BLOCKER_CARD_BG[b.category] }}>
            <div>
              <div className={styles.blockerDesc}>{b.description}</div>
              <div className={styles.blockerVerb}>→ {BLOCKER_RESOLUTION_COPY[b.category]}</div>
            </div>
            <button
              className={styles.markHandledBtn}
              onClick={() => dispatch({ type: 'RESOLVE_BLOCKER', payload: { id: b.id } })}
            >
              Mark handled
            </button>
          </div>
        ))}
        {blockers.length === 0 && <div className={styles.emptyNote}>No open blockers on this goal. Good.</div>}
      </div>

      <div className={styles.sectionTitle}>
        Blocks
        <button className={styles.addLink} onClick={() => setShowAddBlock(true)}>
          <IconPlus size={12} /> Add block
        </button>
      </div>
      <div className={styles.blocksList}>
        {blocks.map((b) => (
          <div className={styles.blockRow} key={b.id}>
            <button
              className={`${styles.checkbox} ${b.completed_at ? styles.checkboxDone : ''}`}
              onClick={() => toggleComplete(b.id)}
              aria-label={b.completed_at ? 'Mark incomplete' : 'Mark complete'}
            >
              {b.completed_at && '✓'}
            </button>
            <div className={styles.blockBody}>
              <div className={`${styles.blockTitle} ${b.completed_at ? styles.blockTitleDone : ''}`}>{b.title}</div>
              <div className={styles.blockMeta}>
                {new Date(b.scheduled_start).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} ·{' '}
                {formatTimeShort(b.scheduled_start)}
              </div>
            </div>
            {b.is_todays_adventure && <span className={styles.adventureBadge}>Today's adventure</span>}
            {!b.completed_at && !b.is_todays_adventure && (
              <button className={styles.smallBtn} onClick={() => makeAdventure(b.id)}>
                Make adventure
              </button>
            )}
            {!b.completed_at && (
              <button
                className={styles.smallBtn}
                onClick={() => dispatch({ type: 'START_TIMER', payload: { block_id: b.id } })}
              >
                <IconPlayerPlay size={11} />
              </button>
            )}
          </div>
        ))}
        {blocks.length === 0 && (
          <div className={styles.emptyNote}>
            No Blocks linked yet — this goal isn't real on the calendar until it has some.
          </div>
        )}
      </div>

      {showAddBlocker && (
        <Modal title="Flag a blocker" onClose={() => setShowAddBlocker(false)}>
          <AddBlockerForm goalId={goal.id} onDone={() => setShowAddBlocker(false)} />
        </Modal>
      )}
      {showAddBlock && (
        <Modal title="Add a block" onClose={() => setShowAddBlock(false)}>
          <AddBlockForm goal={goal} onDone={() => setShowAddBlock(false)} />
        </Modal>
      )}
    </div>
  );
}

function AddBlockForm({ goal, onDone }: { goal: { id: string; context_id: string }; onDone: () => void }) {
  const { dispatch } = useStore();
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('10:00');

  const canSubmit = title.trim().length > 0;

  function submit() {
    if (!canSubmit) return;
    const scheduled_start = new Date(`${date}T${start}:00`).toISOString();
    const scheduled_end = new Date(`${date}T${end}:00`).toISOString();
    dispatch({
      type: 'ADD_BLOCK',
      payload: {
        title: title.trim(),
        context_id: goal.context_id,
        goal_id: goal.id,
        source_type: 'goal',
        scheduled_start,
        scheduled_end,
      },
    });
    onDone();
  }

  return (
    <div>
      <div className={modalStyles.field}>
        <label className={modalStyles.label}>Title</label>
        <input className={modalStyles.input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What are you doing?" />
      </div>
      <div className={modalStyles.field}>
        <label className={modalStyles.label}>Date</label>
        <input type="date" className={modalStyles.input} value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <div className={modalStyles.field} style={{ flex: 1 }}>
          <label className={modalStyles.label}>Start</label>
          <input type="time" className={modalStyles.input} value={start} onChange={(e) => setStart(e.target.value)} />
        </div>
        <div className={modalStyles.field} style={{ flex: 1 }}>
          <label className={modalStyles.label}>End</label>
          <input type="time" className={modalStyles.input} value={end} onChange={(e) => setEnd(e.target.value)} />
        </div>
      </div>
      <button className={modalStyles.submitBtn} disabled={!canSubmit} onClick={submit}>
        Add block
      </button>
    </div>
  );
}
