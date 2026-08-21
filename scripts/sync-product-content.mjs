/**
 * Pushes editorial content from src/data/catalog.json into Firestore.
 *
 * Use this after `npm run catalog` when the generated content changes but the
 * commercial fields must not be touched. It rewrites ONLY:
 *
 *   title, subtitle, descriptionHtml, description, searchTokens, optionImages
 *
 * Prices, stock, badges, category and the plain `images` list are deliberately
 * left alone, so anything edited in the admin panel since seeding survives.
 *
 * Run: npm run sync:content
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { collection, doc, getDocs, getFirestore, writeBatch } from "firebase/firestore";

async function loadEnv() {
  try {
    const raw = await readFile(path.join(process.cwd(), ".env.local"), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq < 0) continue;
      const key = trimmed.slice(0, eq).trim();
      if (!(key in process.env)) process.env[key] = trimmed.slice(eq + 1).trim();
    }
  } catch {
    /* fall back to the ambient environment */
  }
}

const ENTITY = /&lt;|&gt;|&amp;|&quot;|&#\d+;|&nbsp;/;

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
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!config.apiKey || !email || !password) {
    console.error("Missing Firebase config or SEED_ADMIN_* credentials in .env.local.");
    process.exit(1);
  }

  const catalog = JSON.parse(
    await readFile(path.join(process.cwd(), "src", "data", "catalog.json"), "utf8"),
  );

  // Refuse to push a catalogue that is itself still broken.
  const stillEncoded = catalog.products.filter((p) => ENTITY.test(p.descriptionHtml));
  if (stillEncoded.length) {
    console.error(
      `src/data/catalog.json still has ${stillEncoded.length} encoded descriptions.\n` +
        "Run `npm run catalog` first.",
    );
    process.exit(1);
  }

  const app = initializeApp(config);
  const db = getFirestore(app);

  console.log(`Signing in as ${email} ...`);
  const cred = await signInWithEmailAndPassword(getAuth(app), email, password);
  console.log(`Signed in (uid ${cred.user.uid})`);

  const snap = await getDocs(collection(db, "products"));
  if (snap.empty) {
    console.log("No products in Firestore — nothing to repair. Run `npm run seed` instead.");
    process.exit(0);
  }
  console.log(`Found ${snap.size} products in Firestore`);

  const bySlug = new Map(catalog.products.map((p) => [p.slug, p]));
  const batch = writeBatch(db);
  let repaired = 0;
  let alreadyClean = 0;
  const unmatched = [];

  for (const d of snap.docs) {
    const data = d.data();
    const source = bySlug.get(data.slug ?? d.id);
    if (!source) {
      unmatched.push(d.id);
      continue;
    }

    // Firestore rejects `undefined`, so normalise the optional field.
    const nextOptionImages = source.optionImages ?? null;

    const encoded =
      ENTITY.test(String(data.descriptionHtml ?? "")) ||
      ENTITY.test(String(data.title ?? "")) ||
      String(data.description ?? "").includes("<p>");
    const optionImagesStale =
      JSON.stringify(data.optionImages ?? null) !== JSON.stringify(nextOptionImages);
    const titleStale =
      (data.title ?? "") !== source.title ||
      (data.titleMr ?? null) !== (source.titleMr ?? null);

    if (!encoded && !optionImagesStale && !titleStale) {
      alreadyClean++;
      continue;
    }

    batch.update(doc(db, "products", d.id), {
      title: source.title,
      titleMr: source.titleMr ?? null,
      subtitle: source.subtitle,
      descriptionHtml: source.descriptionHtml,
      description: source.description,
      searchTokens: source.searchTokens,
      optionImages: nextOptionImages,
      updatedAt: Date.now(),
    });
    repaired++;
  }

  if (repaired) await batch.commit();

  console.log(`\nUpdated: ${repaired}`);
  console.log(`Already in sync: ${alreadyClean}`);
  if (unmatched.length) {
    console.log(
      `Skipped ${unmatched.length} product(s) with no match in catalog.json ` +
        `(added by hand in the admin panel): ${unmatched.join(", ")}`,
    );
  }
  console.log("\nDone. Reload the site to see the updated content.");
  process.exit(0);
}

main().catch((err) => {
  console.error(`\nFailed: ${err.code ?? err.message}`);
  process.exit(1);
});
