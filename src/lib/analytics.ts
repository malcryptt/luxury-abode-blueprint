import type { Analytics } from "firebase/analytics";
import { app } from "@/integrations/firebase/client";

/**
 * Google Analytics (GA4) through Firebase. Nothing is loaded or sent until the visitor presses Accept
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
  if (v === "granted") void start(); else stop();
}

let instance: Promise<Analytics | null> | null = null;

function start(): Promise<Analytics | null> {
  if (!instance) {
    instance = (async () => {
      try {
        const m = await import("firebase/analytics");
        if (!(await m.isSupported())) return null;
        // Page views are sent by hand on every route change (the site is a single-page app).
        const a = m.initializeAnalytics(app, { config: { send_page_view: false } });
        m.setAnalyticsCollectionEnabled(a, true);
        return a;
      } catch { return null; }
    })();
  }
  return instance;
}

function stop() {
  if (!instance) return;
  instance.then(async (a) => { if (a) (await import("firebase/analytics")).setAnalyticsCollectionEnabled(a, false); }).catch(() => {});
}

/** Start Analytics at page load only if the visitor already accepted on an earlier visit. */
export function initAnalytics() {
  if (getConsent() === "granted") void start();
}

export function track(name: string, params?: Record<string, string | number | boolean>) {
  if (getConsent() !== "granted") return;
  start().then(async (a) => { if (a) (await import("firebase/analytics")).logEvent(a, name, params); }).catch(() => {});
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
