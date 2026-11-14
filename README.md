# Sawalif

A personal app for learning **spoken Gulf (Emirati) Arabic by ear**: no Arabic script, just audio, English-letter spellings and speaking practice.

- Daily 20-minute session: check-in, audio flashcards (FSRS spaced repetition), a listening lesson, shadowing and speaking drills
- AI role-play partner (Google Gemini free tier, key stored locally)
- Progress dashboard with a projected "can converse" date that moves when lessons are missed
- Runs in Microsoft Edge and installs as a desktop app; all progress stays on the PC (with optional backups to a folder such as OneDrive)

Live app: https://pranjal2716.github.io/sawalif/

## How it's built

- Vite + Preact + TypeScript, installable PWA (`vite-plugin-pwa`)
- `ts-fsrs` for scheduling, Dexie (IndexedDB) for storage
- Course content: `public/content/course.json`
- Audio: `scripts/gen_audio.py` generates MP3s with Microsoft's UAE neural voices (via `edge-tts`) in GitHub Actions; the app falls back to the browser's Arabic voice for anything missing, and native-speaker recordings made in the app override both
- Deadline engine: `src/lib/engine.ts` (tests in `engine.test.ts`)

## Develop

```
npm install
npm run dev
npm test
```
