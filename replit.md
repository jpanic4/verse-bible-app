# Verse App — replit.md

## Overview

Verse is a React Native (Expo) mobile application for exploring, searching, and saving Bible verses. The app provides:

- A **Home** screen with a daily verse, audio playback, daily reading plan (Book of Common Prayer), and random Proverb ("Daily Wisdom")
- An **Explore** screen with curated thematic verse collections (Hope, Strength, Love, etc.)
- A **Search** screen for looking up verses by reference or searching keywords/phrases across the entire ESV
- A **Saved** screen where users can bookmark and manage their favorite verses
- **Audio playback** on every verse card (ESV audio API) — listen to any passage read aloud

The project is a full-stack setup: an Expo mobile/web frontend backed by an Express.js server. The backend provides API endpoints for AI quiz generation (OpenAI), Bible challenge trivia (OpenAI), song generation (Evolink.ai/Suno), verse audio, keyword search, daily reading plan, and random proverbs — all proxied through the ESV API.

The app includes a **Bible Challenge** — a standalone Jeopardy-style trivia game accessible from the Explore tab. Users pick a category (5 Bible book groups like Gospels/Pentateuch, 18 themes like Hope/Love/Faith, or Mixed) and a difficulty level (Beginner/Intermediate/Advanced), then answer 5 AI-generated trivia questions worth 100-500 points. Features streak bonuses, star ratings, and per-question breakdown.

Additionally, the app includes a **Practice Toolkit** with 6 memorization modes accessible from any verse card:
- **Flashcard** — Flip card with reference on front, verse text on back
- **Fill in the Blank** — Verse with ~40% of words hidden as tappable blanks
- **Scramble** — Reorder shuffled word chips to reconstruct the verse
- **Quiz** — AI-generated multiple-choice questions (OpenAI gpt-4o-mini) with 5 varied question types (recall, comprehension, fill-in-the-blank, true/false, context), unique answer options, per-question explanations, streak tracking, and detailed results breakdown. Falls back to smart text-analysis questions if AI fails.
- **Type It** — Type the verse from memory with real-time accuracy tracking
- **Sing It** — Generate a song from scripture using Evolink.ai (Suno v5 music generation) with genre selection

---

## User Preferences

Preferred communication style: Simple, everyday language.

---

## System Architecture

### Frontend (Expo / React Native)

- **Framework**: Expo SDK ~54 with Expo Router v6 (file-based routing).
- **Navigation**: Tab-based layout (`app/(tabs)/`) with four tabs — Home, Explore, Search, Saved. The Explore tab is a hub with three sections: Practice Tools (6 memorization modes with quick launch from saved verses), My Songs (horizontal preview of generated songs), and Themes (18 curated collections, initially showing 6 with expandable "See All"). Modal presentation is used for the Theme detail screen (`app/theme/[name].tsx`), Songs library (`app/songs.tsx`), and Practice modes (`app/practice/` directory with nested Stack navigation).
- **State Management**:
  - **TanStack React Query** (`@tanstack/react-query`) is wired up via `QueryClientProvider` for server-state fetching (currently used for the Express API; verse fetching is done with plain `fetch`).
  - **React Context** (`SavedVersesContext`) manages the list of saved verses in memory, persisted to `AsyncStorage`.
  - **SRSContext** implements a Spaced Repetition System (SM-2 algorithm) — auto-syncs with saved verses, tracks review intervals/ease factors, and schedules optimized review sessions.
  - **StreakContext** tracks daily engagement streaks, XP points, and activity counts across all practice modes.
- **Local Persistence**: `@react-native-async-storage/async-storage` is used for:
  1. Caching fetched verse text (keyed by reference, prefix `verse_cache_esv_`) to avoid redundant network calls.
  2. Persisting the user's saved verses list (key `saved_verses`).
  3. Song cache for Evolink-generated songs (prefix `song_cache_`).
  4. SRS review data (key `srs_data`) — per-verse interval, ease factor, repetition count, and next review date.
  5. Streak/XP data (key `streak_data`) — current/longest streak, total/today XP, activity counts.
