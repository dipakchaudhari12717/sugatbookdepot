/**
 * Turns data/legacy-catalog.json into data/catalog.json — the shape the app and
 * the Firestore seeder use.
 *
 * The legacy store left 19 of 47 products with no collection at all, and had no
 * author/language fields, so this file carries the curated enrichment needed for
 * the SRS category nav (FR-2.1) and the author/language filters (FR-2.2).
 *
 * Run: node scripts/build-catalog.mjs
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const IN = path.join(process.cwd(), "data", "legacy-catalog.json");
// Lives under src/ so the app can import it as an offline fallback when
// Firestore is empty or unreachable.
const OUT = path.join(process.cwd(), "src", "data", "catalog.json");

/** New taxonomy. `order` drives nav + homepage ordering. */
const CATEGORIES = [
  {
    slug: "chivar",
    name: "Chivar — Monk Robes",
    shortName: "Chivar",
    order: 1,
    featured: true,
    tagline: "Robes offered in the spirit of Dana",
    description:
      "Traditional Buddhist monastic robes woven to Vinaya-prescribed patterns, for Varshavas, Kathina Chivar Daan and daily monastic wear.",
  },
  {
    slug: "buddhism",
    name: "Buddhism",
    shortName: "Buddhism",
    order: 2,
    featured: true,
    tagline: "The Dhamma, in your language",
    description:
      "Suttas, Jataka tales, meditation manuals and commentaries — the core of the Buddhist canon in Marathi, Hindi, Pali and English.",
  },
  {
    slug: "ambedkar",
    name: "Dr. Babasaheb Ambedkar",
    shortName: "Ambedkar",
    order: 3,
    featured: true,
    tagline: "Writings that changed a nation",
    description:
      "The collected writings and speeches of Dr. B. R. Ambedkar, alongside the social-reform literature that grew from his movement.",
  },
  {
    slug: "biographies",
    name: "Biographies & History",
    shortName: "Biographies",
    order: 4,
    featured: true,
    tagline: "Lives worth studying",
    description:
      "Life stories of reformers, emperors and saints — Savitribai Phule, Samrat Ashoka, Sant Kabir and more.",
  },
  {
    slug: "academics",
    name: "Academics & Competitive",
    shortName: "Academics",
    order: 5,
    featured: true,
    tagline: "Prepare with confidence",
    description:
      "General knowledge and reference titles trusted by students preparing for government and competitive examinations.",
  },
  {
    slug: "statues",
    name: "Statues & Artefacts",
    shortName: "Statues",
    order: 6,
    featured: true,
    tagline: "For the altar and the home",
    description:
      "Hand-finished Buddha statues and devotional artefacts for home altars, meditation spaces and gifting.",
  },
  {
    slug: "stationery",
    name: "Stationery",
    shortName: "Stationery",
    order: 7,
    featured: false,
    tagline: "Everyday writing essentials",
    description:
      "Pens, pencils, erasers, sharpeners, scales and cutters from Cello, Reynolds, Apsara and Nataraj.",
  },
];

/**
 * Curated per-product metadata. Authors/languages/publishers were read out of
 * the legacy product copy; the legacy store had no structured fields for them.
 */
