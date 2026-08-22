# Sugat Book Depot — e-commerce platform

A rebuild of [sugatbookdepot.in](https://sugatbookdepot.in) as a full e-commerce
application: public storefront, customer accounts, and an admin panel for the shop
owner. Built to the SRS dated 17 August 2026.

**Stack:** Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Tailwind CSS v4 ·
Firebase (Auth + Firestore, free Spark tier).

---

## What's here

The complete catalogue — **47 products, 90 images** — was migrated off the old
Hostinger/Zyro site, including full descriptions, every gallery image, MRP and
offer prices, badges, and the Chivar's size/colour options.

| Category | Products |
|---|---|
| Chivar — Monk Robes | 1 |
| Buddhism | 7 |
| Dr. Babasaheb Ambedkar | 12 |
| Biographies & History | 5 |
| Academics & Competitive | 2 |
| Statues & Artefacts | 1 |
| Stationery | 19 |

The old store left 19 of the 47 products with no category at all and had no
author/language fields, so the migration adds a curated taxonomy plus author,
language, publisher and tag metadata — that's what powers the category nav and
the author/language filters.

---

## Getting started

```bash
npm install
npm run dev
```

The site runs at <http://localhost:3000> straight away. Until Firestore is seeded
it serves the bundled catalogue (`src/data/catalog.json`), so browsing, search,
filtering and the cart all work out of the box. Accounts, orders and admin
editing need the Firebase setup below.

---

## Firebase setup

The project is already pointed at the `sugatbookdepot` Firebase project via
`.env.local`. Three things still need doing in the Firebase console — they need
account and password access, so they're yours to do:

### 1. Enable email/password sign-in

Firebase Console → **Authentication** → **Sign-in method** → enable
**Email/Password**.

### 2. Create the owner account

Firebase Console → **Authentication** → **Users** → **Add user**.

Pick any email you control and a password. Whatever you use here must match the
email listed in `firestore.rules` (next step).

You do **not** need to verify the email address. Firebase Auth refuses to create
a second account with an email that already exists, so an unverified address
can't be claimed by anyone else.

### 3. Deploy the security rules

Easiest way — deploy straight from this folder, no copy-pasting:

```bash
npx firebase-tools login
npx firebase-tools deploy --only firestore:rules,firestore:indexes
```

`firebase.json` and `.firebaserc` are already set up to point at the
`sugatbookdepot` project.

Or do it by hand: Firebase Console → **Firestore Database** → **Rules** → paste
the contents of [`firestore.rules`](./firestore.rules) → **Publish**.

Before publishing, check the `bootstrapAdmin()` function near the top and make
sure it lists the owner account you just created:

```
request.auth.token.email in ['sugat4books@gmail.com'];
```

That address is the bootstrap admin. Once signed in, more admins can be added
from **Admin → Customers → Manage** without touching the rules again.

> **The console keeps its own copy of these rules.** Editing `firestore.rules`
> locally changes nothing until you paste it into the console and hit Publish.
> This is the single most common reason seeding fails with `permission-denied`.

The CLI command above also creates the composite indexes. If you published by
hand instead, let Firebase prompt you to create indexes the first time a query
needs one.

### 4. Seed the catalogue

Put the owner password into `.env.local`:

```
SEED_ADMIN_EMAIL=sugat4books@gmail.com
SEED_ADMIN_PASSWORD=<the password you set>
```

Then:

```bash
npm run seed
```

This writes the 7 categories, 47 products, default shop settings and two starter
coupons into Firestore, and records the account in `/admins`. Reload the site —
the shop is now served live from Firestore and everything in `/admin` becomes
editable.

> `.env.local` is gitignored. Remove `SEED_ADMIN_PASSWORD` once seeding is done.

---

## Admin panel

Sign in at **/admin** with the owner account.

| Section | What it does |
|---|---|
| Dashboard | Revenue, order counts, 14-day chart, top sellers, low stock, price warnings |
| Orders | Full fulfilment flow — Placed → Confirmed → Packed → Shipped → Delivered, plus cancel, payment status, courier + tracking number |
| Products | Add / edit / delete, inline stock editing, search and filters |
| Categories | Create and reorder the shelves shown in the navigation |
| Coupons | Percentage or flat discounts with minimum order, cap, validity dates and usage limits |
| Banners | Homepage promotional panels |
| Gallery | Upload photographs with a caption and album; publish/unpublish per item |
| Blog | Write, publish and unpublish posts with a cover image, tags and HTML body |
| Customers | Registered and guest buyers, order counts, spend; grant or revoke admin access |
| Enquiries | Contact form, bulk-order and newsletter submissions |
| Settings | Delivery charges, free-shipping threshold, serviceable PIN codes, payment methods, UPI ID, contact details, announcement bar |

**Storefront and admin stay in sync automatically.** Every page subscribes to
Firestore with `onSnapshot`, so a price change or a new product appears on the
shop without a refresh. Confirming an order decrements stock for each line item
in a single batched write.

### Images

Firebase Storage requires a paid plan, so product images are **linked by URL**
rather than uploaded. Paste any public `https://` image link in the product
editor. The 47 migrated products still point at the old site's CDN; allowed image
hosts are listed in `next.config.ts` under `images.remotePatterns` — add hosts
there if you start using a different one.

---

## Payments

Live today:

- **Cash on Delivery**
- **Card, UPI, net banking and wallets** — through Razorpay. Built and wired up,
  but dormant until the two keys below are set.

The old manual UPI method — pay the shop's UPI ID, then type the UTR in at
checkout — has been removed. Razorpay covers UPI properly and confirms the
payment itself, which spares the shop from reconciling reference numbers by
hand. `PaymentMethod` still accepts `"upi"` so orders already taken that way
keep rendering in the admin panel, on the customer's order page and on their
invoice. `upiEnabled` and `upiId` are gone from store settings.

If Razorpay has no keys and Cash on Delivery is switched off, checkout says so
plainly and disables the button rather than silently placing a COD order.

### Turning Razorpay on

Razorpay needs business KYC approval before it will issue live keys. Test keys
are available immediately and behave identically, so the flow can be rehearsed
end to end before KYC clears.

**1. Get the keys.** Razorpay Dashboard → Settings → API Keys → Generate Key.
You get a pair:

| Key | Where it goes | Notes |
| --- | --- | --- |
| Key Id (`rzp_test_…` / `rzp_live_…`) | `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Public. Ships to the browser by design. |
| Key Secret | `RAZORPAY_KEY_SECRET` | Secret. Server only — never prefix it `NEXT_PUBLIC_`. |

The secret is displayed **once**, at generation. Lose it and you must
regenerate the pair.

**2. Add them to the environment.**

- Local: put both in `.env.local` (already gitignored).
- Vercel: Project → Settings → Environment Variables, add both, then redeploy.
  A redeploy is required — Next inlines the public key at build time.

```
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx
```

**3. Switch it on.** Admin → Settings → tick *Card, UPI, net banking &
wallets*. The option is double-gated: it appears at checkout only when the
setting is ticked **and** the key id is present, so it can never be offered
with no keys behind it.

**4. Test.** With `rzp_test_` keys, card `4111 1111 1111 1111`, any future
expiry, any CVV, OTP `1234`. The order should land in Admin → Orders carrying
the `pay_…` reference.

### How it works

| Piece | File |
| --- | --- |
| Opens a Razorpay order (holds the secret) | `src/app/api/razorpay/order/route.ts` |
| Verifies the payment before the order is saved | `src/app/api/razorpay/verify/route.ts` |
| REST + HMAC helpers, server only | `src/lib/razorpay-server.ts` |
| Loads the widget, drives the modal | `src/lib/razorpay-checkout.ts` |
| Calls the above from checkout | `src/components/checkout/checkout-page.tsx` |

No SDK is installed — it is `fetch` against Razorpay's REST API plus
`node:crypto` for the signature, so there is nothing extra to keep patched.

Verification is deliberately two-sided, because a signature alone proves only
that the browser saw a genuine Razorpay response and says nothing about the
amount:

1. the HMAC handshake, which rules out a forged callback, and
2. a read straight from Razorpay confirming the payment is **captured**, is
   attached to the order we opened, and is for the amount we expected.

Only then is the order written to Firestore, with the `pay_…` id stored as
`paymentReference`.

**Two things to know.** Orders arrive as `awaiting_verification` rather than
`paid`, because `firestore.rules` lets only an admin set `paid` and the write
happens in the browser — mark it paid in the admin panel, where the Razorpay
reference is shown. And the amount charged is the cart total computed on the
client; the server checks that what was *paid* matches what was *asked for*,
but does not independently re-price the cart. Closing that gap needs the
Firebase Admin SDK on the server, which is a larger change and a further set of
credentials.

---

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build (Webpack — see *Building on older Linux* below) |
| `npm run start` | Serve the production build |
| `npm run typecheck` | TypeScript, no emit |
| `npm run scrape` | Re-scrape the legacy site → `data/legacy-catalog.json` |
| `npm run catalog` | Rebuild `src/data/catalog.json` from the scrape |
| `npm run seed` | Push the catalogue into Firestore |
| `npm run sync:content` | Push only editorial fields (text + Chivar colour images) into Firestore, leaving prices and stock untouched |
| `npm run rules:deploy` | Deploy `firestore.rules` + indexes (needs `firebase login` once) |

`scrape` and `catalog` only matter if the old site changes before it's retired.

### Deploying to Hostinger

Hostinger builds the app on its own server, so the environment variables have
to be there *before* the build runs — `NEXT_PUBLIC_*` values are compiled into
the JavaScript bundle, not read when the server starts. Editing a file after
the build has no effect; it needs a rebuild.

Set them through hPanel rather than by uploading a file:

1. Website Dashboard for the app → **Settings & Redeploy**
   (or Dashboard → **Deployments** → **Settings & Redeploy**)
2. Open the **Environment variables** section
3. **Import .env** — upload `.env.local`, or paste its contents — or add each
   one by hand
4. Confirm, and let it **redeploy**. This is required, not optional.

Only these are needed on the server:

```
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
```

plus the two Razorpay keys once they exist.

`SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` must **not** go on the server.
They appear nowhere in `src/` — only `scripts/seed-firestore.mjs` and
`scripts/sync-product-content.mjs` use them, and those run from a laptop.

Note that `.env.example` is a template committed to a public repository. Real
values go in `.env.local`, which is gitignored.

### Building on older Linux

`build` passes `--webpack` on purpose. Next 16 builds with Turbopack by
default, and Turbopack needs the native SWC binary — it has no WebAssembly
fallback.

That binary wants glibc 2.29 or newer. Hostinger's shared hosting is older
than that, so the build there fails twice over:

```
Attempted to load @next/swc-linux-x64-gnu, but an error occurred:
  /lib64/libm.so.6: version `GLIBC_2.29' not found
Turbopack is not supported on this platform (linux/x64) because native
  bindings are not available.
```

Webpack does run on the WebAssembly fallback, so `--webpack` builds
everywhere — slower, but it finishes. This is also why the Next config is
`next.config.mjs` rather than `.ts`: a TypeScript config has to be compiled by
SWC before it can even be read, which fails on the same host before a single
page is built.

None of this applies to Vercel, whose builders are current; the flag only
costs some build time there.

The deprecation warnings and the six moderate advisories `npm install` prints
all come from `firebase-admin`, a devDependency used solely by
`scripts/seed-firestore.mjs`. Nothing from it reaches the browser or the
running site. They are noise, not the build failure — leave them be rather
than running `npm audit fix --force`, which would try to move `firebase-admin`
across a major version for no gain.

---

## Project layout

```
scripts/
  scrape-legacy-site.mjs   Reads the old store's embedded product payloads
  build-catalog.mjs        Normalises + enriches into the shape the app uses
  seed-firestore.mjs       Loads the catalogue into Firestore
src/
  app/
    (storefront)/          Public shop — home, catalogue, product, cart,
                           checkout, orders, account, wishlist, policies
    admin/                 Admin panel (guarded)
  components/              UI, storefront sections, admin screens
  lib/
    firebase.ts            SDK setup
    repo.ts                All Firestore reads/writes + realtime subscriptions
    types.ts               Domain model
    *-context.tsx          Auth, catalogue, cart, toasts
  data/catalog.json        Migrated catalogue (offline fallback)
firestore.rules            Security rules — the real access control
firestore.indexes.json     Composite indexes
```

---

## Gallery, blog and the shop assistant

**Gallery** (`/gallery`) — a masonry grid with album filters and a keyboard-navigable
lightbox (arrow keys, Escape). Admins add photographs by URL with a title, caption,
album and sort order, and can keep an item as a draft until it is ready.

**Blog** (`/blog`, `/blog/[slug]`) — a lead story plus a card grid, tag filtering,
reading-time estimates and related posts. Posts are written as HTML in the admin
editor with a live preview beside the field.

**Chivar colour selector** — the robe is one product with three shades. The 11
photographs were classified by shade, so choosing Orange, Brown or Yellow swaps the
gallery to that robe's photographs (8, 5 and 6 respectively, each topped up with the
shared size chart and vihara shots). The chosen shade also travels into the cart, so
the bag never shows an orange robe next to "Color: Brown". The mapping lives in
`scripts/build-catalog.mjs` under `colorImageIndexes` — adjust it there and run
`npm run catalog && npm run sync:content`.

