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

/* ---------- Video ---------- */

/** Biggest video the admin may upload, and the longest. Both keep the site fast and stay inside Cloudinary's free plan. */
export const MAX_VIDEO_MB = 100;
export const MAX_VIDEO_SECONDS = 90;
/** Most videos Previous Jobs may hold (the Arya Luxe page has one more of its own). */
export const MAX_JOB_VIDEOS = 6;
const VIDEO_TYPES = /^video\/(mp4|webm|quicktime)$/;

/** How the site asks Cloudinary to deliver a video: re-encoded smaller, capped at 960px wide, best codec per browser. */
const VIDEO_DELIVERY = "f_auto,q_auto:eco,vc_auto,w_960,c_limit";

/** Reads a video's length in the browser. Resolves null when the browser cannot read it (the size limit still applies). */
function videoSeconds(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const v = document.createElement("video");
    const url = URL.createObjectURL(file);
    const done = (n: number | null) => { URL.revokeObjectURL(url); v.removeAttribute("src"); resolve(n); };
    v.preload = "metadata";
    v.onloadedmetadata = () => done(Number.isFinite(v.duration) ? v.duration : null);
    v.onerror = () => done(null);
    setTimeout(() => done(null), 8000);
    v.src = url;
  });
}

/** Checks a video before any upload starts. Returns the problem in plain words, or null when it is fine. */
export async function videoProblem(file: File): Promise<string | null> {
  if (!VIDEO_TYPES.test(file.type)) return "Please choose an MP4, WebM or MOV video";
  if (file.size > MAX_VIDEO_MB * 1024 * 1024) return `That video is ${(file.size / 1048576).toFixed(1)} MB. The limit is ${MAX_VIDEO_MB} MB. Trim it or export it at a lower quality, then try again`;
  const s = await videoSeconds(file);
  if (s !== null && s > MAX_VIDEO_SECONDS + 0.5) return `That video is ${Math.round(s)} seconds long. The limit is ${MAX_VIDEO_SECONDS} seconds`;
  return null;
}

/** Uploads a video to Cloudinary with progress, and returns the URL the site should play (already set to compressed delivery). */
export async function uploadVideo(file: File, onProgress?: (percent: number) => void): Promise<string> {
  const problem = await videoProblem(file);
  if (problem) throw new Error(problem);
  if (!CLOUD || !PRESET) throw new Error("Uploads are not set up yet. See FIREBASE_SETUP.md, step 4.");
  const body = new FormData();
  body.append("file", file);
  body.append("upload_preset", PRESET);
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `https://api.cloudinary.com/v1_1/${CLOUD}/video/upload`);
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100)); };
    xhr.onerror = () => reject(new Error("The upload failed. Check your connection and try again."));
    xhr.onload = () => {
      let json: { secure_url?: string; error?: { message?: string } } = {};
      try { json = JSON.parse(xhr.responseText); } catch { /* handled below */ }
      if (xhr.status >= 200 && xhr.status < 300 && json.secure_url) resolve(videoDelivery(json.secure_url));
      else reject(new Error(json.error?.message?.toLowerCase().includes("format") ? "Cloudinary refused that video format. In Cloudinary, allow mp4, webm and mov on the upload preset (see FIREBASE_SETUP.md)." : "The upload failed. Please try again."));
    };
    xhr.send(body);
  });
}

/** Puts the compressed-delivery settings into a Cloudinary video URL (idempotent). */
export function videoDelivery(url: string): string {
  if (!/^https:\/\/res\.cloudinary\.com\/[^/]+\/video\/upload\//.test(url) || url.includes(VIDEO_DELIVERY)) return url;
  return url.replace("/video/upload/", `/video/upload/${VIDEO_DELIVERY}/`);
}

/** A still frame to show before the video is played, so the page never downloads the video until someone presses play. */
export function videoPoster(url: string): string {
  if (!/^https:\/\/res\.cloudinary\.com\/[^/]+\/video\/upload\//.test(url)) return "";
  return url.replace(/\/video\/upload\/(?:[^/]*\/)?(v\d+\/)/, "/video/upload/so_0,f_jpg,q_auto,w_960,c_limit/$1").replace(/\.[a-z0-9]+$/i, ".jpg");
}