const ENRICHMENT = {
  // --- Chivar -------------------------------------------------------------
  "chivar-traditional-buddhist-monk-robe-or-pure-lightweight-and-comfortable": {
    category: "chivar",
    tags: ["chivar", "monk robe", "chivar daan", "varshavas", "kathina", "dana"],
    material: "Breathable cotton",
    care: "Hand wash or gentle machine wash in cold water. Dry in shade. Do not bleach.",
    stock: 40,
    bulkEnquiry: true,
    sizeGuide: [
      { label: "Free size — 2 piece set", detail: "Antaravasaka + Uttarasanga, cut to traditional monastic proportions" },
    ],
    /**
     * The 11 Chivar photographs cover three different robe shades. Grouping
     * them by colour lets the product page swap the gallery when a shade is
     * picked, instead of showing an orange robe to someone buying maroon.
     *
     * Classified by eye from the source photography; indexes refer to the
     * scraped image order. Anything not listed here (the three-robe lineup,
     * the size chart, the vihara and Sangha photographs) is shared and gets
     * appended to whichever colour is selected.
     */
    colorImageIndexes: {
      Orange: [1, 7, 4, 8],
      Brown: [2],
      Yellow: [0, 6],
    },
  },

  // --- Statues ------------------------------------------------------------
  "brass-buddha-statue-in-vitarka-mudra-hand-painted-finish-lotus-pedestal": {
    category: "statues",
    tags: ["brass", "buddha statue", "vitarka mudra", "handmade", "home decor"],
    material: "Brass, hand-painted finish",
    stock: 6,
    bulkEnquiry: true,
  },

  // --- Academics ----------------------------------------------------------
  "lucents-general-knowledge-book": {
    category: "academics",
    author: "Lucent Publications",
    language: "English",
    publisher: "Lucent Publications",
    binding: "Paperback",
    tags: ["general knowledge", "competitive exams", "reference"],
    stock: 60,
  },
  "lucents-general-knowledge-book-hindi": {
    category: "academics",
    author: "Lucent Publications",
    language: "Hindi",
    publisher: "Lucent Publications",
    binding: "Paperback",
    tags: ["general knowledge", "competitive exams", "reference"],
    stock: 60,
  },

  // --- Buddhism -----------------------------------------------------------
  "the-buddha-and-his-dhamma": {
    category: "buddhism",
    author: "Dr. B. R. Ambedkar",
    language: "English",
    publisher: "Sugat Prakashan",
    tags: ["dhamma", "buddha", "ambedkar", "classic"],
    stock: 50,
    featured: true,
  },
  "bhagwan-buddha-aur-unka-dhamma": {
    category: "buddhism",
    author: "Dr. B. R. Ambedkar",
    language: "Hindi",
    publisher: "Sugat Prakashan",
    tags: ["dhamma", "buddha", "ambedkar"],
    stock: 45,
    featured: true,
  },
  "bhagwan-gautam-buddha-charitra-va-shikavan": {
    category: "buddhism",
    author: "Dr. Vinayak Go. Durge",
    language: "Marathi",
    publisher: "Sugat Prakashan, Nagpur",
    tags: ["buddha", "biography", "teachings"],
    stock: 40,
  },
  "milind-prashna-book": {
    category: "buddhism",
    author: "Bhadant Nagasena (trans.)",
    language: "Marathi",
    publisher: "Sugat Prakashan",
    tags: ["milinda panha", "philosophy", "dialogue"],
    stock: 35,
    featured: true,
  },
  "visuddhimagga-": {
    category: "buddhism",
    author: "Buddhaghosa",
    language: "Marathi",
    publisher: "Sugat Prakashan",
    tags: ["meditation", "pali", "commentary", "classic"],
    stock: 25,
    featured: true,
  },
  "jatak-katha": {
    category: "buddhism",
    language: "Marathi",
    publisher: "Sugat Prakashan",
    tags: ["jataka", "stories", "illustrated", "children"],
    stock: 40,
  },
  "buddha-puja-path": {
    category: "buddhism",
    author: "Dr. B. R. Ambedkar",
    language: "Marathi",
    publisher: "Sugat Prakashan",
    tags: ["puja", "ritual", "vandana", "practice"],
    stock: 120,
  },

  // --- Ambedkar & social thought -----------------------------------------
  "annihilation-of-caste-marathi-translation-": {
    category: "ambedkar",
    author: "Dr. B. R. Ambedkar",
    language: "Marathi",
    publisher: "Sugat Prakashan, Nagpur",
    tags: ["caste", "social reform", "classic"],
    stock: 40,
    featured: true,
  },
  "aspurushya-moolache-kon-who-are-the-untouchables": {
    category: "ambedkar",
    author: "Dr. B. R. Ambedkar",
    language: "Marathi",
    publisher: "Sugat Prakashan, Nagpur",
    tags: ["caste", "untouchability", "social reform"],
    stock: 35,
  },
  "riddles-in-hinduism-": {
    category: "ambedkar",
    author: "Dr. B. R. Ambedkar",
    language: "Marathi, English",
    publisher: "Sugat Prakashan",
    tags: ["religion", "critique", "classic"],
    stock: 30,
  },
  "kranti-ani-pratikranti": {
    category: "ambedkar",
    author: "Dr. B. R. Ambedkar",
    language: "Marathi",
    publisher: "Sugat Prakashan",
    tags: ["revolution", "history", "social thought"],
    stock: 25,
  },
  "gandhichya-magar-mithun-asprushya-samajachi-sutka": {
    category: "ambedkar",
    author: "Dr. B. R. Ambedkar",
    language: "Marathi",
    publisher: "Sugat Prakashan",
    tags: ["gandhi", "emancipation", "social reform"],
    stock: 30,
  },
  "buddha-marx-and-the-future-of-religion": {
    category: "ambedkar",
    author: "Dr. B. R. Ambedkar",
    language: "English",
    publisher: "Sugat Prakashan",
    tags: ["philosophy", "marx", "religion"],
    stock: 30,
  },
  "hindu-striyanchi-unnati-ani-avanti": {
    category: "ambedkar",
    author: "Dr. B. R. Ambedkar",
    language: "Marathi",
    publisher: "Sugat Prakashan",
    tags: ["women", "social history"],
    stock: 30,
  },
  "buddhist-literature-and-teachings": {
    // legacy slug; actual title "Shudra Purvi Kaun Hote ?"
    category: "ambedkar",
    author: "Dr. B. R. Ambedkar",
    language: "Hindi",
    publisher: "Sugat Prakashan",
    tags: ["shudra", "caste", "history"],
    stock: 25,
  },
  "buddhist-books-and-teachings": {
    // legacy slug; actual title "The Problem Of Rupee"
    category: "ambedkar",
    author: "Dr. B. R. Ambedkar",
    language: "English",
    publisher: "Sugat Prakashan",
    tags: ["economics", "currency", "classic"],
    stock: 20,
  },
  "buddhist-literature-and-teachings-3": {
    // legacy slug; actual title "Pakistan And The Partition of India"
    category: "ambedkar",
    author: "Dr. B. R. Ambedkar",
    language: "English",
    publisher: "Sugat Prakashan",
    tags: ["partition", "history", "politics"],
    stock: 20,
  },
  "vidhyarthano-jagrut-hwa": {
    category: "ambedkar",
    author: "Dr. B. R. Ambedkar",
    language: "Marathi",
    publisher: "Sugat Prakashan",
    tags: ["education", "students", "self-respect"],
    stock: 40,
  },
  "deshache-dushman": {
    category: "ambedkar",
    author: "Dinkarrao Jawalkar",
    language: "Marathi",
    publisher: "Sugat Prakashan, Nagpur",
    tags: ["social reform", "satyashodhak"],
    stock: 30,
  },

  // --- Biographies & history ---------------------------------------------
  "babasaheb-ambedkar-jeevan-charitra-book": {
    category: "biographies",
    author: "Pranoti Pantawane",
    language: "Marathi",
    publisher: "Sugat Prakashan",
    tags: ["biography", "ambedkar", "children", "young readers"],
    stock: 45,
  },
  "maharlok-mahat-folk": {
    category: "biographies",
    author: "Alexander Robertson",
    language: "Marathi",
    publisher: "Sugat Prakashan",
    tags: ["social history", "maharashtra", "community"],
    stock: 25,
  },
  "buddhist-literature-and-teachings-1": {
    // legacy slug; actual title "Savitribai Phule"
    category: "biographies",
    language: "Marathi",
    publisher: "Sugat Prakashan",
    tags: ["biography", "savitribai phule", "education", "women"],
    stock: 40,
  },
  "buddhist-literature-collection": {
    // legacy slug; actual title "Sant Kabir -Jeevan Charitra"
    category: "biographies",
    language: "Marathi",
    publisher: "Sugat Prakashan",
    tags: ["biography", "sant kabir", "bhakti"],
    stock: 35,
  },
  "buddhist-literature-and-teachings-2": {
    // legacy slug; actual title "Samrat Ashoka"
    category: "biographies",
    language: "Marathi",
    publisher: "Sugat Prakashan",
    tags: ["biography", "ashoka", "history", "buddhism"],
    stock: 35,
  },
};

