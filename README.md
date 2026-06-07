# ☕ Caffeine Calculator

Snap a photo of any drink and get its caffeine content, then track your daily &
weekly intake against personalized limits. Built **Korea-first** (labels here are
legally required to print total caffeine in mg) but works globally.

- **Mobile app:** React Native + Expo (runs in **Expo Go**, no native build needed for v1)
- **Vision:** one Google **Gemini** call reads the label / recognizes the drink / estimates
- **Backend:** a tiny **Cloudflare Worker** that just holds the API key (no database in v1)
- **Storage:** on-device **SQLite** (`expo-sqlite`)

---

## How it works — the recognition cascade

One snap runs a short cascade and stops at the first confident answer:

1. **Barcode** → looked up in [Open Food Facts](https://world.openfoodfacts.org) (free).
2. **Vision (Gemini)** → reads a printed caffeine label (`총 카페인 함량 100mg`),
   recognizes a branded drink, or estimates from drink type + size. Returns
   structured JSON: `{ caffeine_mg, confidence, method, product_name, serving_ml, source_text }`.
3. **Cross-check** against the seed reference table (`data/caffeine_reference.json`)
   to fill in or validate the number.

The result screen shows the amount, a method/confidence badge, "how we got this,"
and an editable correction before it's added to your log.

---

## Project layout

```
app/                     Expo Router screens
  _layout.tsx            root stack + providers
  (tabs)/index.tsx       Today dashboard (in-system + daily total vs limit)
  (tabs)/log.tsx         history (7-day chart + entries)
  (tabs)/profile.tsx     weight/age/pregnancy/half-life/language
  camera.tsx             capture + barcode scan
  result.tsx             result + edit + add to log
lib/
  cascade.ts             barcode → worker → cross-check
  halflife.ts            limits + half-life decay math (pure, tested)
  reference.ts           seed-table lookup (pure, tested)
  store.ts               SQLite intake log + profile
  i18n.ts                ko/en strings
  app-context.tsx        profile + locale provider
data/caffeine_reference.json   seed caffeine values
worker/                  Cloudflare Worker (vision proxy)
  src/index.ts           POST /analyze
  src/vision.ts          provider-agnostic adapter (Gemini v1)
__tests__/               jest unit tests
```

---

## Setup

### Prerequisites
- Node.js 18+ and npm
- The **Expo Go** app on your phone (iOS/Android), or a simulator
- A free **Google Gemini API key** → https://aistudio.google.com/apikey
- A free **Cloudflare account** (for deploying the worker)

### 1. Install the app

```bash
npm install
```

### 2. Deploy the worker (holds your Gemini key)

```bash
cd worker
npm install
npx wrangler login                 # opens browser, one-time
npx wrangler secret put GEMINI_API_KEY   # paste your key when prompted
npm run deploy                     # prints your worker URL
```

Copy the deployed URL and set it in **`app.json`** →
`expo.extra.analyzeApiUrl`, including the `/analyze` path:

```json
"analyzeApiUrl": "https://caffeine-analyze.<your-subdomain>.workers.dev/analyze"
```

> **Run the worker locally instead?** Create `worker/.dev.vars` with
> `GEMINI_API_KEY=...`, run `npm run dev` in `worker/`, and point
> `analyzeApiUrl` at the printed `http://localhost:8787/analyze`
> (use your machine's LAN IP so your phone can reach it).

### 3. Start the app

```bash
npm start          # scan the QR code with Expo Go
```

---

## Testing

```bash
npm test                       # unit tests (halflife, reference, cascade)
cd worker && npm run typecheck # worker type-check
```

Manual smoke test of the worker once deployed:

```bash
curl -X POST "$WORKER_URL/analyze" \
  -H 'Content-Type: application/json' \
  -d "{\"image_base64\":\"$(base64 -w0 sample.jpg)\"}"
```

---

## Caffeine limits used

| Group | Daily limit | Source |
|---|---|---|
| Adults | 400 mg (single dose ≤200 mg) | 식약처 / EFSA |
| Pregnant / nursing | 200 mg | EFSA (stricter of EFSA 200 / 식약처 300) |
| Under 18 | 2.5 mg/kg body weight | 식약처 |

The "caffeine in your system" view uses a first-order **~5 h half-life** (tunable
per user in Profile). These are general guidance, **not medical advice**.

---

## Roadmap

1. **v1 (this):** Gemini does all vision; barcodes via camera; on-device SQLite.
2. **Cache** barcode/product → caffeine so repeat scans skip the model (biggest cost lever).
3. **ML Kit** on-device for barcode + label OCR (free/offline fast-path); Gemini only for recognition/estimate. *(Needs an EAS dev build — ML Kit is a native module.)*
4. **Model upgrade:** Gemini paid tier or **Claude** for accuracy/privacy (swap in `worker/src/vision.ts`).
5. **Cloud sync:** Neon (Postgres) + accounts; Apple Health / Health Connect.
6. **Data + monetization:** expand sources (식약처/USDA); freemium when there's traction.

> Privacy note: Gemini's **free** tier may use submitted data to improve Google
> products — disclose this in your privacy policy, and move to a paid tier or
> Claude before handling sensitive user data at scale.
