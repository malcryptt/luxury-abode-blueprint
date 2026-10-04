import { supabase } from "@/integrations/supabase/client";

const MAX_BYTES = 8 * 1024 * 1024;

/** Uploads an image to the public bucket and returns its public URL. Staff only (enforced by storage policy). */
export async function uploadImage(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Please choose an image file");
  if (file.size > MAX_BYTES) throw new Error("The image must be under 8 MB");
  const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "jpg";
  const path = `uploads/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
  const { error } = await supabase.storage.from("property-images").upload(path, file, { contentType: file.type });
  if (error) throw new Error("The upload failed. Please try again.");
  return supabase.storage.from("property-images").getPublicUrl(path).data.publicUrl;
}
