/**
 * Loads the migrated catalogue into Firestore.
 *
 * Uses the ordinary web SDK signed in as an admin user, so it works on the
 * Firebase free tier with no service-account key. firestore.rules is what
 * decides whether the write is allowed.
 *
 * Prerequisites (see README):
 *   1. Email/password sign-in enabled in Firebase Authentication.
 *   2. An admin account created, matching the email in firestore.rules.
 *   3. SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD set in .env.local.
 *
 * Run: npm run seed
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import {
  doc,
  getDocs,
  collection,
  getFirestore,
  writeBatch,
  setDoc,
} from "firebase/firestore";

/** Minimal .env.local reader so the script needs no extra dependency. */
async function loadEnv() {
  try {
    const raw = await readFile(path.join(process.cwd(), ".env.local"), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq < 0) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    // No .env.local — fall back to whatever is already in the environment.
  }
}

const DEFAULT_SETTINGS = {
  freeShippingThreshold: 499,
  shippingFlatRate: 49,
  serviceablePincodes: [],
  codEnabled: true,
  upiEnabled: true,
  razorpayEnabled: true,
  upiId: "sugatbookdepot@upi",
  announcement: "Free delivery across India on orders above ₹499",
  bannerLang: "both",
  whatsappNumber: "917709001950",
  contactEmail: "sugat4books@gmail.com",
  contactPhone: "+91 90283 60464",
};

const STARTER_COUPONS = [
  {
    code: "WELCOME10",
    type: "percent",
    value: 10,
    minOrder: 300,
    maxDiscount: 100,
    active: true,
    startsAt: null,
    expiresAt: null,
    usageLimit: null,
    usedCount: 0,
    description: "10% off a first order over ₹300",
  },
  {
    code: "DHAMMA50",
    type: "flat",
    value: 50,
    minOrder: 500,
    maxDiscount: null,
    active: true,
    startsAt: null,
    expiresAt: null,
    usageLimit: null,
    usedCount: 0,
    description: "₹50 off orders over ₹500",
  },
];

async function main() {
  await loadEnv();

  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };

  if (!config.apiKey || !config.projectId) {
    console.error("Missing NEXT_PUBLIC_FIREBASE_* values. Fill in .env.local first.");
    process.exit(1);
  }

  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password) {
    console.error(
      "Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD in .env.local.\n" +
        "This must be a Firebase Auth user that firestore.rules recognises as an admin.",
    );
    process.exit(1);
  }

  const catalog = JSON.parse(
    await readFile(path.join(process.cwd(), "src", "data", "catalog.json"), "utf8"),
  );

  const app = initializeApp(config);
  const auth = getAuth(app);
  const db = getFirestore(app);

  console.log(`Signing in as ${email} ...`);
  let credential;
  try {
    credential = await signInWithEmailAndPassword(auth, email, password);
  } catch (err) {
    console.error(`\nSign-in failed: ${err.code ?? err.message}`);
    console.error(
      "\nCheck that:\n" +
        "  • Email/Password sign-in is enabled in Firebase Console → Authentication → Sign-in method\n" +
        "  • This user exists (create it under Authentication → Users)\n" +
        "  • The password in .env.local is correct",
    );
    process.exit(1);
  }
  console.log(
    `Signed in as ${credential.user.email} (uid ${credential.user.uid}, ` +
      `email verified: ${credential.user.emailVerified})`,
  );

  /**
   * `products` is world-readable under our rules. If even this read is denied,
   * the rules in the console are still the default deny-all — which is a very
   * different fix from "the bootstrap email doesn't match".
   */
  let rulesDeployed = true;
  try {
    await getDocs(collection(db, "products"));
  } catch (err) {
    if ((err.code ?? "") === "permission-denied") rulesDeployed = false;
  }

  // Make sure this account can keep writing after the bootstrap email changes.
  try {
    await setDoc(doc(db, "admins", credential.user.uid), {
      email,
      grantedAt: Date.now(),
      note: "Created by scripts/seed-firestore.mjs",
    });
    console.log("Recorded this account in /admins");
  } catch (err) {
    console.error(`\nCould not write to /admins: ${err.code ?? err.message}\n`);
    if (!rulesDeployed) {
      console.error(
        "Diagnosis: this project is still on the DEFAULT deny-all rules — even\n" +
          "reading the public `products` collection was refused.\n\n" +
          "Fix: Firebase Console -> Firestore Database -> Rules, replace everything\n" +
          "with the contents of firestore.rules in this folder, and click Publish.\n" +
          "Publishing takes a few seconds to take effect; then run `npm run seed` again.",
      );
    } else {
      console.error(
        "Diagnosis: your rules ARE deployed (public reads work), but they do not\n" +
          `recognise ${credential.user.email} as an admin.\n\n` +
          "Fix: open firestore.rules, check the bootstrapAdmin() email list contains\n" +
          `  '${credential.user.email}'\n` +
          "exactly, then re-publish the rules in the Firebase console. If you edited\n" +
          "the file locally, remember the console keeps its own copy — a local edit\n" +
          "does nothing until you paste and Publish it.",
      );
    }
    process.exit(1);
  }

  // --- Categories -------------------------------------------------------
  const catBatch = writeBatch(db);
  for (const category of catalog.categories) {
    catBatch.set(doc(db, "categories", category.slug), category, { merge: true });
  }
  await catBatch.commit();
  console.log(`Wrote ${catalog.categories.length} categories`);

  // --- Products ---------------------------------------------------------
  // Firestore batches cap at 500 writes; chunk to stay well under it.
  const products = catalog.products;
  const now = Date.now();
  const CHUNK = 400;
  for (let i = 0; i < products.length; i += CHUNK) {
    const batch = writeBatch(db);
    for (const product of products.slice(i, i + CHUNK)) {
      const { legacyId, legacyCollections, ...rest } = product;
      batch.set(
        doc(db, "products", product.slug),
        {
          ...rest,
          legacyId,
          createdAt: now,
          updatedAt: now,
        },
        { merge: true },
      );
    }
    await batch.commit();
  }
  console.log(`Wrote ${products.length} products`);

  // --- Settings ---------------------------------------------------------
  await setDoc(doc(db, "settings", "store"), DEFAULT_SETTINGS, { merge: true });
  console.log("Wrote store settings");

  // --- Coupons (only if none exist, so we never clobber real ones) ------
  const existingCoupons = await getDocs(collection(db, "coupons"));
  if (existingCoupons.empty) {
    const batch = writeBatch(db);
    for (const coupon of STARTER_COUPONS) {
      batch.set(doc(db, "coupons", coupon.code), coupon);
    }
    await batch.commit();
    console.log(`Wrote ${STARTER_COUPONS.length} starter coupons`);
  } else {
    console.log(`Skipped coupons (${existingCoupons.size} already exist)`);
  }

  console.log("\nDone. Reload the site — the shop is now served from Firestore.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
