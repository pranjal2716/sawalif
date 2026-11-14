import { useEffect, useState } from 'preact/hooks';
import { db } from '../lib/db';
import { loadCourse, getSettings, type Settings } from '../lib/store';
import { learnedItemIds } from '../lib/srs';
import { playLine, playItem, estimateMs, stop } from '../lib/audio';
import { recordFor, playBlob, releaseMic } from '../lib/recorder';
import { useActivityTimer } from '../lib/timer';
import { PlayButton, Icon, sleep, Banner } from '../components/ui';

interface ShadowLine { key: string; tr: string; en: string; ar: string; play: (rate: number) => Promise<void> }

async function buildLines(): Promise<ShadowLine[]> {
  const c = await loadCourse();
  const lessons = (await db.lessons.toArray()).sort((a, b) => b.last - a.last);
  const recent = lessons[0] && c.dialogues.find(d => d.id === lessons[0].id);
  if (recent) {
    return recent.lines.map((l, i) => ({ key: `${recent.id}-${i}`, tr: l.tr, en: l.en, ar: l.ar, play: (r: number) => playLine(recent.id, i, l, r) }));
  }
  const learned = await learnedItemIds();
  const items = c.items.filter(i => learned.has(i.id)).slice(-8);
  const pool = items.length ? items : c.items.slice(0, 6);
  return pool.map(i => ({ key: i.id, tr: i.tr, en: i.en, ar: i.ar, play: (r: number) => playItem(i, { rate: r }) }));
}

export function Shadow({ onDone, doneLabel = 'Continue' }: { onDone?: () => void; doneLabel?: string }) {
  const [lines, setLines] = useState<ShadowLine[] | null>(null);
  const [s, setS] = useState<Settings | null>(null);
  const [i, setI] = useState(0);
  const [state, setState] = useState<'idle' | 'playing' | 'recording' | 'review'>('idle');
  const [err, setErr] = useState('');
  const [mine, setMine] = useState<Blob | null>(null);
  useActivityTimer('shadowing', !!lines && i < (lines?.length ?? 0));

  useEffect(() => {
    buildLines().then(setLines);
    getSettings().then(setS);
    return () => {
      stop();
      releaseMic();
    };
  }, []);

  if (!lines || !s) return <div class="panel">Loading…</div>;
  if (i >= lines.length) {
    return (
      <div class="panel stack">
        <h2>Shadowing done</h2>
        <p class="muted">Copying the sound and rhythm straight after a native voice is one of the quickest ways to sound natural.</p>
        {onDone && <button class="btn primary" onClick={onDone}>{doneLabel}</button>}
      </div>
    );
  }
  const line = lines[i];

  const run = async () => {
    setErr('');
    setMine(null);
    try {
      setState('playing');
      await line.play(s.rate);
      await sleep(150);
      setState('recording');
      const blob = await recordFor(estimateMs(line.ar) + 1200);
      setMine(blob);
      setState('review');
      await playBlob(blob);
      await sleep(300);
      await line.play(s.rate);
    } catch (e: any) {
      setErr(e?.name === 'NotAllowedError' ? 'Microphone access was blocked. Allow it from the address bar, then try again.' : 'Could not use the microphone.');
      setState('idle');
    }
  };

  return (
    <div class="panel stack">
      <div class="spread">
        <h2>Shadowing</h2>
        <span class="tiny">Line {i + 1} of {lines.length}</span>
      </div>
      <p class="muted small">Press Start: listen, then repeat straight away while it records. You'll hear yourself, then the original again.</p>
      <div class="say m">{line.tr}</div>
      <div class="meaning">{line.en}</div>
      {err && <Banner warn>{err}</Banner>}
      <div class="row">
        <button class="btn primary big" onClick={run} disabled={state === 'playing' || state === 'recording'}>
          {state === 'recording' ? <>{Icon.mic} Speak now…</> : state === 'playing' ? 'Listen…' : state === 'review' ? 'Try again' : 'Start'}
        </button>
        <PlayButton small onPlay={() => line.play(s.rate * 0.75)} label="Play slowly" />
        {mine && <button class="btn quiet" onClick={() => playBlob(mine)}>Hear myself</button>}
        <button class="btn" onClick={() => { setState('idle'); setMine(null); setI(i + 1); }}>
          Next line
        </button>
      </div>
    </div>
  );
}
