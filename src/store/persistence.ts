import type { AppState } from '../types';
import { buildSeedState } from './seed';

const STORAGE_KEY = 'guise-state-v3';

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as AppState;
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
