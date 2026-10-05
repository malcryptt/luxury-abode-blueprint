import { doc, getDoc, serverTimestamp, writeBatch, type DocumentData } from "firebase/firestore";
import { auth, db } from "@/integrations/firebase/client";

/**
 * How often one visitor may send. Two layers:
 *  1. In the browser (everyone): a friendly cooldown and a daily cap, kept in localStorage.
 *  2. In firestore.rules (signed-in customers): the same numbers, enforced by Firebase itself through a small
 *     "ticket" document written together with each message. Keep the numbers below in step with firestore.rules.
 */
export const RATE = {
  enquiry: { gapSeconds: 60, perDay: 5, label: "enquiries" },
  message: { gapSeconds: 10, perDay: 50, label: "messages" },
} as const;
export type RateKind = keyof typeof RATE;

const DAY_MS = 24 * 3600 * 1000;
const key = (k: RateKind) => `wsl-rate-${k}`;

const readTimes = (k: RateKind): number[] => {
  try {
    const raw = JSON.parse(localStorage.getItem(key(k)) || "[]");
    const now = Date.now();
    return Array.isArray(raw) ? raw.filter((t) => typeof t === "number" && now - t < DAY_MS && t <= now + 60_000) : [];
  } catch { return []; }
};

export type RateCheck = { ok: true } | { ok: false; message: string; waitSeconds: number };

/** Can this visitor send another one right now? (Browser-side check.) */
export function checkRate(k: RateKind, now = Date.now()): RateCheck {
  const { gapSeconds, perDay, label } = RATE[k];
  const times = readTimes(k);
  const last = times.length ? Math.max(...times) : 0;
  const wait = Math.ceil((last + gapSeconds * 1000 - now) / 1000);
  if (last && wait > 0) return { ok: false, waitSeconds: wait, message: `Please wait ${wait} second${wait === 1 ? "" : "s"} before sending another.` };
  if (times.length >= perDay) {
    const free = Math.ceil((Math.min(...times) + DAY_MS - now) / 3600000);
    return { ok: false, waitSeconds: free * 3600, message: `You have reached today's limit of ${perDay} ${label}. Please try again in about ${free} hour${free === 1 ? "" : "s"}, or call us on 08028081047.` };
  }
  return { ok: true };
}

export function recordSend(k: RateKind) {
  try { localStorage.setItem(key(k), JSON.stringify([...readTimes(k), Date.now()])); } catch { /* private mode: the server still limits signed-in customers */ }
}

export const RATE_REJECTED = "You are sending too quickly or too often. Please wait a little and try again, or call us on 08028081047.";

/** True when Firebase refused a write, which for a signed-in customer means the rules' rate limit. */
export const isRefused = (e: unknown) => (e as { code?: string })?.code === "permission-denied";

const utcDay = (d = new Date()) => `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}-${d.getUTCDate()}`;
const newId = () => (crypto.randomUUID?.() ?? `${Date.now()}${Math.random()}`).replace(/[^a-zA-Z0-9]/g, "").slice(0, 20);

/**
 * Saves one document. For a signed-in visitor the same batch also stamps their "ticket" (limits/<kind>_<uid>), which
 * firestore.rules checks for the gap and daily count. Anonymous visitors just write the document.
 */
export async function guardedCreate(kind: RateKind, path: string[], data: DocumentData): Promise<void> {
  const ref = doc(db, ...path, newId());
  const uid = auth.currentUser?.uid;
  if (!uid) {
    const b = writeBatch(db);
    b.set(ref, data);
    await b.commit();
    return;
  }
  const ticket = doc(db, "limits", `${kind === "enquiry" ? "enq" : "msg"}_${uid}`);
  let count = 1;
  try {
    const snap = await getDoc(ticket);
    const t = snap.exists() ? snap.data() : null;
    if (t && t.day === utcDay()) count = (Number(t.count) || 0) + 1;
  } catch { /* first send, or the document is not readable yet: the rules decide */ }
  const b = writeBatch(db);
  b.set(ref, data);
  b.set(ticket, { last: serverTimestamp(), day: utcDay(), count });
  await b.commit();
}
