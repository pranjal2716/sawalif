import { useEffect, useRef, useState } from 'preact/hooks';
import type { CardRow } from '../lib/db';
import { loadCourse, getSettings, type Course, type Item, type Settings } from '../lib/store';
import { dueNow, introduce, introducedToday, nextNewItems, review, previewIntervals, backlogPaused, Rating, State } from '../lib/srs';
import { playItem, stop } from '../lib/audio';
import { canRecognise, listenOnce, judge, verdictText, type Verdict } from '../lib/speech';
import { useActivityTimer } from '../lib/timer';
import { PlayButton, FlagButton, useKeys, Icon, Banner, sleep } from '../components/ui';
import type { Grade } from 'ts-fsrs';

type Entry = { kind: 'new'; item: Item } | { kind: 'review'; row: CardRow };

interface Props {
  mode: 'listen' | 'say' | 'all';
  newLimit: number; // max new items today (0 = none)
  onDone?: () => void;
  doneLabel?: string;
  activity?: 'cards' | 'speaking';
}

export function CardSession({ mode, newLimit, onDone, doneLabel = 'Continue', activity = 'cards' }: Props) {
  const [course, setCourse] = useState<Course | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [queue, setQueue] = useState<Entry[] | null>(null);
  const [pos, setPos] = useState(0);
  const [stats, setStats] = useState({ reviewed: 0, learned: 0 });
  const [pausedNote, setPausedNote] = useState('');
  useActivityTimer(activity, queue != null && pos < (queue?.length ?? 0));

  useEffect(() => {
    (async () => {
      const [c, s] = await Promise.all([loadCourse(), getSettings()]);
      setCourse(c);
      setSettings(s);
      const due = await dueNow(mode === 'all' ? undefined : mode);
      const reviews: Entry[] = due.filter(r => c.byId.has(r.itemId)).slice(0, 300).map(row => ({ kind: 'review', row }));
      let fresh: Entry[] = [];
      if (newLimit > 0 && mode !== 'say') {
        const bl = await backlogPaused();
        if (bl.paused) {
          setPausedNote(`New phrases are paused today: ${bl.due} reviews are waiting, about twice your normal load. Clearing them first keeps your memory solid.`);
        } else {
          const n = Math.max(0, newLimit - (await introducedToday()));
          fresh = (await nextNewItems(c, n)).map(item => ({ kind: 'new', item }));
        }
      }
      // reviews first, then new phrases interleaved every few reviews
      const q: Entry[] = [];
      const r = [...reviews];
      const f = [...fresh];
      while (r.length || f.length) {
        q.push(...r.splice(0, 3));
        if (f.length) q.push(f.shift()!);
      }
      setQueue(q);
    })();
    return () => stop();
  }, [mode, newLimit]);

  if (!queue || !course || !settings) return <div class="panel">Loading cards…</div>;

  const entry = queue[pos];
  if (!entry) {
    return (
      <div class="panel stack">
        {pausedNote && <Banner>{pausedNote}</Banner>}
        <h2>{queue.length ? 'Cards done for now' : 'Nothing due right now'}</h2>
        <p class="muted">
          {queue.length
            ? `${stats.reviewed} reviews and ${stats.learned} new phrases. They'll come back right before you'd forget them.`
            : 'All your cards are scheduled for later. New phrases arrive each day up to your daily limit.'}
        </p>
        {onDone && (
          <button class="btn primary" onClick={onDone}>
            {doneLabel}
          </button>
        )}
      </div>
    );
  }

  const advance = (requeue?: Entry) => {
    setQueue(q => (requeue ? [...q!, requeue] : q));
    setPos(p => p + 1);
  };

  const remaining = queue.length - pos;
  const item = entry.kind === 'new' ? entry.item : course.byId.get(entry.row.itemId)!;

  return (
    <div class="stack">
      {pausedNote && pos === 0 && <Banner>{pausedNote}</Banner>}
      <div class="panel card" key={`${pos}-${item.id}`}>
        <div class="card-top">
          <span class="row">
            {entry.kind === 'new' ? <span class="tag new">New</span> : entry.row.dir === 'say' ? <span class="tag say">Say it</span> : <span class="tag">Listen</span>}
            <span>{remaining} left</span>
          </span>
          <FlagButton itemId={item.id} />
        </div>
        {entry.kind === 'new' ? (
          <NewCard
            item={item}
            settings={settings}
            onGotIt={async () => {
              const row = await introduce(item, settings.retention);
              setStats(s => ({ ...s, learned: s.learned + 1 }));
              advance({ kind: 'review', row });
            }}
          />
        ) : entry.row.dir === 'say' ? (
          <SayCard item={item} row={entry.row} settings={settings} onRated={(next, rated) => afterRate(next, rated)} />
        ) : (
          <ListenCard item={item} row={entry.row} settings={settings} onRated={(next, rated) => afterRate(next, rated)} />
        )}
      </div>
      <p class="tiny">Keys: Space shows the answer, R replays, S plays slowly, 1–4 rate.</p>
    </div>
  );

  function afterRate(next: CardRow, _rated: Grade) {
    setStats(s => ({ ...s, reviewed: s.reviewed + 1 }));
    const soon = next.due - Date.now() < 15 * 60000 && next.state !== State.Review;
    advance(soon ? { kind: 'review', row: next } : undefined);
  }
}

