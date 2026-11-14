import { useEffect, useRef, useState } from 'preact/hooks';
import { db } from '../lib/db';
import { loadCourse, getSettings, type Dialogue, type Settings } from '../lib/store';
import { learnedItemIds } from '../lib/srs';
import { playLine, stop } from '../lib/audio';
import { useActivityTimer } from '../lib/timer';
import { PlayButton, sleep } from '../components/ui';

/** Picks the next dialogue: the first unfinished one whose module you've started, else the least recently played. */
export async function pickDialogue(): Promise<Dialogue | null> {
  const c = await loadCourse();
  const learned = await learnedItemIds();
  const lessons = new Map((await db.lessons.toArray()).map(l => [l.id, l]));
  const moduleStarted = (mid: string) => {
    const items = c.modules.find(m => m.id === mid)?.items ?? [];
    const n = items.filter(i => learned.has(i.id)).length;
    return n >= Math.min(6, Math.ceil(items.length * 0.15));
  };
  const order = c.modules.map(m => m.id);
  const ds = [...c.dialogues].sort((a, b) => order.indexOf(a.module) - order.indexOf(b.module));
  const fresh = ds.find(d => !lessons.get(d.id)?.done && (moduleStarted(d.module) || d.id === ds[0].id));
  if (fresh) return fresh;
  const done = ds.filter(d => lessons.get(d.id)?.done);
  if (!done.length) return ds[0] ?? null;
  return done.sort((a, b) => (lessons.get(a.id)!.last ?? 0) - (lessons.get(b.id)!.last ?? 0))[0];
}

type Phase = 'listen' | 'questions' | 'lines' | 'again' | 'done';

export function Lesson({ dialogue, onDone, doneLabel = 'Continue' }: { dialogue?: Dialogue; onDone?: () => void; doneLabel?: string }) {
  const [d, setD] = useState<Dialogue | null>(dialogue ?? null);
  const [s, setS] = useState<Settings | null>(null);
  const [phase, setPhase] = useState<Phase>('listen');
  const [active, setActive] = useState(-1);
  const [answers, setAnswers] = useState<number[]>([]);
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [plays, setPlays] = useState(0);
  const cancel = useRef(false);
  useActivityTimer('listening', !!d && phase !== 'done');

  useEffect(() => {
    getSettings().then(setS);
    if (!dialogue) pickDialogue().then(setD);
    return () => {
      cancel.current = true;
      stop();
    };
  }, []);

  if (!d || !s) return <div class="panel">Loading the lesson…</div>;

  const playAll = async (rate: number) => {
    cancel.current = false;
    for (let i = 0; i < d.lines.length; i++) {
      if (cancel.current) break;
      setActive(i);
      await playLine(d.id, i, d.lines[i], rate);
      await sleep(450);
    }
    setActive(-1);
    setPlays(p => p + 1);
  };

  const finish = async () => {
    const score = d.questions.length ? answers.filter((a, i) => a === d.questions[i].answer).length / d.questions.length : 1;
    const prev = await db.lessons.get(d.id);
    await db.lessons.put({ id: d.id, done: 1, score: Math.max(score, prev?.score ?? 0), plays: (prev?.plays ?? 0) + 1, last: Date.now() });
    setPhase('done');
  };

  return (
    <div class="panel stack">
      <div class="spread">
        <h2>{d.title}</h2>
        <span class="tiny">Listening lesson</span>
      </div>
      <p class="muted">{d.setting}</p>

      {phase === 'listen' && (
        <div class="stack">
          <p>Listen to the whole conversation without reading. Try to catch who wants what. Play it as often as you like.</p>
          <div class="row">
            <PlayButton onPlay={() => playAll(0.85 * s.rate)} label="Play the conversation" />
            <span class="muted">{active >= 0 ? `${d.lines[active].who} is speaking…` : plays ? `Played ${plays} time${plays > 1 ? 's' : ''}` : 'Slightly slowed down'}</span>
          </div>
          <button class="btn primary" disabled={!plays} onClick={() => setPhase(d.questions.length ? 'questions' : 'lines')}>
            {d.questions.length ? 'Answer questions' : 'Go line by line'}
          </button>
        </div>
      )}

      {phase === 'questions' && (
        <div>
          {d.questions.map((q, qi) => (
            <div class="q" key={qi}>
              <b>{q.q}</b>
              <div class="chips">
                {q.options.map((o, oi) => {
                  const picked = answers[qi];
                  const cls = picked == null ? '' : oi === q.answer ? 'right' : picked === oi ? 'wrong' : '';
                  return (
                    <button key={oi} class={`chip ${cls}`} disabled={picked != null} onClick={() => setAnswers(a => Object.assign([...a], { [qi]: oi }))}>
                      {o}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          <div class="row" style={{ marginTop: 20 }}>
            <PlayButton small onPlay={() => playAll(0.85 * s.rate)} label="Play again" />
            <button class="btn primary" disabled={answers.filter(a => a != null).length < d.questions.length} onClick={() => setPhase('lines')}>
              Go line by line
            </button>
          </div>
        </div>
      )}

      {(phase === 'lines' || phase === 'again' || phase === 'done') && (
        <div class="stack">
          <p class="muted small">
            {phase === 'lines' ? 'Play each line, repeat it out loud, then tap the line to see the spelling and meaning.' : 'The whole conversation at normal speed.'}
          </p>
          <ul class="lines">
            {d.lines.map((l, i) => {
              const show = phase !== 'lines' || revealed.has(i);
              return (
                <li key={i} class={active === i ? 'active' : ''}>
                  <span class={`who ${l.who === 'You' ? 'you' : ''}`}>{l.who}</span>
                  <PlayButton small onPlay={() => playLine(d.id, i, l, s.rate)} label={`Play line ${i + 1}`} />
                  <div onClick={() => setRevealed(r => new Set(r).add(i))} style={{ cursor: show ? 'default' : 'pointer' }}>
                    {show ? (
                      <>
                        <div class="line-tr">{l.tr}</div>
                        <div class="line-en">{l.en}</div>
                      </>
                    ) : (
                      <div class="muted" style={{ paddingTop: 6 }}>Show spelling and meaning</div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          {phase === 'lines' && (
            <button class="btn primary" onClick={() => setPhase('again')}>
              Listen once more at normal speed
            </button>
          )}
          {phase === 'again' && (
            <div class="row">
              <PlayButton onPlay={() => playAll(s.rate)} label="Play at normal speed" />
              <button class="btn primary" onClick={finish}>
                Finish lesson
              </button>
            </div>
          )}
          {phase === 'done' && (
            <div class="row">
              <span class="muted">Lesson saved. It'll come back later for re-listening.</span>
              {onDone && (
                <button class="btn primary" onClick={onDone}>
                  {doneLabel}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
