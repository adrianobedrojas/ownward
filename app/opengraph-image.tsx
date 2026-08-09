import { ImageResponse } from 'next/og';

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '72px',
          background: '#020617',
          color: '#e2e8f0',
          fontFamily: 'sans-serif',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(circle at top right, rgba(34,211,238,0.25), transparent 40%)',
          }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, position: 'relative' }}>
          <div style={{ fontSize: 56, letterSpacing: '0.18em', color: '#22d3ee' }}>OWNWARD HUB</div>
          <div style={{ fontSize: 54, fontWeight: 700, whiteSpace: 'pre-wrap', lineHeight: 1.15 }}>
            {'Run. Grow. Buy. Sell.\nOwn what\'s next.'}
          </div>
          <div style={{ fontSize: 30, color: '#94a3b8' }}>ownwardhub.com</div>
        </div>
      </div>
    ),
    size,
  );
}
