# Mint AI Coding Guide

## Big picture (React + Vite + Capacitor hybrid app)
- **Routing**: Hash-based routing centralized in [src/App.jsx](src/App.jsx) using `currentPage` and `authStep` state; no router library. Pages are feature modules under [src/pages/](src/pages/), wired via `onOpenXxx` callbacks from `App.jsx`.
- **Layouts**: Two layouts — `AuthLayout` for auth flows and `AppLayout` for the main app shell (see [src/layouts/AppLayout.jsx](src/layouts/AppLayout.jsx)). `AppLayout` includes bottom navbar.
- **Backend**: Supabase (auth + data). The client lives in [src/lib/supabase.js](src/lib/supabase.js) and is used by hooks in [src/lib/](src/lib/). Always check `if (!supabase)` before queries.
- **Notifications**: App-wide state via context in [src/lib/NotificationsContext.jsx](src/lib/NotificationsContext.jsx), mounted in `main.jsx`.
- **Server middleware**: Express server in [server/index.cjs](server/index.cjs) handles Sumsub KYC token generation and TruID bank linking. Runs on port 3001, proxied via Vite (`/api/*` → `localhost:3001`).

## Critical workflows
- **Dev server**: `npm run dev` (starts both server/index.cjs and Vite on localhost:5000).
- **Build**: `npm run build` (outputs to `dist/`, used by Capacitor `webDir` in capacitor.config.json).
- **Mobile sync**: `npx cap sync ios|android` after build to update native projects.
- **Android testing**: `npm run build && npx cap sync android && cd android && ./gradlew assembleDebug && adb install -r app/build/outputs/apk/debug/app-debug.apk`.

## Project-specific patterns
- **Data hooks**: Use `isMounted` flag to prevent setState after unmount. Always guard missing envs: check `if (!supabase)` before queries (see [src/lib/useProfile.js](src/lib/useProfile.js)).
- **Supabase queries**: Use `.maybeSingle()` for optional rows. Auto-create missing rows on first access (see `useRequiredActions` in [src/lib/useRequiredActions.js](src/lib/useRequiredActions.js)).
- **Auth logic**: Consolidated in the large [src/components/AuthForm.jsx](src/components/AuthForm.jsx) component. Implements rate-limits (5 attempts → 5min cooldown → 30min cooldown), OTP flows (6-digit codes with 180s expiry), and resend cooldowns.
- **Biometrics**: Must check `(isNativeIOS() || isNativeAndroid())` from [src/lib/biometrics.js](src/lib/biometrics.js) — never iOS-only checks. Android requires both `USE_BIOMETRIC` and `USE_FINGERPRINT` permissions in AndroidManifest.xml (see [ANDROID_QUICK_REFERENCE.md](ANDROID_QUICK_REFERENCE.md)).
- **localStorage usage**: Feature flags (`biometricsEnabled`, `biometricsUserEmail`, `hasLoggedInBefore`) and loan state (`activeApplicationId`) stored in localStorage. See [src/lib/biometrics.js](src/lib/biometrics.js) and [src/lib/loanApplication.js](src/lib/loanApplication.js).
- **Caching**: Strategy data cached in-memory with 60s TTL (see [src/lib/strategyData.js](src/lib/strategyData.js)). Price history cached per `${strategy_id}_${timeframe}` key.

## Strategy + markets data flow
- **Source of truth**: Strategy prices and metrics come from `strategy_metrics` and `strategy_prices` tables via [src/lib/strategyData.js](src/lib/strategyData.js). Never compute strategy prices from securities.
- **Data flow**: [src/pages/MarketsPage.jsx](src/pages/MarketsPage.jsx) lists strategies → [src/pages/FactsheetPage.jsx](src/pages/FactsheetPage.jsx) shows details → [src/pages/OpenStrategiesPage.jsx](src/pages/OpenStrategiesPage.jsx) for active positions.
- **Charts**: Use Recharts (`ComposedChart`, `Area`, `Line`, `ResponsiveContainer`) for all data viz. See [src/components/StrategyReturnChart.jsx](src/components/StrategyReturnChart.jsx) for pattern.

## Payments + KYC
- **Paystack**: Client-side integration. SDK loaded in [index.html](index.html) via `<script src="https://js.paystack.co/v2/inline.js">`. Wired in [src/pages/PaymentPage.jsx](src/pages/PaymentPage.jsx) using `window.PaystackPop()`.
- **Sumsub KYC**: Server generates access tokens via [server/index.cjs](server/index.cjs). Client uses `@sumsub/websdk-react` in [src/components/SumsubVerification.jsx](src/components/SumsubVerification.jsx).

## Styling conventions
- **Tailwind CSS only**: Compose classes instead of inline styles. No CSS modules or styled-components.
- **Component pattern**: Shared inputs use `forwardRef` and className merging (see [src/components/TextInput.jsx](src/components/TextInput.jsx)).
- **UI library**: Custom components in [src/components/ui/](src/components/ui/) imported via `@/components/ui/*` alias.
- **Animation**: Framer Motion used for page transitions and micro-interactions.

## Env requirements
- **Required**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_PAYSTACK_PUBLIC_KEY`.
- **Server-side**: `SUMSUB_APP_TOKEN`, `SUMSUB_SECRET_KEY`, `SUMSUB_LEVEL_NAME` for KYC.

## Reference map
- Router + state: [src/App.jsx](src/App.jsx)
- Auth + rate limiting: [src/components/AuthForm.jsx](src/components/AuthForm.jsx)
- Supabase client: [src/lib/supabase.js](src/lib/supabase.js)
- Strategy data + caching: [src/lib/strategyData.js](src/lib/strategyData.js)
- Biometrics (iOS + Android): [src/lib/biometrics.js](src/lib/biometrics.js)
- Server middleware: [server/index.cjs](server/index.cjs)
- Recharts pattern: [src/components/StrategyReturnChart.jsx](src/components/StrategyReturnChart.jsx)

