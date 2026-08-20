"use client";

/**
 * Image handling for the media library.
 *
 * Firebase Storage is not enabled on this project (it needs the paid Blaze
 * plan), so uploaded images live in Firestore as data URIs. That imposes two
 * constraints this module exists to respect:
 *
 *   1. A Firestore document caps at 1 MiB. Base64 inflates bytes by about a
 *      third, so anything straight off a phone camera has to be resized and
 *      re-encoded before it will fit.
 *   2. Firestore has no partial document read — asking for a document gets you
 *      every byte of it. So each image is written twice: a small thumbnail in
 *      `media/{id}` for grids and pickers, and the full-size copy in a separate
 *      `mediaFull/{id}` fetched only when something actually displays it.
 */

/** Hard ceiling for a Firestore document. */
const DOC_LIMIT = 1_048_576;
/** Leave room for the metadata fields alongside the image data. */
const FULL_BUDGET = 900_000;
const THUMB_BUDGET = 60_000;

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export interface EncodedImage {
  dataUri: string;
  width: number;
  height: number;
  bytes: number;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("That file could not be read as an image."));
    };
    img.src = url;
  });
}

/**
 * Resize to fit `maxEdge`, then step the JPEG quality down until the encoded
 * result fits `budget`. Returns null if even the lowest quality is too large,
 * which only happens for genuinely enormous source images.
 */
function encodeToFit(
  img: HTMLImageElement,
  maxEdge: number,
  budget: number,
): EncodedImage | null {
  const scale = Math.min(1, maxEdge / Math.max(img.naturalWidth, img.naturalHeight));
  const width = Math.max(1, Math.round(img.naturalWidth * scale));
  const height = Math.max(1, Math.round(img.naturalHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  // White ground, so transparent PNGs do not turn black when flattened to JPEG.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  for (const quality of [0.86, 0.78, 0.7, 0.62, 0.54, 0.45, 0.36]) {
    const dataUri = canvas.toDataURL("image/jpeg", quality);
    // A data URI is base64, so its byte length is close enough to its length.
    if (dataUri.length <= budget) {
      return { dataUri, width, height, bytes: dataUri.length };
    }
  }
  return null;
}

export interface PreparedImage {
  thumb: EncodedImage;
  full: EncodedImage;
}

/**
 * Turn a picked file into the two sizes the library stores. Throws with a
 * message meant for the person doing the uploading.
 */
export async function prepareImage(file: File): Promise<PreparedImage> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose an image file.");
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("That image is over 25 MB. Please choose a smaller one.");
  }

  const img = await loadImage(file);

  const full = encodeToFit(img, 1600, FULL_BUDGET);
  if (!full) {
    throw new Error("That image is too detailed to store. Try a smaller one.");
  }

  const thumb = encodeToFit(img, 420, THUMB_BUDGET) ?? full;

  if (full.bytes >= DOC_LIMIT) {
    throw new Error("That image is too large to store. Please choose a smaller one.");
  }
  return { thumb, full };
}

export function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

/** Images stored in Firestore are data URIs; next/image cannot optimise those. */
export function isInlineImage(src: string | null | undefined) {
  return typeof src === "string" && src.startsWith("data:");
}
