import { collection, doc, getDoc, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import type { AppState, Profile } from '../types';
import { buildSeedState } from './seed';

/**
 * One Firestore subcollection per record type, scoped under /users/{uid}/...,
 * e.g. /users/{uid}/goals/{goalId}. Keys here double as the collection name
 * and the AppState key, so the sync helpers below can stay generic.
 */
const RECORD_COLLECTIONS = [
  'contexts',
  'goals',
  'blockers',
  'blocks',
  'workSessions',
  'systems',
  'reflections',
  'targets',
  'targetLogEntries',
] as const satisfies readonly (keyof AppState)[];

type RecordCollection = (typeof RECORD_COLLECTIONS)[number];

const DEFAULT_PROFILE: Profile = { name: 'Van', role: 'Head of Creatives, SC', photo: null };

async function getCollectionMap<T>(uid: string, name: RecordCollection): Promise<Record<string, T>> {
  const snap = await getDocs(collection(db, 'users', uid, name));
  const map: Record<string, T> = {};
  snap.forEach((d) => {
    map[d.id] = d.data() as T;
  });
  return map;
}

/**
 * Loads this user's full state from Firestore. If they have no data yet
 * (brand-new uid), seeds a starter dataset and writes it out.
 */
export async function loadState(uid: string): Promise<AppState> {
  const [contexts, goals, blockers, blocks, workSessions, systems, reflections, targets, targetLogEntries] =
    await Promise.all(RECORD_COLLECTIONS.map((name) => getCollectionMap<never>(uid, name)));

  const [profileSnap, appMetaSnap] = await Promise.all([
    getDoc(doc(db, 'users', uid, 'meta', 'profile')),
    getDoc(doc(db, 'users', uid, 'meta', 'app')),
  ]);

  const collections = { contexts, goals, blockers, blocks, workSessions, systems, reflections, targets, targetLogEntries };
  const hasAnyData = Object.values(collections).some((c) => Object.keys(c).length > 0) || profileSnap.exists();

  if (!hasAnyData) {
    const seeded = buildSeedState();
    await saveState(uid, undefined, seeded);
    return seeded;
  }

  return {
    profile: profileSnap.exists() ? (profileSnap.data() as Profile) : DEFAULT_PROFILE,
    ...collections,
    activeTimerBlockId: appMetaSnap.exists() ? (appMetaSnap.data().activeTimerBlockId ?? null) : null,
  } as AppState;
}

/**
 * Writes only what changed since `prev` (reference-equality per top-level
 * slice, since the reducer never mutates a slice it doesn't touch), as a
 * single batched write. Handles record deletions (e.g. reversed target log
 * entries) as well as adds/updates.
 */
export async function saveState(uid: string, prev: AppState | undefined, next: AppState): Promise<void> {
  const batch = writeBatch(db);
  let ops = 0;

  for (const name of RECORD_COLLECTIONS) {
    const prevMap = prev?.[name] as Record<string, unknown> | undefined;
    const nextMap = next[name] as Record<string, unknown>;
    if (prevMap === nextMap) continue;

    for (const id of Object.keys(nextMap)) {
      if (!prevMap || prevMap[id] !== nextMap[id]) {
        batch.set(doc(db, 'users', uid, name, id), nextMap[id] as Record<string, unknown>);
        ops++;
      }
    }
    if (prevMap) {
      for (const id of Object.keys(prevMap)) {
        if (!(id in nextMap)) {
          batch.delete(doc(db, 'users', uid, name, id));
          ops++;
        }
      }
    }
  }

  if (!prev || prev.profile !== next.profile) {
    batch.set(doc(db, 'users', uid, 'meta', 'profile'), next.profile);
    ops++;
  }
  if (!prev || prev.activeTimerBlockId !== next.activeTimerBlockId) {
    batch.set(doc(db, 'users', uid, 'meta', 'app'), { activeTimerBlockId: next.activeTimerBlockId });
    ops++;
  }

  if (ops > 0) await batch.commit();
}
