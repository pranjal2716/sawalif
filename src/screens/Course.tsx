import { useEffect, useState } from 'preact/hooks';
import { db, type CardRow } from '../lib/db';
import { useCourse, useSettings, useProgressTick, type Item, type Module, type Dialogue } from '../lib/store';
import { playItem } from '../lib/audio';
import { startRecording, type Recording } from '../lib/recorder';
import { PlayButton, FlagButton, Icon } from '../components/ui';
import { Lesson } from './Lesson';

export function Course() {
  const course = useCourse();
  const tick = useProgressTick();
  const [cards, setCards] = useState<Map<string, CardRow>>(new Map());
  const [open, setOpen] = useState<string | null>(null);
  const [lesson, setLesson] = useState<Dialogue | null>(null);
  const [lessonsDone, setLessonsDone] = useState<Set<string>>(new Set());

  useEffect(() => {
    db.cards.where('dir').equals('listen').toArray().then(rows => setCards(new Map(rows.map(r => [r.itemId, r]))));
    db.lessons.toArray().then(ls => setLessonsDone(new Set(ls.filter(l => l.done).map(l => l.id))));
  }, [tick]);

  if (!course) return <div class="page">Loading…</div>;
  if (lesson) {
    return (
      <div class="page stack">
        <button class="btn quiet" onClick={() => setLesson(null)}>Back to the course</button>
        <Lesson dialogue={lesson} onDone={() => setLesson(null)} doneLabel="Back to the course" />
      </div>
    );
  }
  const mod = course.modules.find(m => m.id === open);
  if (mod) return <ModuleView mod={mod} cards={cards} onBack={() => setOpen(null)} dialogues={course.dialogues.filter(d => d.module === mod.id)} onLesson={setLesson} lessonsDone={lessonsDone} />;

  return (
    <div class="page wide stack-l">
      <header>
        <h1>Course</h1>
        <p class="lede">Twelve topic modules of everyday Gulf Arabic. New phrases arrive in this order in your daily flashcards; you can listen to anything here at any time.</p>
      </header>
      <div class="modules">
        {course.modules.map((m, i) => {
          const learned = m.items.filter(it => cards.has(it.id)).length;
          const soon = !m.items.length;
          return (
            <button key={m.id} class={`module ${soon ? 'soon' : ''}`} onClick={() => !soon && setOpen(m.id)} disabled={soon}>
              <div class="num">Module {i + 1}</div>
              <h3>{m.title}</h3>
              <div class="muted small">{m.blurb}</div>
              {soon ? (
                <div class="tiny" style={{ marginTop: 10 }}>Being written. It arrives before you finish the modules above.</div>
              ) : (
                <>
                  <div class="meter"><i style={{ width: `${(learned / m.items.length) * 100}%` }} /></div>
                  <div class="tiny" style={{ marginTop: 6 }}>{learned} of {m.items.length} phrases met</div>
                </>
              )}
            </button>
          );
        })}
      </div>
      <div class="section">
        <h2>How the spelling works</h2>
        <p class="muted">Arabic has sounds English doesn't. Gulf Arabic texters use numbers for them, and so does this app. Always trust the audio over the spelling.</p>
        <table class="list">
          <thead>
            <tr><th>Written</th><th>Sound</th><th>Example</th></tr>
          </thead>
          <tbody>
            {course.spelling.map(([w, , desc, ex]) => (
              <tr key={w}><td class="tr">{w}</td><td>{desc}</td><td class="tr">{ex}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function status(r?: CardRow): 'new' | 'learning' | 'known' {
  if (!r) return 'new';
  return r.stability >= 21 ? 'known' : 'learning';
}

function ModuleView({ mod, cards, onBack, dialogues, onLesson, lessonsDone }: { mod: Module; cards: Map<string, CardRow>; onBack: () => void; dialogues: Dialogue[]; onLesson: (d: Dialogue) => void; lessonsDone: Set<string> }) {
  const [s] = useSettings();
  const [recs, setRecs] = useState<Set<string>>(new Set());
  const refresh = () => db.recordings.toCollection().primaryKeys().then(k => setRecs(new Set(k as string[])));
  useEffect(() => {
    refresh();
  }, []);
  return (
    <div class="page wide stack-l">
      <div>
        <button class="btn quiet" onClick={onBack}>Back to all modules</button>
      </div>
      <header>
        <h1>{mod.title}</h1>
        <p class="lede">{mod.blurb}</p>
      </header>
      {dialogues.length > 0 && (
        <div>
          <h2 style={{ marginBottom: 10 }}>Listening lessons</h2>
          <div class="chips">
            {dialogues.map(d => (
              <button key={d.id} class="chip" onClick={() => onLesson(d)}>
                {d.title} {lessonsDone.has(d.id) ? '(done)' : ''}
              </button>
            ))}
          </div>
        </div>
      )}
      <div class="panel flush">
        <table class="list">
          <thead>
            <tr>
              <th style={{ width: 54 }}></th>
              <th>Say</th>
              <th>Meaning</th>
              <th style={{ width: 110 }}>Status</th>
              <th style={{ width: 300 }}>Native check</th>
            </tr>
          </thead>
          <tbody>
            {mod.items.map(it => {
              const st = status(cards.get(it.id));
              return (
                <tr key={it.id}>
                  <td><PlayButton small onPlay={() => playItem(it, { voice: s?.voice, rate: s?.rate })} /></td>
                  <td class="tr">{it.tr}</td>
                  <td>
                    {it.en}
                    {it.note && <div class="tiny">{it.note}</div>}
                  </td>
                  <td><span class={`status-dot ${st}`} />{st === 'new' ? 'Not yet' : st === 'learning' ? 'Learning' : 'Known'}</td>
                  <td>
                    <div class="row" style={{ gap: 4 }}>
                      <NativeRecorder item={it} has={recs.has(it.id)} onChange={refresh} />
                      <FlagButton itemId={it.id} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p class="tiny">Native check: ask a Gulf Arabic speaker to listen. If a phrase sounds wrong, flag it, or let them record the right version; their recording then replaces the computer voice everywhere.</p>
    </div>
  );
}

function NativeRecorder({ item, has, onChange }: { item: Item; has: boolean; onChange: () => void }) {
  const [rec, setRec] = useState<Recording | null>(null);
  const [err, setErr] = useState('');
  const toggle = async () => {
    setErr('');
    if (rec) {
      const blob = await rec.stop();
      setRec(null);
      await db.recordings.put({ itemId: item.id, blob, ts: Date.now() });
      onChange();
      return;
    }
    try {
      setRec(await startRecording());
    } catch {
      setErr('Microphone blocked');
    }
  };
  return (
    <>
      <button class="btn quiet small" onClick={toggle} title="Record a native speaker saying this phrase">
        {rec ? <>{Icon.stop} Stop</> : <>{Icon.mic} {has ? 'Re-record' : 'Record'}</>}
      </button>
      {has && !rec && (
        <button class="btn quiet small danger" title="Remove the native recording" onClick={async () => { await db.recordings.delete(item.id); onChange(); }}>
          Remove
        </button>
      )}
      {err && <span class="tiny">{err}</span>}
    </>
  );
}
