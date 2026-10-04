const MAX_BYTES = 8 * 1024 * 1024;
const CLOUD = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string | undefined;
const PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string | undefined;

/** Uploads an image to Cloudinary (free, no card needed) and returns its public https URL. */
export async function uploadImage(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Please choose an image file");
  if (file.size > MAX_BYTES) throw new Error("The image must be under 8 MB");
  if (!CLOUD || !PRESET) throw new Error("Photo uploads are not set up yet. See FIREBASE_SETUP.md, step 4.");
  const body = new FormData();
  body.append("file", file);
  body.append("upload_preset", PRESET);
  try {
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`, { method: "POST", body });
    const json = await res.json();
    if (!res.ok || !json.secure_url) throw new Error(json?.error?.message || "upload failed");
    return json.secure_url as string;
  } catch {
    throw new Error("The upload failed. Please try again.");
  }
}
