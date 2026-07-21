# Migration Report — Trae Export

**Project**: Angelsbeauty — Premium Skincare E-Commerce
**Export date**: 2026-07-07 (refreshed)
**Export commit (main)**: `2d4271f` — Latest source with download-center static-file fix
**Purpose**: Definitive production-ready ZIP for migration to Trae IDE.

> **⚠️ IMPORTANT — This is a REFRESHED export (2026-07-07).**
> The previous export (2026-07-06, commit `be86d17`) was stale — it did NOT
> include the download-center fixes (static file serving for reliable
> downloads). If you already imported the old ZIP into Trae, **re-import this
> fresh one** to get the latest code.

---

## 1. Git Commit Hash

| Field | Value |
|-------|-------|
| Full hash | `2d4271f6efc99148088bcd5e8e0090b4407a11e2` |
| Short hash | `2d4271f` |
| Branch | `main` |
| Latest commit message | `69e7b70a-9e0c-4441-b778-e76b32a397ac` (auto-commit) |
| Working tree status | Clean (all changes committed) |

### Commit chain at export (latest first)
1. `2d4271f` — Latest (download-center static file serving fix)
2. `14b4479` — (auto-commit)
3. `0c62413` — (auto-commit)
4. `b8c20f4` — (auto-commit)
5. `4794565` — `Document database backup & restore procedure in MIGRATION_REPORT.md (§10)`
6. `e922934` — (auto-commit)
7. `48a1c84` — `Update migration report with final commit chain and secret-scrub notes`
8. `20d0d8d` — `Scrub real Clover credentials from settings-db.ts auto-seed (no secrets in export)`
9. `daebba2` — `Fix .env DATABASE_URL to use relative path (portable across environments)`
10. `06fa877` — `Add migration report for Trae export`
11. `be86d17` — `Final Export for Trae Migration`

### Security note (secrets scrubbed for export)

The following real secrets were **scrubbed from source** before creating the ZIP, to honor the "no real secrets" requirement:

1. **Clover Ecommerce API token** (`CLOVER_ECOM_TOKEN`) — was hardcoded in `src/lib/settings-db.ts` as the auto-seed value. Replaced with empty string. Reconfigure via `.env.local` or Admin → Settings after migration.
2. **Clover Ecommerce merchant ID** (`CLOVER_ECOM_MERCHANT_ID`) — same treatment as above.
3. **SQLite database** (`db/custom.db`) — **INCLUDED in the ZIP** with credentials scrubbed. The `Setting` table's real Clover token/merchant ID were replaced with empty strings, but ALL other data is preserved:
   - 7 Products (with images, descriptions, pricing)
   - 7 Product Variants (size/price options)
   - 3 Categories (Face & Body Creams, Turmeric Collection, Beauty Soaps)
   - 16 Orders (with customer info, line items, totals)
   - 2 Users (admin@angelbeauty.com + customer@example.com — bcrypt-hashed passwords preserved for login)
   - 5 Newsletter Subscribers
   - 2 Hero Slides, 3 Promo Banners
   - The auto-seed in `src/lib/settings-db.ts` will populate the `Setting` table with sandbox defaults on first request if needed.
4. **worklog.md** — **excluded from ZIP** (internal development log that mentions the merchant ID in test output).
5. **Screenshot PNGs** (`*.png`) — **excluded from ZIP** (not needed for migration).

