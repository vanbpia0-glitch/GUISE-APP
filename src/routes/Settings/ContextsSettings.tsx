import { useState } from 'react';
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import styles from './ContextsSettings.module.css';
import { useStore } from '../../store/StoreContext';
import { activeContexts, goalsByContext, hoursByContextThisWeek } from '../../lib/selectors';
import { colorsFor, COLOR_RAMPS, shadesFor } from '../../lib/contextColors';
import { CONTEXT_ICONS, ContextIcon, IconArchive, IconGripVertical, IconPlus } from '../../lib/icons';
import { relativeDayLabel } from '../../lib/date';
import Modal from '../../components/Modal';
import AddContextForm from '../../components/AddContextForm';
import type { ColorKey, GuiseContext } from '../../types';

const ICON_NAMES = Object.keys(CONTEXT_ICONS);
const COLOR_KEYS: ColorKey[] = ['orange', 'green', 'yellow', 'purple'];

export default function ContextsSettings() {
  const { state, dispatch } = useStore();
  const now = new Date();
  const [showAdd, setShowAdd] = useState(false);
  const contexts = activeContexts(state);
  const archived = Object.values(state.contexts).filter((c) => !c.active);

  const totalGoals = contexts.reduce((sum, c) => sum + goalsByContext(state, c.id).length, 0);
  const totalSystems = contexts.reduce(
    (sum, c) => sum + Object.values(state.systems).filter((s) => s.active && s.context_id === c.id).length,
    0
  );

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = contexts.map((c) => c.id);
    const oldIndex = ids.indexOf(active.id as string);
    const newIndex = ids.indexOf(over.id as string);
    if (oldIndex < 0 || newIndex < 0) return;
    dispatch({ type: 'REORDER_CONTEXTS', payload: { orderedIds: arrayMove(ids, oldIndex, newIndex) } });
  }

  const C = 2 * Math.PI * 62;
  const ringPct = contexts.length === 0 ? 0 : 100;

  return (
    <div className={styles.page}>
      <div className={styles.headerRow}>
        <div>
          <div className={styles.title}>Your contexts</div>
          <div className={styles.subtitle}>
            These are your hats — every field below is yours to change. Rename, recolor, re-icon, or archive anytime.
            Nothing tagged to a context ever gets lost.
          </div>
          <div className={styles.dragHint}>
            <IconGripVertical size={12} /> Drag any card to reorder how hats appear across the app
          </div>
        </div>
        <div className={styles.overviewCard}>
          <svg width="118" height="76" viewBox="0 0 140 90">
            <defs>
              <linearGradient id="hatsRingGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="var(--grounds-base)" />
                <stop offset="35%" stopColor="var(--me-base)" />
                <stop offset="70%" stopColor="var(--sc-base)" />
                <stop offset="100%" stopColor="var(--van-base)" />
              </linearGradient>
            </defs>
            <path d="M8 78 A62 62 0 0 1 132 78" stroke="var(--surface-tint)" strokeWidth="14" fill="none" strokeLinecap="round" />
            <path
              d="M8 78 A62 62 0 0 1 132 78"
              stroke="url(#hatsRingGrad)"
              strokeWidth="14"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${(ringPct / 100) * C} ${C}`}
            />
            <text x="70" y="66" textAnchor="middle" fontSize="24" fontWeight="800" fill="var(--ink)">
              {contexts.length}
            </text>
          </svg>
          <div>
            <div className={styles.overviewLabel}>ACTIVE HATS</div>
            <div className={styles.overviewMeta}>
              {totalGoals} goal{totalGoals === 1 ? '' : 's'} · {totalSystems} system{totalSystems === 1 ? '' : 's'} tagged
            </div>
            <div className={styles.overviewMeta2}>
              {archived.length} archived, preserved
            </div>
          </div>
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={contexts.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          <div className={styles.list}>
            {contexts.map((ctx) => (
              <SortableContextCard key={ctx.id} ctx={ctx} now={now} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      {contexts.length === 0 && <div className={styles.emptyNote}>No active contexts. Add your first one below.</div>}

      <div className={styles.addBox}>
        <button className={styles.addBoxInner} onClick={() => setShowAdd(true)} type="button">
          <div className={styles.addIconBox}>
            <IconPlus size={17} color="var(--muted)" />
          </div>
          <span className={styles.addLabel}>Add a new context</span>
        </button>
      </div>

      {archived.length > 0 && (
        <>
          <div className={styles.archivedHeader}>
            <IconArchive size={14} /> Archived
          </div>
          {archived.map((ctx) => {
            const goalCount = Object.values(state.goals).filter((g) => g.context_id === ctx.id).length;
            const systemCount = Object.values(state.systems).filter((s) => s.context_id === ctx.id).length;
            return (
              <div className={styles.archivedRow} key={ctx.id}>
                <div className={styles.archivedIconBox}>
                  <ContextIcon name={ctx.icon} size={18} color="var(--muted-2)" />
                </div>
                <div style={{ flex: 1 }}>
                  <div className={styles.archivedName}>{ctx.name}</div>
                  <div className={styles.archivedMeta}>
                    Archived · {goalCount} goal{goalCount === 1 ? '' : 's'}, {systemCount} system{systemCount === 1 ? '' : 's'} preserved
                  </div>
                </div>
                <button
                  className={styles.restoreBtn}
                  onClick={() => dispatch({ type: 'RESTORE_CONTEXT', payload: { id: ctx.id } })}
                >
                  Restore
                </button>
              </div>
            );
          })}
        </>
      )}

      {showAdd && (
        <Modal title="Add a context" onClose={() => setShowAdd(false)}>
          <AddContextForm onDone={() => setShowAdd(false)} />
        </Modal>
      )}
    </div>
  );
}

function SortableContextCard({ ctx, now }: { ctx: GuiseContext; now: Date }) {
  const { state, dispatch } = useStore();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: ctx.id });
  const colors = colorsFor(ctx.color_key);

  const [name, setName] = useState(ctx.name);
  const [role, setRole] = useState(ctx.role_description || '');
  const [icon, setIcon] = useState(ctx.icon);
  const [colorKey, setColorKey] = useState(ctx.color_key);
  const [iconExpanded, setIconExpanded] = useState(false);

  const ICON_COLLAPSED_COUNT = 6;
  const shownIcons = iconExpanded ? ICON_NAMES : ICON_NAMES.slice(0, ICON_COLLAPSED_COUNT);
  const hiddenIconCount = ICON_NAMES.length - ICON_COLLAPSED_COUNT;

  const goalCount = goalsByContext(state, ctx.id).length;
  const systemCount = Object.values(state.systems).filter((s) => s.active && s.context_id === ctx.id).length;
  const hours = hoursByContextThisWeek(state, now)[ctx.id] || 0;

  const lastCompleted = Object.values(state.blocks)
    .filter((b) => b.context_id === ctx.id && b.completed_at)
    .map((b) => new Date(b.completed_at!).getTime());
  const activeLabel = lastCompleted.length > 0 ? `Active ${relativeDayLabel(new Date(Math.max(...lastCompleted)), now)}` : 'No activity yet';

  const style = { transform: CSS.Transform.toString(transform), transition };

  function save() {
    dispatch({
      type: 'UPDATE_CONTEXT',
      payload: { id: ctx.id, patch: { name: name.trim() || ctx.name, role_description: role.trim(), icon, color_key: colorKey } },
    });
  }

  return (
    <div ref={setNodeRef} style={style} className={styles.sortableWrapper}>
      <div
        className={`${styles.card} ${isDragging ? styles.cardDragging : ''}`}
        style={{ background: colors.tint }}
      >
        <div className={styles.dragHandleWrap} {...attributes} {...listeners}>
          <IconGripVertical size={18} color="rgba(41,39,35,0.25)" />
        </div>
        <div className={styles.cardBody}>
          <div className={styles.fieldGroup}>
            <div className={styles.fieldLabel} style={{ color: colors.mid }}>
              Name
            </div>
            <input className={styles.input} value={name} onChange={(e) => setName(e.target.value)} style={{ color: colors.deep }} />
            <div className={styles.fieldLabel} style={{ color: colors.mid, margin: '12px 0 8px' }}>
              Role / description
            </div>
            <input
              className={styles.input}
              value={role}
              onChange={(e) => setRole(e.target.value)}
              style={{ color: colors.deep, fontSize: 12 }}
            />
            <div className={styles.activeLabel} style={{ color: colors.mid }}>
              {activeLabel}
            </div>
          </div>

          <div className={styles.fieldGroup}>
            <div className={styles.fieldLabel} style={{ color: colors.mid }}>
              Icon
            </div>
            <div className={styles.iconRow}>
              {shownIcons.map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`${styles.iconPick} ${icon === n ? styles.iconPickSelected : ''}`}
                  onClick={() => setIcon(n)}
                >
                  <ContextIcon name={n} size={16} color={icon === n ? colors.mid : 'var(--muted-2)'} />
                </button>
              ))}
              {hiddenIconCount > 0 && (
                <button
                  type="button"
                  className={styles.iconMoreBtn}
                  style={{ color: colors.mid }}
                  onClick={() => setIconExpanded((v) => !v)}
                >
                  {iconExpanded ? 'Less' : `+${hiddenIconCount}`}
                </button>
              )}
            </div>
          </div>

          <div className={styles.fieldGroup}>
            <div className={styles.fieldLabel} style={{ color: colors.mid }}>
              Color · locked palette
            </div>
            <div className={styles.swatchRow}>
              {COLOR_KEYS.map((key) => (
                <button
                  key={key}
                  type="button"
                  className={`${styles.swatch} ${colorKey === key ? styles.swatchSelected : ''}`}
                  style={{ background: COLOR_RAMPS[key].base, color: COLOR_RAMPS[key].base }}
                  onClick={() => setColorKey(key)}
                  aria-label={key}
                />
              ))}
            </div>
            <div className={styles.rampStrip}>
              {shadesFor(colorKey).map((shade, i) => (
                <span key={i} className={styles.rampSwatch} style={{ background: shade }} />
              ))}
            </div>
          </div>

          <div className={styles.statsCol}>
            <div className={styles.statsRow}>
              <div>
                <div className={styles.statValue} style={{ color: colors.deep }}>
                  {String(goalCount).padStart(2, '0')}
                </div>
                <div className={styles.statBar} style={{ background: colors.base }} />
                <div className={styles.statLabel} style={{ color: colors.mid }}>
                  goal{goalCount === 1 ? '' : 's'}
                </div>
              </div>
              <div>
                <div className={styles.statValue} style={{ color: colors.deep }}>
                  {String(systemCount).padStart(2, '0')}
                </div>
                <div className={styles.statBar} style={{ background: colors.base }} />
                <div className={styles.statLabel} style={{ color: colors.mid }}>
                  system{systemCount === 1 ? '' : 's'}
                </div>
              </div>
              <div>
                <div className={styles.statValue} style={{ color: colors.deep }}>
                  {hours}
                  <span style={{ fontSize: 11 }}>h</span>
                </div>
                <div className={styles.statBar} style={{ background: colors.base }} />
                <div className={styles.statLabel} style={{ color: colors.mid }}>
                  this wk
                </div>
              </div>
            </div>
            <div className={styles.cardActions}>
              <button
                className={styles.archiveBtn}
                style={{ color: colors.mid }}
                onClick={() => dispatch({ type: 'ARCHIVE_CONTEXT', payload: { id: ctx.id } })}
              >
                <IconArchive size={13} /> Archive
              </button>
              <button className={styles.saveBtn} onClick={save}>
                Save
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
