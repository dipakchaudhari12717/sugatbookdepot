/**
 * Scrapes the legacy sugatbookdepot.in (Hostinger/Zyro builder) storefront and
 * writes a normalised catalog to data/legacy-catalog.json.
 *
 * The builder ships every product page with a serialised `productData` island
 * payload in the HTML, so we can read titles, subtitles, ribbons, full
 * description HTML, every gallery image, prices and variant options without
 * needing a headless browser.
 *
 * Run: node scripts/scrape-legacy-site.mjs
 */
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const ORIGIN = "https://sugatbookdepot.in";
const OUT = path.join(process.cwd(), "data", "legacy-catalog.json");

/** Product slugs, discovered from the store listing's 8 paginated pages. */
const SLUGS = [
  "brass-buddha-statue-in-vitarka-mudra-hand-painted-finish-lotus-pedestal",
  "chivar-traditional-buddhist-monk-robe-or-pure-lightweight-and-comfortable",
  "lucents-general-knowledge-book",
  "lucents-general-knowledge-book-hindi",
  "cello-liquiball-ball-pen-pack",
  "reynolds-liquiflow-",
  "reynolds-trimax-ball-pen",
  "cello-sapphire-ball-pen",
  "cello-gripper-ball-pen",
  "blue-gel-pens",
  "blue-ballpoint-pen-set",
  "cello-pin-point-ball-pen-pack",
  "cello-papersoft-ball-pens",
  "nataraj-classic-cutter",
  "nataraj-30-cm-scale",
  "nataraj-621-transparent-15cm-scale",
  "apsara-absolute-premium-pencil",
  "apsara-platinum-extra-dark-pencils",
  "apsara-non-dust-eraser",
  "apsara-long-point-sharpener",
  "nataraj-pencil-sharpeners",
  "nataraj-jumbo-plasto-eraser",
  "nataraj-extra-dark-pencils",
  "aspurushya-moolache-kon-who-are-the-untouchables",
  "bhagwan-gautam-buddha-charitra-va-shikavan",
  "buddha-puja-path",
  "jatak-katha",
  "kranti-ani-pratikranti",
  "visuddhimagga-",
  "gandhichya-magar-mithun-asprushya-samajachi-sutka",
  "buddha-marx-and-the-future-of-religion",
  "bhagwan-buddha-aur-unka-dhamma",
  "riddles-in-hinduism-",
  "deshache-dushman",
  "hindu-striyanchi-unnati-ani-avanti",
  "annihilation-of-caste-marathi-translation-",
  "maharlok-mahat-folk",
  "milind-prashna-book",
  "babasaheb-ambedkar-jeevan-charitra-book",
  "vidhyarthano-jagrut-hwa",
  "the-buddha-and-his-dhamma",
  "buddhist-literature-and-teachings",
  "buddhist-books-and-teachings",
  "buddhist-literature-and-teachings-1",
  "buddhist-literature-collection",
  "buddhist-literature-and-teachings-2",
  "buddhist-literature-and-teachings-3",
];

/** Legacy collection ids -> human names, read off the store's category nav. */
const LEGACY_COLLECTIONS = {
  pcol_01KAX1V0JB7SDHD8SBPRQ1B8GK: "BOOKS",
  pcol_01KAG3S9ZRQ385W4RJ7WZ2Q6FM: "Buddha statues",
  pcol_01KAG3RT04VGXQMSD5N8C60Z1F: "Buddhist Books",
  pcol_01KX962QZ7RBBCH0BF3Q2S1JBR: "Buddhist Materials",
  pcol_01KAX1TGBBR70697C542PRME8D: "COMPETITIVE BOOKS",
  pcol_01KAG3ST8XK5SE2X8T89FDSWB8: "Stationery",
};

/**
 * The builder serialises values as `[tag, value]` tuples where tag 0 is a
 * scalar/object and tag 1 is an array. Recursively strip the tags.
 */
function unwrap(v) {
  if (Array.isArray(v) && v.length === 2 && typeof v[0] === "number" && (v[0] === 0 || v[0] === 1)) {
    return unwrap(v[1]);
  }
  if (Array.isArray(v)) return v.map(unwrap);
  if (v && typeof v === "object") {
    const o = {};
    for (const k of Object.keys(v)) o[k] = unwrap(v[k]);
    return o;
  }
  return v;
}