**Sugat Sahayak** — the chat bubble at the bottom right. It is deliberately
rule-based rather than an LLM: it costs nothing to run, needs no API key, and can
only ever say things the shop has approved. It answers on Chivar Daan, delivery and
charges, payment, order tracking, returns, bulk orders, stock, shop location,
accounts and coupons — reading live values (free-shipping threshold, UPI ID, phone)
from your shop settings. Anything it does not recognise is handed to WhatsApp rather
than guessed at. Edit the answers in the `RULES` array in
`src/components/chatbot.tsx`.

## Free-tier notes

Everything runs inside the Firebase Spark (free) plan:

- **No Cloud Functions** — order numbers, coupon validation and totals are
  computed client-side and locked down by security rules.
- **No Cloud Storage** — images are linked, not uploaded.
- **Low read volume** — one `onSnapshot` per collection for the whole app rather
  than a query per page. The catalogue is ~50 documents, so a session costs a few
  dozen reads.
- **No search service** — search runs against a `searchTokens` array generated at
  build time and maintained by the product editor.

---

## Known items for the client

1. **"Pakistan And The Partition of India" is priced ₹1.00.** That's what the old
   site had — almost certainly a placeholder someone forgot to change. It's
   flagged on the admin dashboard under "Check these prices". Set the real price
   before taking orders.
2. **Order confirmation emails are not sent.** Customers see a confirmation page
   and can track orders live, but transactional email/SMS (SRS FR-4.3, FR-5.2)
   needs either Cloud Functions (paid plan) or a third-party service like
   Resend/Brevo, both of which need an account and API key.
3. **Courier integration is manual.** Staff enter the courier name and tracking
   number per order, which appears on the customer's order page. Automatic label
   generation via Shiprocket/Delhivery (FR-9.1) needs a courier account.
4. **Product reviews** have rules and a data model in place but no UI yet.
5. **The gallery and blog start empty.** Both are admin-authored — add the first
   photographs and posts under **Admin → Gallery** and **Admin → Blog**. Until
   then the public pages show a friendly empty state rather than broken layout.