- **Local Bible Storage**: The full ESV Bible (66 books, ~31,000 verses) is stored locally in `data/esv-bible.json` (4.0MB). All verse lookups first check this local file via `lib/local-bible.ts` before falling back to the ESV API. This means daily verses, themed collections, and most lookups work entirely offline.
- **Verse Pre-caching**: On first app launch, `precacheStaticVerses()` (in `lib/bible-api.ts`) runs in the background to cache any verse references not in the local file into AsyncStorage. Controlled by `verse_precache_done_v1` key. With the full Bible now stored locally, pre-caching is mostly a no-op.
- **Animations**: `react-native-reanimated` for entrance animations (`FadeInDown`, `FadeIn`), and shared value shimmer on skeleton loading cards.
- **Fonts**: Lora (serif, used for verse text) and Inter (sans-serif, used for UI labels) via `@expo-google-fonts`.
- **Haptics**: `expo-haptics` used on interactive controls (save, search, theme press) on native platforms only (guarded with `Platform.OS !== 'web'`).
- **Background Audio**: `staysActiveInBackground: true` enabled in both `AudioPlayerContext` and Sing It player; iOS `UIBackgroundModes: ["audio"]` and Android foreground service permissions configured in `app.json`.
- **Platform handling**: The codebase is cross-platform (iOS, Android, Web). Platform-specific branches handle tab bar styling (blur on iOS, solid on web/Android), inset calculations, and keyboard-aware scroll view (`KeyboardAwareScrollViewCompat` falls back to a standard `ScrollView` on web).
- **Error Handling**: A class-based `ErrorBoundary` wraps the app, showing a `ErrorFallback` UI with a restart option via `expo`'s `reloadAppAsync`.

### Backend (Express.js)

- **Runtime**: Node.js with TypeScript, compiled by `tsx` in dev and `esbuild` in production.
- **Server**: Express 5, launched from `server/index.ts`.
- **CORS**: Custom middleware that whitelists Replit domains (`REPLIT_DEV_DOMAIN`, `REPLIT_DOMAINS`) and localhost origins for Expo web dev.
- **Routes**: `server/routes.ts` defines API endpoints:
  - `GET /api/verse?q=<ref>` — ESV verse text lookup (proxied through ESV API)
  - `GET /api/verse-audio?q=<ref>` — ESV audio MP3 URL for a passage
  - `GET /api/search?q=<query>&page=<n>` — Keyword/phrase search across the ESV (paginated)
  - `GET /api/reading-plan?day=<n>` — Daily reading plan (Book of Common Prayer, 365-day cycle)
  - `GET /api/random-proverb` — Random verse from Proverbs
  - `POST /api/generate-quiz` — AI quiz generation using OpenAI (gpt-4o-mini) via Replit AI Integrations
  - `POST /api/generate-challenge` — Bible Challenge trivia generation (gpt-4o-mini); accepts category ID, difficulty, and round number
  - `POST /api/generate-song` — Song generation using Evolink.ai (Suno v5 model via `POST /v1/audios/generations`), requires `EVOLINK_API_KEY` env secret; checks server-side cache first
  - `GET /api/song-status/:taskId` — Poll Evolink.ai (`GET /v1/tasks/{task_id}`) for song generation completion; caches completed songs server-side
  - `GET /api/song-cache?reference=<ref>&genre=<genre>` — Check if a previously generated song exists in the server-side cache
- **Song Caching** (3-tier, saves Evolink API tokens):
  1. **Client AsyncStorage** (`song_cache_<ref>_<genre>`) — fastest, persists across app restarts
  2. **Server in-memory Map** (`server/evolink.ts`, keyed by `ref::genre`) — persists within server session
  3. **Evolink API** — only called when no cache hit at either level; completed songs are cached at both levels