/** Everything remaining is stationery; brand is the first word of the title. */
const STATIONERY_DEFAULTS = { category: "stationery", stock: 200 };

/**
 * The builder stored descriptions HTML-escaped inside an HTML attribute, so what
 * we scrape is double-encoded: the markup arrives as `&lt;p&gt;…&lt;/p&gt;`
 * rather than `<p>…</p>`. Rendering that as-is shows the tags to the customer,
 * so decode one level here and store real HTML.
 *
 * `&amp;` is decoded LAST so `&amp;lt;` survives as the literal text `&lt;`
 * instead of collapsing into a `<`. Running this on already-decoded HTML is a
 * no-op, so it is safe to re-run the build.
 */
const decodeEntities = (input) =>
  String(input ?? "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;|&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&ldquo;|&rdquo;/g, '"')
    .replace(/&nbsp;/g, " ")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&hellip;/g, "…")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&amp;/g, "&");

/** Plain-text version of a description, for search and meta tags. */
const stripTags = (html) =>
  decodeEntities(html)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|li|ul|ol|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

/** Title-case the legacy ribbon text ("best seller" / "BESTSELLER" -> "Best Seller"). */
function normaliseBadge(ribbon) {
  const r = String(ribbon ?? "").trim();
  if (!r) return null;
  const canon = r.toLowerCase().replace(/\s+/g, "");
  if (canon === "bestseller") return "Best Seller";
  if (canon === "new") return "New";
  if (canon === "handmade") return "Handmade";
  if (canon === "featured") return "Featured";
  if (canon === "premiumquality") return "Premium Quality";
  if (canon === "editor'spick" || canon === "editorspick") return "Editor's Pick";
  return r.replace(/\w\S*/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase());
}

