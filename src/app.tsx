import { useEffect, useState } from 'preact/hooks';
import { Today } from './screens/Today';
import { CardSession } from './screens/CardSession';
import { Course } from './screens/Course';
import { SpeakDrills } from './screens/Speak';
import { Partner } from './screens/Partner';
import { CheckInScreen } from './screens/CheckIn';
import { Progress } from './screens/Progress';
import { SettingsScreen } from './screens/Settings';
import { useCourse, useSettings, useProgressTick } from './lib/store';
import { loadStats } from './lib/stats';
import { dueNow } from './lib/srs';
import { splitFor } from './lib/engine';
import { fmtMonthYear } from './lib/dates';
import { backupNow } from './lib/backup';

const ROUTES = [
  ['today', 'Today'],
  ['cards', 'Flashcards'],
  ['course', 'Course'],
  ['speak', 'Speak'],
  ['checkin', 'Check-in'],
  ['progress', 'Progress'],
  ['settings', 'Settings']
] as const;

function useRoute(): string {
  const get = () => (location.hash.replace(/^#\/?/, '').split(/[?/]/)[0] || 'today');
  const [r, setR] = useState(get());
  useEffect(() => {
    const f = () => setR(get());
    window.addEventListener('hashchange', f);
    return () => window.removeEventListener('hashchange', f);
  }, []);
  return r;
}

export function App() {
  const route = useRoute();
  const course = useCourse();
  const [s] = useSettings();
  const tick = useProgressTick();
  const [due, setDue] = useState(0);
  const [deadline, setDeadline] = useState<{ name: string; date: string } | null>(null);

  useEffect(() => {
    dueNow().then(r => setDue(r.length));
    if (course && s?.onboarded) loadStats(course, s).then(st => setDeadline({ name: st.target.milestone.name, date: st.target.onPlan }));
  }, [course, s, tick, route]);

  useEffect(() => {
    backupNow(false); // daily copy if a folder is connected and permission is still granted
  }, []);

  useEffect(() => {
    document.title = `Sawalif · ${ROUTES.find(r => r[0] === route)?.[1] ?? 'Today'}`;
  }, [route]);

  return (
    <div class="shell">
      <aside class="rail">
        <div class="brand">
          <div class="brand-name">Sawalif</div>
          <div class="brand-sub">Gulf Arabic, by ear</div>
        </div>
        <nav aria-label="Main">
          {ROUTES.map(([k, label]) => (
            <a key={k} href={`#/${k}`} aria-current={route === k ? 'page' : undefined}>
              {label}
              {k === 'cards' && due > 0 && <span class="count">{due}</span>}
            </a>
          ))}
        </nav>
        {deadline && (
          <div class="rail-foot">
            {deadline.name} by
            <strong>{fmtMonthYear(deadline.date)}</strong>
          </div>
        )}
      </aside>
      <main>
        {route === 'today' && <Today />}
        {route === 'cards' && <FlashcardsScreen newPerDay={s ? splitFor(s.minutesPerDay).newPerDay : 5} />}
        {route === 'course' && <Course />}
        {route === 'speak' && <SpeakScreen />}
        {route === 'checkin' && <CheckInScreen />}
        {route === 'progress' && <Progress />}
        {route === 'settings' && <SettingsScreen />}
      </main>
    </div>
  );
}

function FlashcardsScreen({ newPerDay }: { newPerDay: number }) {
  const [round, setRound] = useState(0);
  return (
    <div class="page stack-l">
      <header>
        <h1>Flashcards</h1>
        <p class="lede">Everything due now: listening cards, and speaking cards for phrases you already recognise. New phrases are capped at {newPerDay} a day so reviews stay light.</p>
      </header>
      <CardSession key={round} mode="all" newLimit={newPerDay} onDone={() => setRound(r => r + 1)} doneLabel="Check again" />
    </div>
  );
}

function SpeakScreen() {
  const [mode, setMode] = useState<'drills' | 'partner'>('drills');
  return (
    <div class="page stack-l">
      <header class="spread">
        <div>
          <h1>Speak</h1>
          <p class="lede">Say-it drills from phrases you know, or a role-play with the AI partner.</p>
        </div>
        <div class="chips">
          <button class="chip" aria-pressed={mode === 'drills'} onClick={() => setMode('drills')}>Drills</button>
          <button class="chip" aria-pressed={mode === 'partner'} onClick={() => setMode('partner')}>AI role-play</button>
        </div>
      </header>
      {mode === 'drills' ? <SpeakDrills /> : <Partner />}
    </div>
  );
}