- **Helpers**: `server/openai.ts` (quiz generation), `server/evolink.ts` (song generation + caching)
- **Storage**: `server/storage.ts` defines an `IStorage` interface with `getUser`, `getUserByUsername`, and `createUser`. A `MemStorage` in-memory implementation exists. A PostgreSQL/Drizzle implementation can be added when persistence is needed.
- **Static serving**: In production, the server serves the Expo static web build. A landing page HTML template exists at `server/templates/landing-page.html`.

### Database

- **ORM**: Drizzle ORM with PostgreSQL dialect (`drizzle-orm`, `drizzle-kit`).
- **Schema** (`shared/schema.ts`): Currently only a `users` table with `id` (UUID), `username`, and `password`. Zod insert schema is derived via `drizzle-zod`.
- **Config** (`drizzle.config.ts`): Reads `DATABASE_URL` from environment. Migrations output to `./migrations/`.
- **Current state**: The database is defined but not actively used — the server uses `MemStorage` instead. Switching to a real Drizzle/Postgres storage implementation is the expected next step.

### Data Layer (Client-Side Static Data)

- `data/themes.ts` — Hardcoded list of thematic verse collections with metadata (icon, color, verse references).
- `data/bible-challenge.ts` — Category definitions for Bible Challenge: 5 book groups, 18 theme categories, and Mixed; each has seed topics for AI prompt generation.
- `data/dailyVerses.ts` — Pool of verse references; a deterministic daily selection is made (presumably by date index via `getDailyVerseRef()`).
- `data/bibleBooks.ts` — Full list of Bible book names used for search autocomplete.

### External Bible API

- **Service**: ESV API (`https://api.esv.org/v3/passage/text/`) — English Standard Version.
- **Backend proxy**: `GET /api/verse?q=<reference>` in `server/routes.ts` calls the ESV API with the `ESV_API_KEY` secret.
- **Client**: `lib/bible-api.ts` fetches from the backend proxy, caches results in `AsyncStorage` (prefix `verse_cache_esv_`).
- Requires `ESV_API_KEY` environment secret.

### Build & Dev Scripts

- `expo:dev` — starts Expo dev server with Replit domain env vars set.
- `server:dev` — starts Express server with `tsx` (hot reload friendly).
- `expo:static:build` / `server:build` / `server:prod` — production build pipeline using Metro for the frontend bundle and `esbuild` for the server.
- `db:push` — runs `drizzle-kit push` to sync schema to the database.

---

## External Dependencies

| Dependency | Purpose |
|---|---|
| ESV API (`api.esv.org`) | Bible verse text by reference (English Standard Version, requires `ESV_API_KEY`) |
| OpenAI (via Replit AI Integrations) | Quiz question generation using gpt-4o-mini |
| Evolink.ai (Suno v5) | Music/song generation from scripture text (requires `EVOLINK_API_KEY`) |
| `expo-av` | Audio playback for generated songs |
| `AsyncStorage` | Client-side persistence for verse cache and saved bookmarks |
| PostgreSQL (via `DATABASE_URL`) | Database for user data (provisioned externally, e.g. Replit DB) |
| Drizzle ORM + drizzle-kit | Database schema management and query building |
| Expo SDK (~54) + Expo Router (v6) | Cross-platform app framework and file-based navigation |
| TanStack React Query v5 | Server-state management and caching for API calls |
| react-native-reanimated | Fluid animations and skeleton loading shimmer |
| expo-haptics | Tactile feedback on native platforms |
| expo-blur, expo-glass-effect | Visual effects for tab bar and UI surfaces |
| `@expo-google-fonts/lora`, `@expo-google-fonts/inter` | Custom typography |
| react-native-gesture-handler | Gesture recognition foundation |
| react-native-keyboard-controller | Keyboard-aware scrolling on native |
| express (v5) | Backend HTTP server |
| esbuild | Server TypeScript bundling for production |
| patch-package | Patching node_modules post-install |