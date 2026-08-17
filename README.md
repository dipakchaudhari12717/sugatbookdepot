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
request.auth.token.email in ['dipakchaudhari171@gmail.com'];
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
SEED_ADMIN_EMAIL=dipakchaudhari171@gmail.com
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
- **UPI transfer** — the customer pays your UPI ID and submits the reference
  number; you verify it and mark the order paid in the admin panel.

Card and net-banking need a payment gateway. The SRS names Razorpay or PayU, both
of which require business KYC approval before you get API keys. Once you have
them, the gateway slots in alongside the two existing methods — the order model
already carries `paymentMethod`, `paymentStatus` and `paymentReference`, and the
admin panel already exposes the refund/paid states.

---

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run typecheck` | TypeScript, no emit |
| `npm run scrape` | Re-scrape the legacy site → `data/legacy-catalog.json` |
| `npm run catalog` | Rebuild `src/data/catalog.json` from the scrape |
| `npm run seed` | Push the catalogue into Firestore |
| `npm run rules:deploy` | Deploy `firestore.rules` + indexes (needs `firebase login` once) |

`scrape` and `catalog` only matter if the old site changes before it's retired.

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