/** Pull the balanced JSON value that follows `"productData":[0,`. */
function extractProductData(html) {
  const key = '"productData":[0,';
  const i = html.indexOf(key);
  if (i < 0) return null;
  const start = i + key.length;
  let depth = 0;
  let inStr = false;
  let esc = false;
  let end = -1;
  for (let p = start; p < html.length; p++) {
    const c = html[p];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === "{" || c === "[") depth++;
    else if (c === "}" || c === "]") {
      depth--;
      if (depth === 0) {
        end = p + 1;
        break;
      }
    }
  }
  if (end < 0) return null;
  return unwrap(JSON.parse(html.slice(start, end)));
}

/** The island payload is HTML-attribute encoded; decode to raw JSON text. */
function decodeAttr(raw) {
  return raw.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");
}

async function fetchProduct(slug, attempt = 1) {
  try {
    const res = await fetch(`${ORIGIN}/${slug}`, {
      headers: { "user-agent": "Mozilla/5.0 (catalog-migration)" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const pd = extractProductData(decodeAttr(await res.text()));
    if (!pd) throw new Error("no productData payload");
    return pd;
  } catch (err) {
    if (attempt < 3) {
      await new Promise((r) => setTimeout(r, 800 * attempt));
      return fetchProduct(slug, attempt + 1);
    }
    throw new Error(`${slug}: ${err.message}`);
  }
}

function normalise(pd, slug) {
  const variants = pd.variants ?? [];
  const price = variants[0]?.prices?.[0] ?? {};
  return {
    legacyId: pd.id,
    slug,
    title: (pd.title ?? "").trim(),
    subtitle: (pd.subtitle ?? "").trim(),
    ribbon: (pd.ribbon_text ?? "").trim(),
    descriptionHtml: pd.description ?? "",
    images: (pd.images ?? []).map((im) => im.url).filter(Boolean),
    // Builder stores money in paise.
    mrp: price.amount != null ? price.amount / 100 : null,
    salePrice: price.sale_amount != null ? price.sale_amount / 100 : null,
    currency: (price.currency_code ?? "inr").toUpperCase(),
    available: pd.is_available !== false,
    productType: pd.type?.value ?? "physical",
    options: (pd.options ?? []).map((o) => ({
      title: o.title,
      values: [...new Set((o.values ?? []).map((v) => v.value ?? v))],
    })),
    variants: variants.map((v) => ({
      title: v.title,
      sku: v.sku ?? null,
      available: v.is_available !== false,
    })),
    legacyCollections: (pd.product_collections ?? [])
      .map((c) => LEGACY_COLLECTIONS[c.collection_id] ?? c.collection_id)
      .filter(Boolean),
    updatedAt: pd.updated_at ?? null,
  };
}

async function main() {
  console.log(`Scraping ${SLUGS.length} products from ${ORIGIN} ...`);
  const products = [];
  const failures = [];

  // Small concurrency so we stay polite to the legacy host.
  const queue = [...SLUGS];
  const workers = Array.from({ length: 6 }, async () => {
    while (queue.length) {
      const slug = queue.shift();
      try {
        products.push(normalise(await fetchProduct(slug), slug));
        process.stdout.write(".");
      } catch (err) {
        failures.push(err.message);
        process.stdout.write("x");
      }
    }
  });
  await Promise.all(workers);
  process.stdout.write("\n");

  products.sort((a, b) => SLUGS.indexOf(a.slug) - SLUGS.indexOf(b.slug));

  await mkdir(path.dirname(OUT), { recursive: true });
  await writeFile(
    OUT,
    JSON.stringify(
      {
        source: ORIGIN,
        scrapedAt: new Date().toISOString(),
        legacyCollections: LEGACY_COLLECTIONS,
        count: products.length,
        products,
      },
      null,
      2,
    ),
    "utf8",
  );

  console.log(`Wrote ${products.length} products -> ${path.relative(process.cwd(), OUT)}`);
  if (failures.length) {
    console.error(`\n${failures.length} failed:`);
    for (const f of failures) console.error("  " + f);
    process.exitCode = 1;
  }
}

main();
