/**
 * Asks Cloudinary for a smaller copy of a photo so phones do not download a 1800 px picture for a 400 px slot.
 * Anything that is not a Cloudinary image (bundled photos, other hosts) is returned unchanged.
 */
export function sized(url: string | undefined, width: number): string {
  if (!url || !/^https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\//.test(url)) return url || "";
  const rest = url.split("/image/upload/")[1] || "";
  if (/(^|,)w_\d+/.test(rest.split("/")[0] || "")) return url;
  const first = rest.split("/")[0];
  const hasTransform = !/^v\d+$/.test(first) && first.includes("_");
  const size = `w_${width},c_limit`;
  return hasTransform
    ? url.replace("/image/upload/" + first + "/", `/image/upload/${first},${size}/`)
    : url.replace("/image/upload/", `/image/upload/f_auto,q_auto,${size}/`);
}
