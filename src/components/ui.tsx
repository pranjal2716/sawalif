import { useEffect, useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import { db } from '../lib/db';

export const Icon = {
  play: <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l13-7.5z" fill="currentColor" /></svg>,
  playSmall: <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l13-7.5z" fill="currentColor" /></svg>,
  mic: <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor" /><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" /></svg>,
  flag: <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 21V4M5 4h11l-2 4 2 4H5" stroke="currentColor" stroke-width="2" fill="none" stroke-linejoin="round" /></svg>,
  stop: <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" /></svg>
};

export function PlayButton({ onPlay, small, label = 'Play audio' }: { onPlay: () => Promise<void> | void; small?: boolean; label?: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      class={`play ${small ? 'small' : ''} ${busy ? 'playing' : ''}`}
      aria-label={label}
      title={label}
      onClick={async () => {
        setBusy(true);
        try {
          await onPlay();
        } finally {
          setBusy(false);
        }
      }}
    >
      {small ? Icon.playSmall : Icon.play}
    </button>
  );
}

/** Keyboard shortcuts while a component is mounted. Ignored while typing in a field. */
export function useKeys(map: Record<string, () => void>, deps: any[]) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) return;
      const key = e.key === ' ' ? 'Space' : e.key;
      const f = map[key] ?? map[key.toLowerCase()];
      if (f) {
        e.preventDefault();
        f();
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, deps);
}

export function FlagButton({ itemId }: { itemId: string }) {
  const [flagged, setFlagged] = useState(false);
  useEffect(() => {
    db.flags.get(itemId).then(f => setFlagged(!!f));
  }, [itemId]);
  return (
    <button
      class="btn quiet small"
      title="Mark this phrase for a native speaker to check"
      onClick={async () => {
        if (flagged) {
          await db.flags.delete(itemId);
          setFlagged(false);
        } else {
          const note = window.prompt('What seems off? (optional)') ?? '';
          await db.flags.put({ itemId, note, ts: Date.now() });
          setFlagged(true);
        }
      }}
    >
      {Icon.flag} {flagged ? 'Flagged for checking' : 'Flag for checking'}
    </button>
  );
}

export function Banner({ children, warn }: { children: ComponentChildren; warn?: boolean }) {
  return <div class={`banner ${warn ? 'warn' : ''}`}>{children}</div>;
}

export const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
