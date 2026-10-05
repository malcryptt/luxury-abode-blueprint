const MAX_BYTES = 25 * 1024 * 1024; // before compression; phone photos are often 5-12 MB
const MAX_SIDE = 1800;
const QUALITY = 0.82;
const CLOUD = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string | undefined;
const PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string | undefined;

/** Shrinks big photos in the browser (max 1800px, WebP/JPEG) so pages load fast. Falls back to the original on any problem. */
export async function compressImage(file: File): Promise<File> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file; // GIF/SVG/AVIF left untouched
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
    if (scale === 1 && file.size < 400 * 1024) { bmp.close(); return file; }
    const w = Math.round(bmp.width * scale), h = Math.round(bmp.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) { bmp.close(); return file; }
    ctx.drawImage(bmp, 0, 0, w, h);
    bmp.close();
    const blob: Blob | null = await new Promise((r) => canvas.toBlob(r, "image/webp", QUALITY));
    if (!blob || blob.type !== "image/webp" || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".webp", { type: "image/webp" });
  } catch {
    return file;
  }
}

/** Uploads an image to Cloudinary (free, no card needed) and returns its public https URL. */
export async function uploadImage(file: File): Promise<string> {
  // Only plain raster photos: SVG files can carry scripts, so they are refused.
  if (!/^image\/(jpeg|png|webp|avif|gif)$/.test(file.type)) throw new Error("Please choose a JPG, PNG, WebP, AVIF or GIF photo");
  if (file.size > MAX_BYTES) throw new Error("The image must be under 25 MB");
  if (!CLOUD || !PRESET) throw new Error("Photo uploads are not set up yet. See FIREBASE_SETUP.md, step 4.");
  const body = new FormData();
  body.append("file", await compressImage(file));
  body.append("upload_preset", PRESET);
  try {
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`, { method: "POST", body });
    const json = await res.json();
    if (!res.ok || !json.secure_url) throw new Error(json?.error?.message || "upload failed");
    // f_auto,q_auto lets Cloudinary serve the lightest format each browser supports.
    return (json.secure_url as string).replace("/image/upload/", "/image/upload/f_auto,q_auto/");
  } catch {
    throw new Error("The upload failed. Please try again.");
  }
}