function useAutoPlay(item: Item, settings: Settings, twice = false) {
  const played = useRef(false);
  useEffect(() => {
    if (played.current) return;
    played.current = true;
    (async () => {
      await sleep(250);
      if (twice && settings.voice === 'both') {
        await playItem(item, { voice: 'f', rate: settings.rate });
        await sleep(500);
        await playItem(item, { voice: 'm', rate: settings.rate });
      } else {
        await playItem(item, { voice: settings.voice, rate: settings.rate });
      }
    })();
  }, [item.id]);
  return {
    replay: () => playItem(item, { voice: settings.voice, rate: settings.rate }),
    slow: () => playItem(item, { voice: settings.voice, rate: Math.min(settings.rate, 1) * 0.7 })
  };
}

function AudioControls({ replay, slow }: { replay: () => Promise<void>; slow: () => Promise<void> }) {
  return (
    <div class="row">
      <PlayButton onPlay={replay} label="Play again (R)" />
      <button class="btn quiet" onClick={() => slow()}>
        Slowly <span class="kbd">S</span>
      </button>
    </div>
  );
}

function NewCard({ item, settings, onGotIt }: { item: Item; settings: Settings; onGotIt: () => void }) {
  const ctl = useAutoPlay(item, settings, true);
  useKeys({ r: ctl.replay, s: ctl.slow, Enter: onGotIt, Space: onGotIt }, [item.id]);
  return (
    <>
      <div class="card-body">
        <AudioControls {...ctl} />
        <div class="say">{item.tr}</div>
        <div class="meaning">{item.en}</div>
        {item.note && <div class="note">{item.note}</div>}
        <p class="muted small">Say it out loud twice, copying the rhythm.</p>
      </div>
      <div class="row">
        <button class="btn primary big" onClick={onGotIt}>
          Got it <span class="kbd">Enter</span>
        </button>
      </div>
    </>
  );
}

function Ratings({ row, settings, onRate }: { row: CardRow; settings: Settings; onRate: (g: Grade) => void }) {
  const iv = previewIntervals(row, settings.retention);
  const opts: [Grade, string, string][] = [
    [Rating.Again as Grade, 'Again', 'again'],
    [Rating.Hard as Grade, 'Hard', 'hard'],
    [Rating.Good as Grade, 'Good', 'good'],
    [Rating.Easy as Grade, 'Easy', 'easy']
  ];
  return (
    <div class="ratings">
      {opts.map(([g, label, cls], i) => (
        <button key={g} class={`rate ${cls}`} onClick={() => onRate(g)}>
          <b>
            {label} <span class="kbd">{i + 1}</span>
          </b>
          <small>next in {iv[g]}</small>
        </button>
      ))}
    </div>
  );
}

