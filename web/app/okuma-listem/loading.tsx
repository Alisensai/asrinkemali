import React from 'react';

export default function Loading() {
  return (
    <div
      style={{
        maxWidth: '1280px',
        margin: '0 auto',
        padding: '2rem 1rem',
        color: 'var(--cream, #f4e8d6)',
      }}
    >
      <div
        role="status"
        aria-live="polite"
        style={{
          background: 'rgba(24, 18, 18, 0.85)',
          border: '1px solid rgba(209, 163, 109, 0.3)',
          borderRadius: '8px',
          padding: '1.5rem',
          textAlign: 'center',
          color: 'var(--gold, #d1a36d)',
        }}
      >
        Kişisel koleksiyonlar yükleniyor…
      </div>
    </div>
  );
}
