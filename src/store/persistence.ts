import type { AppState } from '../types';
import { buildSeedState } from './seed';

const STORAGE_KEY = 'guise-state-v4';

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppState;
      // Guard against states persisted before the profile field existed.
      if (!parsed.profile) {
        parsed.profile = { name: 'Van', role: 'Head of Creatives, SC', photo: null };
      }
      return parsed;
    }
  } catch {
    // fall through to seed
  }
  const seeded = buildSeedState();
  saveState(seeded);
  return seeded;
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // storage full or unavailable — silently skip persistence this write
  }
}
