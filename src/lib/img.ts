/**
 * Asks Cloudinary for a smaller copy of a photo so phones do not download a 1800 px picture for a 400 px slot.
 * Only a few widths are ever requested (400, 900, 1400) so each photo is made once and then served from the CDN cache.
 * Anything that is not a Cloudinary image (bundled photos, other hosts) is returned unchanged.
 */
export function sized(url: string | undefined, width: number): string {
  // Bundled renders ship with a 900 px copy for cards and galleries.
  if (url && /^\/arya\/[^/]+\.webp$/.test(url) && !url.endsWith("-900.webp") && width <= 1400) return url.replace(/\.webp$/, "-900.webp");
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
