
/**
 * Google Analytics (GA4), loaded directly with Google's tag. Nothing is loaded or sent until the visitor presses Accept
 * on the cookie notice (see CookieNotice). The measurement ID is a public identifier, not a secret.
 */
export const MEASUREMENT_ID = (import.meta.env.VITE_FIREBASE_MEASUREMENT_ID as string | undefined) || "G-1B44M4ZTBE";

const KEY = "wsl-analytics-consent";
export type Consent = "granted" | "denied" | null;

export function getConsent(): Consent {
  try { const v = localStorage.getItem(KEY); return v === "granted" || v === "denied" ? v : null; } catch { return null; }
}
export function setConsent(v: "granted" | "denied") {
  try { localStorage.setItem(KEY, v); } catch { /* the choice just is not remembered */ }
  if (v === "granted") { setDisabled(false); start(); } else setDisabled(true);
}

type Gtag = (...args: unknown[]) => void;
declare global { interface Window { dataLayer?: unknown[]; gtag?: Gtag } }

let loaded = false;
const disableKey = `ga-disable-${MEASUREMENT_ID}`;
const setDisabled = (v: boolean) => { (window as unknown as Record<string, unknown>)[disableKey] = v; };

/** Loads Google's own tag (gtag.js) directly. It needs only the measurement ID, nothing else from Firebase. */
function start() {
  if (loaded || typeof document === "undefined") return;
  loaded = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() { (window.dataLayer as unknown[]).push(arguments); };
  window.gtag("js", new Date());
  // Page views are sent by hand on every route change (the site is a single-page app).
  window.gtag("config", MEASUREMENT_ID, { send_page_view: false, anonymize_ip: true });
  const el = document.createElement("script");
  el.async = true;
  el.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(MEASUREMENT_ID)}`;
  document.head.appendChild(el);
}

/** Start Analytics at page load only if the visitor already accepted on an earlier visit. */
export function initAnalytics() {
  if (getConsent() === "granted") start();
}

export function track(name: string, params?: Record<string, string | number | boolean>) {
  if (getConsent() !== "granted") return;
  start();
  window.gtag?.("event", name, params);
}

export function trackPage(path: string) {
  track("page_view", { page_path: path, page_location: window.location.origin + path, page_title: document.title });
}

/** WhatsApp, phone and email taps anywhere on the public site. */
export function trackContactClick(e: MouseEvent) {
  const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
  if (!a) return;
  const href = a.getAttribute("href") || "";
  if (/^https:\/\/(wa\.me|api\.whatsapp\.com|web\.whatsapp\.com)\//i.test(href)) track("whatsapp_click", { link_path: window.location.pathname });
  else if (href.startsWith("tel:")) track("call_click", { link_path: window.location.pathname });
  else if (href.startsWith("mailto:")) track("email_click", { link_path: window.location.pathname });
}
