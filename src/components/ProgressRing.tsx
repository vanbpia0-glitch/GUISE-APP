import type { ReactNode } from 'react';

export default function ProgressRing({
  pct,
  size = 34,
  strokeWidth = 4,
  color,
  trackColor = 'rgba(41,39,35,0.08)',
  children,
}: {
  pct: number;
  size?: number;
  strokeWidth?: number;
  color: string;
  trackColor?: string;
  children?: ReactNode;
}) {
  const r = size / 2 - strokeWidth;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="white" stroke={trackColor} strokeWidth={strokeWidth} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={`${(clamped / 100) * c} ${c}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      {children && (
        <foreignObject x="0" y="0" width={size} height={size}>
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {children}
          </div>
        </foreignObject>
      )}
    </svg>
  );
}
