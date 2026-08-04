import type { ColorKey } from '../types';

export interface ColorRamp {
  base: string;
  tint: string;
  deep: string;
  mid: string;
  /** rgba(mid, 0.15) equivalent, matching the locked reference's progress-track colors exactly. */
  track: string;
}

export const COLOR_RAMPS: Record<ColorKey, ColorRamp> = {
  orange: {
    base: 'var(--sc-base)',
    tint: 'var(--sc-tint)',
    deep: 'var(--sc-deep)',
    mid: 'var(--sc-mid)',
    track: 'rgba(170,85,0,0.15)',
  },
  green: {
    base: 'var(--grounds-base)',
    tint: 'var(--grounds-tint)',
    deep: 'var(--grounds-deep)',
    mid: 'var(--grounds-mid)',
    track: 'rgba(90,107,56,0.15)',
  },
  yellow: {
    base: 'var(--van-base)',
    tint: 'var(--van-tint)',
    deep: 'var(--van-deep)',
    mid: 'var(--van-mid)',
    track: 'rgba(112,86,0,0.15)',
  },
  purple: {
    base: 'var(--me-base)',
    tint: 'var(--me-tint)',
    deep: 'var(--me-deep)',
    mid: 'var(--me-mid)',
    track: 'rgba(41,35,80,0.15)',
  },
};

export function colorsFor(key: ColorKey): ColorRamp {
  return COLOR_RAMPS[key];
}
