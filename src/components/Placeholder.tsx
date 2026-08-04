import type { ReactNode } from 'react';

export default function Placeholder({ title, note }: { title: string; note?: ReactNode }) {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: 40,
        textAlign: 'center',
        color: 'var(--muted)',
      }}
    >
      <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--ink)' }}>{title}</div>
      <div style={{ fontSize: 14, maxWidth: 380, lineHeight: 1.5 }}>
        {note ?? 'This screen is designed and next up in the build queue — not wired yet in this pass.'}
      </div>
    </div>
  );
}
