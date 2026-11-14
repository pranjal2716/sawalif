import { useEffect, useState } from 'preact/hooks';
import { db, type CardRow } from '../lib/db';
import { loadCourse, getSettings, type Item, type Settings } from '../lib/store';
import { dueNow } from '../lib/srs';
import { useActivityTimer } from '../lib/timer';
import { SayCard } from './CardSession';
import { Partner } from './Partner';
import { stop } from '../lib/audio';

interface Drill { item: Item; row?: CardRow }

async function buildDrills(): Promise<Drill[]> {
  const c = await loadCourse();
  const due = (await dueNow('say')).filter(r => c.byId.has(r.itemId)).map(row => ({ item: c.byId.get(row.itemId)!, row }));
  if (due.length >= 6) return due.slice(0, 30);
  // top up with phrases you've already met, most recent first
  const listen = await db.cards.where('dir').equals('listen').toArray();
  const met = listen.filter(r => r.reps >= 2).sort((a, b) => (b.last_review ?? 0) - (a.last_review ?? 0));
  const extra = met
    .map(r => c.byId.get(r.itemId)!)
    .filter(i => i && !due.some(d => d.item.id === i.id))
    .slice(0, 8)
    .map(item => ({ item }));
  return [...due, ...extra];
}

export function SpeakDrills({ onDone, doneLabel = 'Continue' }: { onDone?: () => void; doneLabel?: string }) {
  const [drills, setDrills] = useState<Drill[] | null>(null);
  const [s, setS] = useState<Settings | null>(null);
  const [i, setI] = useState(0);
  const [partner, setPartner] = useState(false);
  useActivityTimer('speaking', !!drills && !partner && i < (drills?.length ?? 0));

  useEffect(() => {
    buildDrills().then(setDrills);
    getSettings().then(setS);
    return () => stop();
  }, []);

  if (!drills || !s) return <div class="panel">Loading…</div>;
  if (partner) return <Partner onClose={() => setPartner(false)} />;

  const partnerBtn = (
    <button class="btn" onClick={() => setPartner(true)}>
      Role-play with the AI partner
    </button>
  );

  if (!drills.length) {
    return (
      <div class="panel stack">
        <h2>Speaking</h2>
        <p class="muted">Speaking drills start once you've met a few phrases in flashcards. Meanwhile, try a role-play.</p>
        <div class="row">
          {partnerBtn}
          {onDone && <button class="btn primary" onClick={onDone}>{doneLabel}</button>}
        </div>
      </div>
    );
  }
  if (i >= drills.length) {
    return (
      <div class="panel stack">
        <h2>Speaking drills done</h2>
        <p class="muted">Want more? A short role-play uses the same phrases in a real exchange.</p>
        <div class="row">
          {partnerBtn}
          {onDone && <button class="btn primary" onClick={onDone}>{doneLabel}</button>}
        </div>
      </div>
    );
  }
  const d = drills[i];
  return (
    <div class="stack">
      <div class="panel card" key={`${i}-${d.item.id}`}>
        <div class="card-top">
          <span class="row">
            <span class="tag say">Say it</span>
            <span>{drills.length - i} left</span>
          </span>
          {partnerBtn}
        </div>
        <SayCard item={d.item} row={d.row} settings={s} onRated={() => setI(i + 1)} onNext={() => setI(i + 1)} />
      </div>
    </div>
  );
}