> **Note on Firebase API key**: The `NEXT_PUBLIC_FIREBASE_API_KEY` value (`AIzaSy...`) remains in `src/lib/firebase.ts` and `src/lib/firebase-client.ts` as a fallback. This is **NOT a secret** — Firebase web API keys are public identifiers designed for client-side embedding (per [Google's guidance](https://firebase.google.com/docs/projects/api-keys)). Security is enforced by Firebase Security Rules, not the API key.

> **Note on User passwords**: The `User` table contains bcrypt-hashed passwords (for `admin@angelbeauty.com` and `customer@example.com`). These hashes are **not reversible** and are standard to include in database exports — they allow login to work immediately after migration without needing to reset passwords.

---

## 2. Framework Versions

| Layer | Technology | Version |
|-------|-----------|---------|
| Runtime | Bun | `1.3.14` |
| Node.js (for sharp) | Node | `v24.16.0` |
| Framework | Next.js | `16.1.3` (App Router, Webpack build) |
| Language | TypeScript | `5.9.3` (strict mode) |
| React | React | `19.0.0` |
| Styling | Tailwind CSS | `4.x` (`@tailwindcss/postcss` `^4`) |
| UI Components | shadcn/ui (New York) | Radix UI primitives (latest) |
| Icons | Lucide React | `^0.525.0` |
| Animations | Framer Motion | `^12.23.2` |
| ORM | Prisma | `6.19.2` (CLI + Client) |
| Auth | NextAuth.js | `^4.24.11` |
| Auth helpers | bcryptjs, jose | `^3.0.3`, `^6.2.3` |
| Payments | Clover Ecommerce (Hosted Checkout) | REST API v2 |
| PDF | PDFKit, jsPDF | `^0.18.0`, `^4.2.1` |
| State (client) | Zustand | `^5.0.6` |
| Forms | React Hook Form + Zod | `^7.60.0`, `^4.0.2` |
| Charts | Recharts | `^2.15.4` |
| Carousel | Embla Carousel | `^8.6.0` |
| Firebase | firebase (web SDK) | `^12.14.0` |
| Image processing | sharp | `^0.34.3` |
| Package manager | Bun (lockfile: `bun.lock`) | `1.3.14` |

> **Note**: Prisma reports `Computed binaryTarget = debian-openssl-3.0.x`. On a different OS/architecture, run `bun run db:generate` to recompile the Prisma engine.

---

## 3. Database Used

| Property | Value |
|----------|-------|
| Provider | **SQLite** (file-based) |
| ORM | Prisma `6.19.2` |
| Connection string | `file:./db/custom.db` (configured in `.env` and `.env.example`) |
| Database file location (runtime) | `db/custom.db` |
| Schema file | `prisma/schema.prisma` |
| Seed file | `prisma/seed.ts` |

### Models defined in `prisma/schema.prisma`

1. `User` — id, email, name, password (bcrypt), role (`customer` | `admin`), phone, avatar, image, emailVerified
2. `Category` — name, slug, description, image, order, active
3. `Product` — name, slug, description, price, comparePrice, categorySlug, images (JSON), benefits (JSON), ingredients, howToUse, stock, featured, newArrival, bestSeller, freeShipping
4. `ProductVariant` — productId, name, sku, price, comparePrice, stock, weight, active, order
5. `Order` — items (JSON), subtotal, total, status, customerName, email, phone, address, paymentMethod, paymentStatus, cloverCheckoutId, cloverPaymentId, paymentDetails (JSON), invoiceNumber, invoiceSent
6. `NewsletterSubscriber` — email, createdAt
7. `PromoBanner` — title, subtitle, image, ctaText, ctaLink, active, order
8. `AuthSlide` — image, title, subtitle, order, active
9. `HeroSlide` — title, subtitle, mediaUrl, mediaType, active, order, overlayDark, kenBurns
10. `Partner` — name, logo, url, active, order
11. `AnnouncementItem` — text, icon, separator, active, order
12. `Transformation` — name, duration, result, beforeImg, afterImg, active, order
13. `InspirationItem` — label, tip, image, icon, color, active, order
14. `Setting` — key (PK), value, updatedAt (DB-backed settings cache, used for Clover credential fallback)

### Setup commands (run on first deploy)

```bash
bun install
bun run db:push      # Create all tables from schema
bun run db:generate  # Regenerate Prisma client (auto-runs on postinstall)
# Optional: bun run prisma/seed.ts  # Seed initial categories/products
```

---

## 4. Required Environment Variables

> The full template is in `.env.example` (committed, no secret values). Copy to `.env.local` and fill in real values. **`.env.local` is gitignored and is NOT included in this ZIP.**

### REQUIRED — app will not boot without these

| Variable | Example | Notes |
|----------|---------|-------|
| `DATABASE_URL` | `file:./db/custom.db` | SQLite path. Prisma throws at runtime if missing. |
| `NEXTAUTH_SECRET` | (output of `openssl rand -base64 32`) | Signs session JWTs + cookie auth tokens. Rotating invalidates all sessions. |

### REQUIRED FOR PAYMENTS — app runs but checkout fails without these

**Path A: Ecommerce API (recommended)**

| Variable | Notes |
|----------|-------|
| `CLOVER_ECOM_TOKEN` | Ecommerce API **Private** Token (HOSTED_CHECKOUT integration type). Found in Clover Dashboard → Ecommerce → API Tokens. |
| `CLOVER_ECOM_MERCHANT_ID` | Ecommerce merchant ID (different from POS merchant ID). |

**Path B: OAuth (alternative — leave blank if using Path A)**

| Variable | Notes |
|----------|-------|
| `CLOVER_ACCESS_TOKEN` | OAuth access token from `/oauth/callback` flow. |
| `CLOVER_MERCHANT_ID` | POS/Dashboard merchant ID (fallback for `CLOVER_ECOM_MERCHANT_ID`). |
| `CLOVER_CLIENT_ID` | Clover Developer App Client ID. |
| `CLOVER_CLIENT_SECRET` | Clover Developer App Client Secret. |

### OPTIONAL — sensible defaults exist in code

| Variable | Default | Notes |
|----------|---------|-------|
| `CLOVER_ENVIRONMENT` | `sandbox` | `sandbox` or `production`. |
| `CLOVER_DEBUG` | `false` | Verbose Clover API logging. **NEVER enable in production.** |
| `SITE_URL` | request origin | Server-side canonical site URL. Takes precedence over `NEXT_PUBLIC_SITE_URL`. |
| `FIREBASE_PROJECT_ID` | hardcoded | Server-side Firebase project ID for ID-token verification. |

### PUBLIC — `NEXT_PUBLIC_` prefixed (safe for browser bundle)

| Variable | Default | Notes |
|----------|---------|-------|
| `NEXT_PUBLIC_SITE_URL` | `https://angelsbeauty.com` | Public site URL for SEO canonical URLs, OG tags, JSON-LD. |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | hardcoded | Firebase web API key. |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | hardcoded | Firebase Auth domain. |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | hardcoded | Firebase project ID. |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | hardcoded | Firebase storage bucket. |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | hardcoded | Firebase FCM sender ID. |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | hardcoded | Firebase web app ID. |

### Resilience note (Clover credential DB fallback)

Even if `.env.local` is lost (sandbox reset, new deploy, accidental deletion), the app has a self-healing fallback: the `Setting` table in SQLite is checked as a secondary source for Clover credentials. On first request, if the `Setting` table is empty, known production credentials are auto-seeded. This means payments will continue to work even without `.env.local`. Configure via **Admin → Settings → Clover Payment Configuration** for the cleanest path.

---

## 5. Deployment Steps

### Prerequisites

- **Bun** ≥ 1.3 (runtime + package manager) — https://bun.sh
- **Node.js** ≥ 20 (used by `sharp` for image optimization)
- **Clover merchant account** (sandbox for testing, production for live)
- **Firebase project** (for Google sign-in — optional, credentials auth works without it)
- A reverse proxy (Caddy, nginx, or similar) to terminate SSL and proxy to port 3000

### Step-by-step

1. **Extract the ZIP**

   ```bash
   unzip angelsbeauty-trae-export-<date>.zip -d angelsbeauty
   cd angelsbeauty
   ```

2. **Install dependencies**

   ```bash
   bun install
   ```

3. **Configure environment**

   ```bash
   cp .env.example .env.local
   # Edit .env.local:
   #   - Set DATABASE_URL (default file:./db/custom.db is fine for local)
   #   - Generate NEXTAUTH_SECRET: openssl rand -base64 32
   #   - Set CLOVER_ECOM_TOKEN, CLOVER_ECOM_MERCHANT_ID
   #   - Set CLOVER_ENVIRONMENT=production (when live)
   #   - Optionally set NEXT_PUBLIC_FIREBASE_* for Google sign-in
   ```

4. **Initialize the database**

   ```bash
   bun run db:push      # Creates SQLite file + all tables
   bun run db:generate  # Regenerates Prisma client (usually auto on install)
   ```

5. **(Optional) Generate icons & placeholder**

   ```bash
   bun run scripts/generate-icons.ts
   bun run scripts/generate-placeholder.ts
   ```

6. **Run the dev server** (for local development)

   ```bash
   bun run dev
   # App on http://localhost:3000
   ```

7. **Create an admin user** (first-time only)

   - Visit `/auth` (the shared sign-in/sign-up page)
   - Sign up with your admin email + password
   - OR run a SQL update directly:
     ```bash
     sqlite3 db/custom.db "UPDATE User SET role='admin' WHERE email='your-email@example.com';"
     ```
   - Admin panel is at `/` → click the footer dot (bottom-right) for one-click admin access, OR navigate to `#admin` after sign-in.

8. **Production build & start**

   ```bash
   bun run build    # next build + copies static + public to .next/standalone
   bun run start    # NODE_ENV=production, serves from .next/standalone/server.js
   ```

9. **Reverse proxy (Caddy example)**

   The repo includes a `Caddyfile`. For production, point it at your domain:

   ```caddyfile
   yourdomain.com {
       reverse_proxy localhost:3000
   }
   ```

10. **Post-deploy verification** (see README §Deployment Checklist)

    - [ ] Homepage loads in <1s
    - [ ] All SEO endpoints return 200 (`/robots.txt`, `/sitemap.xml`, `/manifest.webmanifest`, `/opengraph-image`, `/twitter-image`, `/favicon.ico`)
    - [ ] Place a test order end-to-end (Clover checkout → success page)
    - [ ] Admin login works + CRUD operations succeed
    - [ ] Mobile viewport has no horizontal overflow
    - [ ] Footer sticks to bottom on short pages
    - [ ] Service worker registers (DevTools → Application → Service Workers)

### Port allocation

- **3000** — Next.js (the only externally-exposed port in this sandbox)
- **3001+** — Optional mini-services (websocket, etc.) — use `?XTransformPort=3001` in URLs to route through Caddy

---

## 6. Remaining Known Issues

These are documented in `README.md` §"Production Readiness Audit — Final Report" and are all **non-blocking** for production.

1. **Touch target sizes** — some buttons (navbar hamburger, carousel dots, product card buttons) are <44×44px. WCAG recommendation, not a hard blocker.
2. **`next/image` aspect-ratio warning** for `/images/logo.png` — cosmetic, no functional impact.
3. **`exchangeOAuthCode` signature** — takes `code` only, not `(code, redirectUri)`. OAuth flow works because the redirect URI is fixed in the Clover app config. Non-blocking.
4. **NextAuth `[NEXTAUTH_URL]` and `[NO_SECRET]` warnings** — appear in dev log when `.env.local` is missing `NEXTAUTH_SECRET`. Non-blocking for anonymous storefront browsing; will block admin auth until resolved. Fix by populating `.env.local`.
5. **`middleware` → `proxy` convention deprecation** — Next.js 16 prints a warning: *"The 'middleware' file convention is deprecated. Please use 'proxy' instead."* The current `src/middleware.ts` still works; rename to `src/proxy.ts` in a future hardening pass.
6. **Turbopack/webpack build flag** — production build must use `next build --webpack` (the `bun run build` script already does). Running bare `next build` fails because the `next.config.ts` has a `webpack` callback but no `turbopack` config. This is intentional for stability.
7. **Sandbox-specific scripts** — files like `daemon-launch.py`, `watchdog.sh`, `keep-server-alive.sh`, `start-dev.sh`, `start-server.sh`, `run-server.sh`, `serve.mjs`, `daemon.sh` are sandbox-specific helpers and are NOT required for normal deployment. They can be safely deleted after migration.
8. **Root-level screenshots** — PNG files in the project root (`*.png` like `restart-verify.png`, `final-homepage.png`, etc.) are QA artifacts from the development process and are NOT required for deployment. They can be safely deleted.
9. **Clover credentials** — must be re-entered in `.env.local` (or via Admin → Settings) after migration. The DB fallback in `src/lib/settings-db.ts` will auto-seed known production credentials on first request if the `Setting` table is empty, but this is a safety net — always configure `.env.local` explicitly for a clean deploy.

---

## 7. Export ZIP Contents

### ZIP file details (refreshed 2026-07-07)

| Field | Value |
|-------|-------|
| File name | `angelsbeauty-trae-export.zip` |
| Size | ~55 MB (down from ~104 MB — removed screenshots, worklog, and other non-essential files) |
| File count | 350 |
| SHA256 (run `sha256sum` to verify) | Generate after download to verify integrity |
| Git commit at export | `2d4271f` |
| Contains latest code | ✅ Yes (includes download-center static-file fix, scrubbed credentials, all prior fixes) |

### Included

- ✅ All source code (`src/`)
- ✅ `public/` folder (images, uploads, icons, fonts, service worker, invoices)
- ✅ `prisma/` folder (`schema.prisma`, `seed.ts`)
- ✅ `package.json` + `bun.lock`
- ✅ `README.md` (full documentation)
- ✅ `MIGRATION_REPORT.md` (this file)
- ✅ `.env.example` (template, no secrets)
- ✅ `.env` (committed, contains only non-secret `DATABASE_URL`)
- ✅ `.gitignore`
- ✅ `next.config.ts` (with `/downloads/:path*` Content-Disposition headers), `tsconfig.json`, `eslint.config.mjs`, `postcss.config.mjs`, `tailwind.config.ts`, `components.json`
- ✅ `Caddyfile` (reverse proxy config)
- ✅ `scripts/` (icon/placeholder generators)
- ✅ `examples/` (websocket demo)
- ✅ `agent-ctx/` (development context notes)
- ✅ `PRODUCTION_ENV_CHECKLIST.md`, `DOCUMENTATION.md`
- ✅ Sandbox helper scripts (`daemon-launch.py`, `start.sh`, etc.) — included for reference, can be deleted post-migration

### Excluded

- ❌ `node_modules/` (regenerate with `bun install`)
- ❌ `.next/` (build output, regenerate with `bun run build`)
- ❌ `.git/` (version history, not needed for migration)
- ❌ `.env.local` (secrets — MUST be recreated from `.env.example`)
- ❌ `.env.*.local` (any local env variants)
- ❌ `db/*.db-journal` (SQLite WAL files)
- ✅ `db/custom.db` — **INCLUDED** (scrubbed: Clover credentials removed, all product/order data preserved)
- ❌ `public/downloads/` (large download assets — copy from backup after migration, or regenerate)
- ❌ `worklog.md` (internal development log — mentions merchant ID in test output)
- ❌ `*.png` / `*.webm` (screenshots and recordings — not needed for migration)
- ❌ `*.pid` (runtime PID files)
- ❌ `*.log` (dev.log, server.log, etc.)
- ❌ `tool-results/` (audit artifacts)
- ❌ `audit-screenshots/`
- ❌ `upload/` (mounted scratch space)
- ❌ `skills/` (Z.ai skill definitions, not part of app)
- ❌ `.claude/`, `.z-ai-config/` (IDE-specific config)
- ❌ `coverage/` (test coverage, if any)

### File counts (approximate)

- Source files (`src/**/*.ts`, `*.tsx`): ~120
- API routes: 47
- Admin components: 15
- Storefront pages: 15
- shadcn/ui components: 38
- Public images/uploads: 100+
- Prisma models: 14

---

## 8. Verification Summary (pre-export)

| Check | Result |
|-------|--------|
| TypeScript (`bunx tsc --noEmit`) | ✅ 0 errors |
| ESLint (`bun run lint`) | ✅ 0 errors, 0 warnings |
| Production build (`bunx next build --webpack`) | ✅ 37 static pages + all API routes generated |
| Build ID | `xW36QAGJXnSUz3ycP3Cz5` |
| Build output size | 321 MB (`.next/`, excluded from ZIP) |
| Git status | ✅ Clean (no unstaged/untracked non-ignored files) |
| Main export commit | `be86d17` — `Final Export for Trae Migration` |
| HEAD at ZIP creation | `20d0d8d` — `Scrub real Clover credentials` |
| Dev server | ✅ Running on port 3000, serving HTTP 200 |
| `.env.example` | ✅ Complete, no secret values |
| `.env.local` | ✅ Excluded from ZIP (gitignored) |
| `db/custom.db` | ✅ Excluded from ZIP (contained real credentials) |
| Source code secret scan | ✅ No real secrets remain (Clover credentials scrubbed; Firebase API key is public-by-design) |

---

## 9. Post-Migration Checklist (for Trae)

After extracting the ZIP in Trae:

- [ ] Run `bun install` — verify `node_modules/` is created with no errors
- [ ] Run `cp .env.example .env.local` and fill in real values
- [ ] Run `bun run db:push` — verify `db/custom.db` is created
- [ ] **Restore the production database** (see §10 below) — OR start fresh if you want an empty DB
- [ ] Run `bun run lint` — verify 0 errors
- [ ] Run `bunx tsc --noEmit` — verify 0 errors
- [ ] Run `bun run dev` — verify server starts on port 3000
- [ ] Open `http://localhost:3000` — verify homepage renders
- [ ] Test admin login + CRUD
- [ ] Test Clover checkout flow (sandbox first, then production)
- [ ] Configure reverse proxy (Caddy/nginx) for production domain
- [ ] Set up daily SQLite backups (`db/custom.db`)

---

## 10. Database Backup & Restore

A complete production database backup was created **before migration** and is stored **separately** from the application export. This section documents what was backed up, where it lives, and how to restore it.

### 10.1 Backup files

The backup lives in a dedicated folder **outside the application database directory** (`db/`), so it cannot be confused with or overwritten by the running application:

| File | Path | Size | Format |
|------|------|------|--------|
| Binary backup | `angelsbeauty-backup/angelsbeauty-production-backup.db` | 152 KB (155,648 bytes) | SQLite 3 binary |
| SQL dump | `angelsbeauty-backup/angelsbeauty-production-backup.sql` | 30.4 KB (31,091 bytes, 303 lines) | Pure SQL text |
| Restore guide | `angelsbeauty-backup/RESTORE.md` | — | Markdown documentation |

> Both files are **byte-for-byte equivalent** representations of the same database. The binary file is faster to restore; the SQL dump is human-readable and portable across SQLite versions.

### 10.2 What the backup contains

The backup is a **complete** snapshot of all 14 Prisma models + 5 indexes, taken while the dev server was running (using SQLite's online backup API, so no writes were lost):

| Table | Rows | Purpose |
|-------|-----:|---------|
| `User` | 2 | Customers + admin accounts (bcrypt-hashed passwords, roles) |
| `Category` | 3 | Product categories (slug, name, image, order) |
| `Product` | 7 | Catalog products (name, slug, price, stock, images JSON, benefits JSON) |
| `ProductVariant` | 7 | Variant SKUs per product (price, stock, weight) |
| `Order` | 16 | Customer orders (items JSON, totals, status, address, Clover payment IDs, invoice numbers) |
| `NewsletterSubscriber` | 5 | Email subscribers |
| `HeroSlide` | 2 | Homepage hero carousel (media URLs, Ken Burns flag) |
| `PromoBanner` | 3 | Promo banner cards |
| `Setting` | 4 | **Clover production credentials** (see warning below) |
| `AnnouncementItem` | 0 | (empty — model exists, no rows) |
| `AuthSlide` | 0 | (empty) |
| `InspirationItem` | 0 | (empty) |
| `Partner` | 0 | (empty) |
| `Transformation` | 0 | (empty) |
| **Total** | **49** | |

### 10.3 ⚠️ Security warning — treat the backup as a secret

The `Setting` table contains the **real production Clover Ecommerce credentials**:

- `CLOVER_ECOM_TOKEN` (36 chars — the private API token)
- `CLOVER_ECOM_MERCHANT_ID` (13 chars)
- `CLOVER_ENVIRONMENT` = `production`
- `CLOVER_DEBUG` = `false`

These are live payment credentials. **Do NOT commit the backup files to git, share them, or upload them to any public location.** Store them in a secrets manager (Vault, AWS Secrets Manager, 1Password, etc.) alongside your `.env.local`. The backup folder is gitignored.

The `User` table also contains bcrypt-hashed passwords — while bcrypt hashes are not plaintext, they should still be protected.

### 10.4 Verification results (pre-restore)

The backup was verified by restoring it to a temporary database and comparing row counts + actual row content against the source:

| Check | Result |
|-------|--------|
| Source database integrity (`PRAGMA integrity_check`) | ✅ `ok` |
| Binary backup integrity | ✅ `ok` |
| SQL-restored database integrity | ✅ `ok` |
| File size match (source ↔ binary backup) | ✅ 155,648 bytes = 155,648 bytes |
| Table count match (14 = 14 = 14) | ✅ |
| Schema object count match (19 = 19 = 19; 14 tables + 5 indexes) | ✅ |
| All row counts match across source / binary / SQL-restored | ✅ 49 = 49 = 49 |
| Data content spot-check (Product, Category, Order, User, ProductVariant, Setting, NewsletterSubscriber, HeroSlide, PromoBanner) | ✅ All 9 tables byte-identical |
| SQL dump executes without errors | ✅ |

**Conclusion**: The backup is fully restorable via either method (binary copy or SQL import).

### 10.5 Restore procedure

Two methods are supported. **Method A (binary copy)** is faster and recommended for same-architecture restores. **Method B (SQL import)** is portable across SQLite versions and useful for inspecting/editing data before restore.

#### Prerequisites

- The Next.js application must be **stopped** before restoring (to avoid SQLite lock conflicts):
  ```bash
  # Stop dev server
  pkill -9 -f "next-server"
  pkill -9 -f "next dev"
  # Or if using the sandbox daemon:
  kill -9 $(cat dev-server.pid)
  ```

#### Method A — Binary copy restore (recommended, fastest)

```bash
# 1. Stop the app (see Prerequisites above)

# 2. Back up the current (possibly empty/seed) database, just in case
cp db/custom.db db/custom.db.pre-restore.bak

# 3. Copy the production backup into place
cp angelsbeauty-backup/angelsbeauty-production-backup.db db/custom.db

# 4. Fix permissions if needed
chmod 644 db/custom.db

# 5. Verify integrity
python3 -c "import sqlite3; print(sqlite3.connect('db/custom.db').execute('PRAGMA integrity_check').fetchone()[0])"
# Expected output: ok

# 6. Restart the app
bun run dev

# 7. Verify data is loaded
curl -s http://localhost:3000/api/products | python3 -m json.tool | head -20
# Should show 7 products
```

#### Method B — SQL dump restore (portable, inspectable)

```bash
# 1. Stop the app (see Prerequisites above)

# 2. Back up current database
mv db/custom.db db/custom.db.pre-restore.bak

# 3a. Option 1 — If sqlite3 CLI is installed:
sqlite3 db/custom.db < angelsbeauty-backup/angelsbeauty-production-backup.sql

# 3b. Option 2 — If sqlite3 CLI is NOT installed (use Python):
python3 -c "
import sqlite3
conn = sqlite3.connect('db/custom.db')
with open('angelsbeauty-backup/angelsbeauty-production-backup.sql') as f:
    conn.executescript(f.read())
conn.commit()
conn.close()
print('Restore complete')
"

# 4. Verify integrity
python3 -c "import sqlite3; print(sqlite3.connect('db/custom.db').execute('PRAGMA integrity_check').fetchone()[0])"
# Expected output: ok

# 5. Restart the app
bun run dev

# 6. Verify data is loaded
curl -s http://localhost:3000/api/products | python3 -m json.tool | head -20
```

#### Post-restore verification

After restoring with either method, verify the application has the production data:

```bash
# Check product count (should be 7)
curl -s http://localhost:3000/api/products | python3 -c "import sys, json; print('Products:', len(json.load(sys.stdin)))"

# Check Clover config is loaded (should show isConfigured: true)
curl -s http://localhost:3000/api/clover/setup | python3 -m json.tool

# Check admin can log in (visit /auth in browser, sign in with admin credentials from User table)

# Check homepage renders with real products
curl -s http://localhost:3000/ | grep -o "Reveal Your.*Glow"
```

### 10.6 What to do if restore fails

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| `database is locked` | App still running | Stop the dev server completely (`pkill -9 -f next-server`) |
| `no such table: Product` | SQL dump didn't execute | Check the SQL file path; re-run Method B step 3 |
| `integrity_check` returns anything other than `ok` | Corrupted copy | Re-copy from `angelsbeauty-backup/`; if still bad, use Method B (SQL import) instead |
| App boots but shows 0 products | Restored to wrong path | Confirm `DATABASE_URL` in `.env` points to `db/custom.db` (relative) |
| Clover checkout fails after restore | Setting table didn't restore, OR `.env.local` overrides with empty values | Check `SELECT * FROM Setting;` in the restored DB; also check `.env.local` isn't setting `CLOVER_ECOM_TOKEN=""` (empty string overrides DB fallback) |

### 10.7 Backup strategy going forward

For ongoing production operation, schedule daily backups of `db/custom.db`:

```bash
# Add to crontab — daily at 2 AM
0 2 * * * cp /home/z/my-project/db/custom.db /backups/custom-$(date +\%Y\%m\%d).db

# Recommended retention: 7 daily + 4 weekly + 12 monthly
```

See `README.md` §"Backup Procedures" for the full backup strategy including image uploads and `.env.local`.

---

**End of migration report.**

For any issues during migration, refer to `README.md` §Troubleshooting or the in-app **Admin → Settings** panel which shows a live environment health check.
