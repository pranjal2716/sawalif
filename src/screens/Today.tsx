import { useEffect, useState } from 'preact/hooks';
import { db, requestPersistence, type DayRow } from '../lib/db';
import { dayKey, fmtDay, fmtMonthYear } from '../lib/dates';
import { loadCourse, useSettings, useProgressTick, type Course } from '../lib/store';
import { loadStats, type Stats } from '../lib/stats';
import { splitFor } from '../lib/engine';
import { dueNow } from '../lib/srs';
import { backupNow } from '../lib/backup';
import { playItem, voiceStatus, loadAudioIndex } from '../lib/audio';
import { canRecognise } from '../lib/speech';
import { SessionBand } from '../components/Sadu';
import { Banner } from '../components/ui';
import { CardSession } from './CardSession';
import { Lesson } from './Lesson';
import { Shadow } from './Shadow';
import { SpeakDrills } from './Speak';
import { CheckInForm } from './CheckIn';

const STEPS = ['checkin', 'cards', 'listening', 'shadowing', 'speaking', 'done'] as const;
type Step = (typeof STEPS)[number] | 'idle';
const LABEL: Record<string, string> = { checkin: 'Check-in', cards: 'Flashcards', listening: 'Listening', shadowing: 'Shadowing', speaking: 'Speaking' };

async function getStep(): Promise<Step> {
  const row = await db.kv.get('session');
  return row?.value?.date === dayKey() ? row.value.step : 'idle';
}
async function setStepKV(step: Step) {
  await db.kv.put({ key: 'session', value: { date: dayKey(), step } });
}

export function Today() {
  const [s, saveS] = useSettings();
  const tick = useProgressTick();
  const [course, setCourse] = useState<Course | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [step, setStep] = useState<Step>('idle');
  const [due, setDue] = useState(0);

  useEffect(() => {
    loadCourse().then(setCourse);
    getStep().then(setStep);
  }, []);
  useEffect(() => {
    if (course && s) {
      loadStats(course, s).then(setStats);
      dueNow().then(r => setDue(r.length));
    }
  }, [course, s, tick, step]);

  if (!s || !course || !stats) return <div class="page">Loading…</div>;

  const split = splitFor(s.minutesPerDay);
  const today: DayRow | undefined = stats.byDate.get(stats.today);
  const segs = [
    { key: 'cards', label: 'Flashcards', target: split.cards, done: today?.cards ?? 0 },
    { key: 'listening', label: 'Listening', target: split.listening, done: today?.listening ?? 0 },
    { key: 'shadowing', label: 'Shadowing', target: split.shadowing, done: today?.shadowing ?? 0 },
    { key: 'speaking', label: 'Speaking', target: split.speaking, done: (today?.speaking ?? 0) + (today?.ai ?? 0) }
  ];
  const go = async (st: Step) => {
    await setStepKV(st);
    setStep(st);
    window.scrollTo({ top: 0 });
    if (st === 'done') backupNow(false);
  };
  const next = () => go(STEPS[STEPS.indexOf(step as any) + 1] ?? 'done');
  const hour = new Date().getHours();
  const greet = hour < 12 ? ['sabaa7 al-khair', 'Good morning'] : ['masaa\' al-khair', 'Good evening'];
  const target = stats.target;

  if (!s.onboarded) return <Welcome onStart={async () => { await saveS({ onboarded: true, startDate: dayKey() }); await requestPersistence(); go('checkin'); }} target={target.milestone.name} date={target.onPlan} minutes={s.minutesPerDay} />;

  const running = step !== 'idle' && step !== 'done';
  const mins = Math.round(stats.todayMinutes);

  return (
    <div class="page stack-l">
      <header class="today-head">
        <div>
          <div class="greet-ar">{greet[0]}, Pranjal</div>
          <p class="lede">{greet[1]}. {fmtDay(stats.today)}.</p>
        </div>
        {!running && (
          <button class="btn primary big" onClick={() => go(step === 'done' ? 'cards' : 'checkin')}>
            {step === 'done' ? 'Study a bit more' : mins > 0 ? 'Continue today' : "Start today's session"}
          </button>
        )}
      </header>

      <SessionBand segments={segs} current={running ? (step === 'checkin' ? 'cards' : step) : undefined} />

      {running ? (
        <section>
          <div class="step-head">
            <div class="steps-mini" aria-label="Session steps">
              {STEPS.slice(0, 5).map((k, i) => (
                <span key={k} aria-current={k === step ? 'step' : undefined} class={STEPS.indexOf(step as any) > i ? 'done' : ''}>
                  {LABEL[k]}
                  {i < 4 ? ' ·' : ''}
                </span>
              ))}
            </div>
            <div class="row">
              <span class="timer">
                Today <b>{mins}</b> / {s.minutesPerDay} min
              </span>
              <button class="btn quiet" onClick={next}>
                Skip to {LABEL[STEPS[STEPS.indexOf(step as any) + 1]] ?? 'the end'}
              </button>
            </div>
          </div>
          {step === 'checkin' && (
            <div class="panel">
              <h2 style={{ marginBottom: 16 }}>Check-in</h2>
              <CheckInForm compact onSaved={next} />
            </div>
          )}
          {step === 'cards' && <CardSession mode="listen" newLimit={split.newPerDay} onDone={next} doneLabel="On to listening" />}
          {step === 'listening' && <Lesson onDone={next} doneLabel="On to shadowing" />}
          {step === 'shadowing' && <Shadow onDone={next} doneLabel="On to speaking" />}
          {step === 'speaking' && <SpeakDrills onDone={next} doneLabel="Finish today" />}
        </section>
      ) : (
        <>
          {step === 'done' && (
            <div class="panel stack">
              <h2>Done for today. {mins >= s.minutesPerDay ? 'Plan met.' : `${mins} of ${s.minutesPerDay} minutes.`}</h2>
              <p class="muted">
                {target.milestone.name}: on plan for <b>{fmtMonthYear(target.onPlan)}</b>.{' '}
                {target.slipDays > 0 ? `Missed time so far has added ${target.slipDays} day${target.slipDays === 1 ? '' : 's'}.` : 'You are on schedule.'}
              </p>
            </div>
          )}
          <dl class="facts">
            <div>
              <dt>Streak</dt>
              <dd>{stats.streak} <small>day{stats.streak === 1 ? '' : 's'}</small></dd>
            </div>
            <div>
              <dt>Today</dt>
              <dd>{mins} <small>of {s.minutesPerDay} min</small></dd>
            </div>
            <div>
              <dt>Cards due</dt>
              <dd>{due}</dd>
            </div>
            <div>
              <dt>{target.milestone.name}</dt>
              <dd>{fmtMonthYear(target.atPace)} <small>at your pace</small></dd>
            </div>
          </dl>
        </>
      )}
    </div>
  );
}

