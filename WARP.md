# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Commands

- Install deps:
  - npm install
- Env setup:
  - Copy .env.example to .env.local
  - Required: GEMINI_API_KEY
  - Optional: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_MAIL_BRIDGE_URL
- Web dev (Vite):
  - npm run dev
  - On LAN/mobile: npm run dev:mobile-live
- Desktop (Electron):
  - Dev: npm run electron:dev
  - Build: npm run electron:build
- Mail bridge (local API for IMAP/POP3 over HTTPS):
  - npm run mail:server
  - Docker/hosted deploy: see server/DEPLOY.md
- Mobile (Capacitor/Android):
  - Preview mobile build on LAN: npm run dev:mobile
  - Build mobile bundle: npm run build:mobile
  - Serve mobile bundle: npm run serve:mobile
  - Android APK (Windows): npm run android:apk:win
- Build/preview (web):
  - Full build (typecheck + bundle): npm run build
  - Quick bundle (no tsc): npm run build:quick
  - Preview prod: npm run preview
- Typecheck:
  - npx tsc --noEmit
- Run a single test (ad-hoc scripts in repo root):
  - node test-timezone.js
  - node test-friends-table.js

## High-level architecture

- Targets
  - Web SPA (Vite + React + TypeScript)
  - Desktop (Electron: electron/main.cjs, electron/preload.cjs)
  - Mobile (Capacitor + Android project under android/; MOBILE_BUILD env toggles dev behavior)
- App entrypoints
  - index.tsx → src/App.tsx / src/Main.tsx
  - index.html and index-cyberpunk.html (multi-entry configured in vite.config.ts)
- Core layers (src/)
  - contexts/: global state (AuthContext, I18nContext, AdminAuthContext)
  - services/: side-effects and integrations
    - supabaseClient.ts (auth + optional sync)
    - geminiService.ts (Google Generative AI)
    - reminderService.ts, dailyArchiveScheduler.ts (notifications/scheduling)
    - emailService.* (bridge-aware mail helpers)
    - contextMemoryService.ts, analytics/task services
  - hooks/: platform and UX behaviors (speech, geo, settings, mobile optimization)
  - components/ and pages/: UI composition (task list, modals, admin pages)
  - styles/: Tailwind pipeline (see postcss.config.js, tailwind.config.js)
- External services and backend
  - Supabase: migrations under supabase/ and database/migrations/, used for auth and data storage with RLS
  - Mail Bridge (server/): Express service (mail-server.cjs) to proxy IMAP/POP3 via HTTPS; Dockerfile provided; configured via VITE_MAIL_BRIDGE_URL
- Build tooling
  - Vite config (vite.config.ts) sets dual entries, CSP headers, MOBILE_BUILD switches, terser optimizations, and manualChunks
  - Electron packaging via electron-builder (configured in package.json build)
  - Capacitor sync/build scripts for Android; env injection via scripts/inject-env-android.js

## Notes for Warp

- No dedicated lint or unit test runner is configured; rely on TypeScript strict checks and ad-hoc test scripts (node test-*.js).
- For combined dev flows:
  - Web + Mail bridge: npm run dev:full
  - All (web+mail+mobile preview+electron): npm run dev:all
- Deployment references:
  - Web/SPA: npm run build then host dist/
  - Electron installers: npm run electron:build
  - Mail Bridge hosting: server/DEPLOY.md (Docker and PaaS options)