function ListenCard({ item, row, settings, onRated }: { item: Item; row: CardRow; settings: Settings; onRated: (n: CardRow, g: Grade) => void }) {
  const [shown, setShown] = useState(false);
  const t0 = useRef(Date.now());
  const ctl = useAutoPlay(item, settings);
  const rate = async (g: Grade) => onRated(await review(row, g, Date.now() - t0.current, settings.retention), g);
  useKeys(
    {
      r: ctl.replay,
      s: ctl.slow,
      Space: () => setShown(true),
      Enter: () => (shown ? rate(Rating.Good as Grade) : setShown(true)),
      '1': () => shown && rate(Rating.Again as Grade),
      '2': () => shown && rate(Rating.Hard as Grade),
      '3': () => shown && rate(Rating.Good as Grade),
      '4': () => shown && rate(Rating.Easy as Grade)
    },
    [shown, item.id]
  );
  return (
    <>
      <div class="card-body">
        <AudioControls {...ctl} />
        {(shown || settings.spelling === 'always') && <div class="say">{item.tr}</div>}
        {shown ? (
          <>
            <div class="meaning">{item.en}</div>
            {item.note && <div class="note">{item.note}</div>}
          </>
        ) : (
          <div class="hidden-hint">What does it mean?</div>
        )}
      </div>
      {shown ? (
        <Ratings row={row} settings={settings} onRate={rate} />
      ) : (
        <div class="row">
          <button class="btn primary big" onClick={() => setShown(true)}>
            Show meaning <span class="kbd">Space</span>
          </button>
        </div>
      )}
    </>
  );
}

export function SayCard({ item, row, settings, onRated, onNext }: { item: Item; row?: CardRow; settings: Settings; onRated?: (n: CardRow, g: Grade) => void; onNext?: () => void }) {
  const [shown, setShown] = useState(false);
  const [verdict, setVerdict] = useState<{ v: Verdict; err?: string } | null>(null);
  const [listening, setListening] = useState(false);
  const t0 = useRef(Date.now());
  const reveal = async () => {
    setShown(true);
    await playItem(item, { voice: settings.voice, rate: settings.rate });
  };
  const rate = async (g: Grade) => {
    if (row && onRated) onRated(await review(row, g, Date.now() - t0.current, settings.retention), g);
    else onNext?.();
  };
  const check = async () => {
    setListening(true);
    setVerdict(null);
    try {
      const alts = await listenOnce('ar-AE');
      setVerdict({ v: judge(alts, item.ar).verdict });
    } catch (e: any) {
      setVerdict({ v: 'silent', err: e.message });
    } finally {
      setListening(false);
    }
  };
  useKeys(
    {
      Space: () => !shown && reveal(),
      r: () => shown && playItem(item, { voice: settings.voice, rate: settings.rate }),
      '1': () => shown && rate(Rating.Again as Grade),
      '2': () => shown && rate(Rating.Hard as Grade),
      '3': () => shown && rate(Rating.Good as Grade),
      '4': () => shown && rate(Rating.Easy as Grade),
      Enter: () => (shown ? rate(Rating.Good as Grade) : reveal())
    },
    [shown, item.id]
  );
  return (
    <>
      <div class="card-body">
        <div class="prompt-en">{item.en}</div>
        <p class="muted">Say it in Arabic, out loud.</p>
        {canRecognise && !shown && (
          <button class="btn" onClick={check} disabled={listening}>
            {Icon.mic} {listening ? 'Listening…' : 'Check my pronunciation'}
          </button>
        )}
        {verdict && <div class={`verdict ${verdict.v}`}>{verdict.err ?? verdictText[verdict.v]}</div>}
        {shown && (
          <>
            <div class="row">
              <PlayButton small onPlay={() => playItem(item, { voice: settings.voice, rate: settings.rate })} label="Play again (R)" />
              <div class="say m">{item.tr}</div>
            </div>
            {item.note && <div class="note">{item.note}</div>}
          </>
        )}
      </div>
      {shown ? (
        row ? (
          <Ratings row={row} settings={settings} onRate={rate} />
        ) : (
          <div class="row">
            <button class="btn" onClick={() => rate(Rating.Again as Grade)}>
              Not yet <span class="kbd">1</span>
            </button>
            <button class="btn primary" onClick={() => rate(Rating.Good as Grade)}>
              I said it <span class="kbd">3</span>
            </button>
          </div>
        )
      ) : (
        <div class="row">
          <button class="btn primary big" onClick={reveal}>
            Show answer <span class="kbd">Space</span>
          </button>
        </div>
      )}
    </>
  );
}