function skuFor(slug, category, index) {
  const prefix =
    { chivar: "CHV", statues: "STA", stationery: "STN", academics: "ACD", buddhism: "BUD", ambedkar: "AMB", biographies: "BIO" }[
      category
    ] ?? "SBD";
  return `${prefix}-${String(index + 1).padStart(3, "0")}`;
}

async function main() {
  const legacy = JSON.parse(await readFile(IN, "utf8"));

  const products = legacy.products.map((p, i) => {
    const extra = ENRICHMENT[p.slug] ?? STATIONERY_DEFAULTS;
    const category = extra.category;
    const mrp = p.mrp ?? 0;
    const sale = p.salePrice != null && p.salePrice < mrp ? p.salePrice : null;
    const price = sale ?? mrp;

    // Legacy store stored a mixed-case ribbon; the storefront wants one badge.
    const badge = normaliseBadge(p.ribbon);

    const title = decodeEntities(p.title).trim();
    const subtitle = decodeEntities(p.subtitle).trim();

    const brand =
      category === "stationery" ? title.split(/\s+/)[0].replace(/'s$/i, "") : undefined;

    // Turn the curated colour->index map into colour->URL lists, with every
    // unclaimed image appended as shared context for each shade.
    let optionImages = null;
    if (extra.colorImageIndexes) {
      const claimed = new Set(Object.values(extra.colorImageIndexes).flat());
      const shared = p.images.filter((_, idx) => !claimed.has(idx));
      optionImages = {
        Color: Object.fromEntries(
          Object.entries(extra.colorImageIndexes).map(([value, indexes]) => [
            value,
            [...indexes.map((idx) => p.images[idx]).filter(Boolean), ...shared],
          ]),
        ),
      };
    }

    return {
      slug: p.slug,
      legacyId: p.legacyId,
      sku: skuFor(p.slug, category, i),
      title,
      subtitle: subtitle || null,
      badge,
      category,
      descriptionHtml: decodeEntities(p.descriptionHtml),
      description: stripTags(p.descriptionHtml),
      images: p.images,
      image: p.images[0] ?? null,
      mrp,
      salePrice: sale,
      price,
      discountPercent: sale ? Math.round(((mrp - sale) / mrp) * 100) : 0,
      currency: p.currency || "INR",
      stock: extra.stock ?? 25,
      inStock: p.available !== false,
      author: extra.author ?? null,
      language: extra.language ?? null,
      publisher: extra.publisher ?? null,
      binding: extra.binding ?? null,
      brand: brand ?? null,
      material: extra.material ?? null,
      care: extra.care ?? null,
      sizeGuide: extra.sizeGuide ?? null,
      bulkEnquiry: extra.bulkEnquiry ?? false,
      featured: extra.featured ?? false,
      tags: extra.tags ?? [],
      options: p.options,
      optionImages,
      productType: p.productType,
      legacyCollections: p.legacyCollections,
      rating: null,
      reviewCount: 0,
      // Cheap prefix-search index so the storefront can filter without paying
      // for a search service (SRS FR-1.3, free-tier constraint).
      searchTokens: [
        ...new Set(
          [title, subtitle, extra.author, extra.language, extra.publisher, brand, ...(extra.tags ?? [])]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .replace(/[^\p{L}\p{N}\s]/gu, " ")
            .split(/\s+/)
            .filter((t) => t.length > 1),
        ),
      ],
    };
  });

  // Sanity checks — fail loudly rather than seeding a broken catalog.
  const problems = [];
  for (const p of products) {
    if (!p.title) problems.push(`${p.slug}: missing title`);
    if (!p.image) problems.push(`${p.slug}: no image`);
    if (!p.price) problems.push(`${p.slug}: price is ${p.price}`);
    if (!CATEGORIES.some((c) => c.slug === p.category)) problems.push(`${p.slug}: unknown category ${p.category}`);
  }

  const counts = {};
  for (const p of products) counts[p.category] = (counts[p.category] ?? 0) + 1;

  await mkdir(path.dirname(OUT), { recursive: true });
  await writeFile(
    OUT,
    JSON.stringify(
      { generatedAt: new Date().toISOString(), source: legacy.source, categories: CATEGORIES, counts, products },
      null,
      2,
    ),
    "utf8",
  );

  console.log(`Wrote ${products.length} products -> ${path.relative(process.cwd(), OUT)}`);
  console.table(counts);
  if (problems.length) {
    console.error("Problems:");
    for (const p of problems) console.error("  " + p);
    process.exitCode = 1;
  }
}

main();