function Welcome({ onStart, target, date, minutes }: { onStart: () => void; target: string; date: string; minutes: number }) {
  const [audio, setAudio] = useState<{ mp3: number; browser: string | null } | null>(null);
  useEffect(() => {
    loadAudioIndex().then(() => setTimeout(() => setAudio(voiceStatus()), 600));
  }, []);
  return (
    <div class="page stack-l">
      <header>
        <div class="greet-ar">hala wallah, Pranjal</div>
        <p class="lede">Hi there. Sawalif teaches spoken Gulf Arabic by ear: you listen, repeat and speak. Nothing to read in Arabic script; spellings in English letters appear after you hear each phrase.</p>
      </header>
      <div class="panel stack">
        <h2>Your plan</h2>
        <p>
          {minutes} minutes a day, every day. Target: <b>{target}</b>, projected for <b>{fmtMonthYear(date)}</b> if you keep to it. The date updates every day from what you actually do; change the plan any time in Settings.
        </p>
        <div class="row">
          <button class="btn" onClick={() => playItem({ id: 'm1-05', ar: 'هلا والله' })}>Test the voice</button>
          <span class="muted small">
            {audio == null ? 'Checking voices…' : audio.mp3 ? `${audio.mp3} recorded clips ready` : audio.browser ? `Using ${audio.browser}` : 'No Arabic voice found. Open this app in Microsoft Edge for the UAE voices.'}
          </span>
        </div>
        {!canRecognise && <Banner>Speech checks need Microsoft Edge or Chrome. Everything else works here.</Banner>}
        <div>
          <button class="btn primary big" onClick={onStart}>Start my first session</button>
        </div>
      </div>
    </div>
  );
}
