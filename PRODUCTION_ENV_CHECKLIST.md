# Production Environment Checklist

Use this checklist before every deployment. Every item must be ✅ before going live.

## Pre-flight: copy the template

```bash
cp .env.example .env.local
```

Then fill in every value below.

---

## ✅ REQUIRED — app will not boot without these

- [ ] **`DATABASE_URL`** — SQLite path. Example: `file:./db/custom.db`
  - Verify: `bun run db:push` succeeds without error.
- [ ] **`NEXTAUTH_SECRET`** — 32-byte random base64 string.
  - Generate: `openssl rand -base64 32`
  - Verify: present in `.env.local` (admin Settings → Environment Variables table shows "Present").

---

## ✅ REQUIRED FOR PAYMENTS — checkout fails without these

Configure **either Path A OR Path B** (Path A recommended).

### Path A: Ecommerce API (recommended)

- [ ] **`CLOVER_ECOM_TOKEN`** — Ecommerce API Private Token (UUID format).
  - Source: Clover Dashboard → Ecommerce → Ecommerce API Tokens → Private Token (HOSTED_CHECKOUT type).
- [ ] **`CLOVER_ECOM_MERCHANT_ID`** — Ecommerce merchant ID.
  - Source: same page as the token. **Different** from POS merchant ID.
- [ ] **Verify**: Admin → Settings → Save Ecommerce Token → status shows "Connected to Clover — Hosted Checkout Active".

### Path B: OAuth (alternative)

- [ ] **`CLOVER_ACCESS_TOKEN`** — OAuth access token from `/oauth/callback` flow.
- [ ] **`CLOVER_MERCHANT_ID`** — POS/Dashboard merchant ID.
- [ ] **`CLOVER_CLIENT_ID`** — Clover Developer App Client ID.
- [ ] **`CLOVER_CLIENT_SECRET`** — Clover Developer App Client Secret.
- [ ] **Verify**: Admin → Settings → "Authorize via OAuth" → callback completes.

---

## ⚙️ RECOMMENDED — set for production

- [ ] **`CLOVER_ENVIRONMENT=production`** — switch from sandbox to production.
  - ⚠️ Only after testing in sandbox first.
- [ ] **`NEXT_PUBLIC_SITE_URL`** — your live domain (e.g. `https://angelsbeauty.shop`).
  - Used for SEO canonical URLs, OG tags, JSON-LD, Clover redirect URLs.
- [ ] **`SITE_URL`** — same as above but server-side. Takes precedence over `NEXT_PUBLIC_SITE_URL`.
  - Set this if the server-side origin differs from the public URL (e.g. behind a proxy).
- [ ] **`CLOVER_DEBUG=false`** — MUST be false in production.
  - ⚠️ If `true`, logs may contain card last4, auth codes, and other sensitive data.

---

## 🔥 Critical production warnings

| Rule | Why |
|------|-----|
| **`CLOVER_DEBUG` must be `false`** | Verbose logging can expose card data. |
| **`NEXTAUTH_SECRET` must be set (not empty)** | Empty secret = JWTs signed with `''` = trivial session forgery. |
| **`CLOVER_ENVIRONMENT=production` only when live** | Sandbox tokens do not work in production and vice versa. |
| **`.env.local` must NOT be committed** | It's gitignored (`.gitignore` line 58-59). Never force-add it. |
| **`.env.example` IS committed** | It's the restore template. Contains no secrets. |

---

## 🩺 Health check (verify before launch)

### 1. Startup log
On server boot, check the console for:
```
[Env Health] ✅ All systems go.
```
If you see `⚠️` or `❌`, fix the listed missing vars before proceeding.

### 2. API check
```bash
curl https://yourdomain.com/api/env-health
```
Expected: `"critical": false`, `"paymentsDisabled": false`, `"present": 20` (or close).

### 3. Admin UI check
- Log in to Admin → Settings
- ✅ No warning banner at top
- ✅ Environment Variables table shows all REQUIRED + PAYMENTS vars as "Present"
- ✅ Clover section shows "Connected to Clover — Hosted Checkout Active"

### 4. Live checkout test
- Add a product to cart
- Go to checkout
- Complete a real $1 test payment
- Verify order shows as "paid" in Admin → Orders

---

## 🔄 Recovery (if `.env.local` is lost)

The `.env.local` file is gitignored and can be lost during:
- Sandbox / container reset
- Accidental deletion
- New deploy without env vars configured

**Recovery options (in order of preference):**

1. **Admin UI** (recommended):
   - Admin → Settings → Clover Payment Configuration
   - Paste Ecommerce Merchant ID + Private Token
   - Click "Save Ecommerce Token"
   - Credentials are validated against Clover before writing
   - `.env.local` is written atomically (existing file is never overwritten)

2. **From template**:
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your real values
   bun run dev   # or restart your production server
   ```

3. **From backup** (if you keep an off-repo backup of `.env.local`):
   ```bash
   cp /path/to/backup/.env.local .env.local
   ```

---

## 📋 Full variable reference

See [README.md → Environment Variables](./README.md#environment-variables) for the complete table with descriptions, defaults, and categories.

The canonical machine-readable list lives in [`src/lib/env-health.ts`](./src/lib/env-health.ts) (`ENV_VARS` array) — this is the single source of truth used by the startup health check, the `/api/env-health` endpoint, and the admin Settings page.
