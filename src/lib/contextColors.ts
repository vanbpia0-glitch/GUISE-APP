import type { ColorKey } from '../types';

export interface ColorRamp {
  base: string;
  tint: string;
  deep: string;
  mid: string;
}

export const COLOR_RAMPS: Record<ColorKey, ColorRamp> = {
  orange: { base: 'var(--sc-base)', tint: 'var(--sc-tint)', deep: 'var(--sc-deep)', mid: 'var(--sc-mid)' },
  green: {
    base: 'var(--grounds-base)',
    tint: 'var(--grounds-tint)',
    deep: 'var(--grounds-deep)',
    mid: 'var(--grounds-mid)',
  },
  yellow: { base: 'var(--van-base)', tint: 'var(--van-tint)', deep: 'var(--van-deep)', mid: 'var(--van-mid)' },
  purple: { base: 'var(--me-base)', tint: 'var(--me-tint)', deep: 'var(--me-deep)', mid: 'var(--me-mid)' },
};

export function colorsFor(key: ColorKey): ColorRamp {
  return COLOR_RAMPS[key];
}
