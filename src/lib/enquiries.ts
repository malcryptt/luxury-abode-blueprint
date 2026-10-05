import { z } from "zod";
import {
  addDoc, collection, deleteDoc, doc, getCountFromServer, getDocs, limit as fsLimit, orderBy, query, serverTimestamp,
  Timestamp, updateDoc, where, type DocumentData, type QueryDocumentSnapshot,
} from "firebase/firestore";
import { auth, db } from "@/integrations/firebase/client";
import type { EnquiryRow, EnquiryStatus } from "@/lib/db";

export const col = () => collection(db, "enquiries");

export const toRow = (d: QueryDocumentSnapshot<DocumentData>): EnquiryRow => {
  const x = d.data();
  const created = x.created_at?.toDate?.() ?? new Date();
  return {
    id: d.id, name: x.name ?? "", phone: x.phone ?? "", email: x.email ?? null, interest: x.interest ?? null, message: x.message ?? null,
    source: x.source ?? "", status: x.status ?? "new", notes: x.notes ?? null, handled_by: x.handled_by ?? null,
    user_id: x.user_id ?? null, seen_at: x.seen_at?.toDate?.().toISOString() ?? null, seen_by: x.seen_by ?? null,
    created_at: created.toISOString(), updated_at: created.toISOString(),
  };
};

/* ---------------------------------------------------------------------------
   Visitor side: validate and save an enquiry
--------------------------------------------------------------------------- */

const digitsOnly = (s: string) => s.replace(/\D/g, "");

export const enquirySchema = z.object({
  name: z.string().trim().min(1, "Please enter your name").max(100, "Name must be under 100 characters"),
  phone: z
    .string()
    .trim()
    .min(1, "Please enter your phone number")
    .max(30, "That phone number is too long")
    .regex(/^[0-9+()\-\s.]+$/, "Use digits only (you can include + and spaces)")
    .refine((v) => digitsOnly(v).length >= 7 && digitsOnly(v).length <= 15, "Please enter a valid phone number"),
  email: z
    .string()
    .trim()
    .max(255, "That email is too long")
    .refine((v) => v === "" || z.string().email().safeParse(v).success, "Please enter a valid email address"),
  interest: z.string().trim().max(200, "Keep this under 200 characters"),
  message: z.string().trim().max(1000, "Message must be under 1000 characters"),
});

export type EnquiryInput = z.infer<typeof enquirySchema>;
export type EnquiryErrors = Partial<Record<keyof EnquiryInput, string>>;

export const emptyEnquiry: EnquiryInput = { name: "", phone: "", email: "", interest: "", message: "" };

export interface EnquiryValidation {
  ok: boolean;
  data?: EnquiryInput;
  errors?: EnquiryErrors;
}

export function validateEnquiry(input: EnquiryInput): EnquiryValidation {
  const parsed = enquirySchema.safeParse(input);
  if (parsed.success) return { ok: true, data: parsed.data };
  const errors: EnquiryErrors = {};
  for (const issue of parsed.error.issues) {
    const key = issue.path[0] as keyof EnquiryInput;
    if (key && !errors[key]) errors[key] = issue.message;
  }
  return { ok: false, errors };
}

/** Saves a validated enquiry. Visitors can create but never read enquiries (see firestore.rules). */
export async function submitEnquiry(data: EnquiryInput, source: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    // addDoc waits for the server; don't leave a visitor staring at "Sending…" on a bad connection.
    await Promise.race([
      addDoc(col(), {
        name: data.name,
        phone: data.phone,
        email: data.email || null,
        interest: data.interest || null,
        message: data.message || null,
        source: source.slice(0, 120),
        status: "new",
        notes: null,
        handled_by: null,
        user_id: auth.currentUser?.uid ?? null,
        created_at: serverTimestamp(),
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 10000)),
    ]);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/** The message the visitor sends us on WhatsApp after submitting. */
export function buildEnquiryWhatsApp(data: EnquiryInput, topic?: string): string {
  const lines = ["New enquiry from the WSL Realty website", ""];
  if (topic) lines.push(`Regarding: ${topic}`);
  lines.push(`Name: ${data.name}`, `Phone: ${data.phone}`);
  if (data.email) lines.push(`Email: ${data.email}`);
  if (data.interest && data.interest !== topic) lines.push(`Interested in: ${data.interest}`);
  if (data.message) lines.push("", data.message);
  return lines.join("\n");
}

/* ---------------------------------------------------------------------------
   Admin side: read and manage enquiries
--------------------------------------------------------------------------- */

export const STATUS_LABEL: Record<EnquiryStatus, string> = { new: "New", contacted: "Contacted", closed: "Closed" };

export const FETCH_LIMIT = 500;

export async function fetchEnquiries(limit = FETCH_LIMIT): Promise<{ rows: EnquiryRow[]; total: number }> {
  const [snap, total] = await Promise.all([
    getDocs(query(col(), orderBy("created_at", "desc"), fsLimit(limit))),
    getCountFromServer(col()),
  ]);
  const rows = snap.docs.map(toRow);
  return { rows, total: total.data().count };
}

export async function countEnquiries(status?: EnquiryStatus): Promise<number> {
  const q = status ? query(col(), where("status", "==", status)) : query(col());
  return (await getCountFromServer(q)).data().count;
}

export async function fetchEnquiryDates(sinceIso: string): Promise<string[]> {
  const snap = await getDocs(query(col(), where("created_at", ">=", Timestamp.fromDate(new Date(sinceIso))), orderBy("created_at", "desc"), fsLimit(2000)));
  return snap.docs.map((d) => toRow(d).created_at);
}

export async function fetchRecentEnquiries(limit = 5): Promise<EnquiryRow[]> {
  const snap = await getDocs(query(col(), orderBy("created_at", "desc"), fsLimit(limit)));
  return snap.docs.map(toRow);
}

export async function updateEnquiry(
  id: string,
  patch: { status?: EnquiryStatus; notes?: string | null; seen_at?: unknown; seen_by?: string },
  userId?: string,
): Promise<void> {
  await updateDoc(doc(db, "enquiries", id), { ...patch, ...(userId ? { handled_by: userId } : {}) });
}

export async function deleteEnquiry(id: string): Promise<void> {
  await deleteDoc(doc(db, "enquiries", id));
}

/* ---------------------------------------------------------------------------
   Helpers shared by the inbox and dashboard
--------------------------------------------------------------------------- */

export const CHAT_SUFFIX = "|chat";

export function sourceLabel(source: string): string {
  if (source.endsWith(CHAT_SUFFIX)) return `${sourceLabel(source.slice(0, -CHAT_SUFFIX.length))} · Chat`;
  if (source === "contact_page") return "Contact page";
  if (source.startsWith("property:")) return `Property · ${source.slice(9)}`;
  if (source.startsWith("furniture:")) return `Furniture · ${source.slice(10)}`;
  if (source.startsWith("project:")) return `Project · ${source.slice(8)}`;
  return source || "Website";
}

/** Turns a phone number as typed into the digits WhatsApp's wa.me links expect (Nigeria by default). */
export function toWhatsAppNumber(phone: string): string {
  let d = digitsOnly(phone);
  if (d.startsWith("00")) d = d.slice(2);
  else if (d.startsWith("0")) d = "234" + d.slice(1);
  return d;
}

/** Spreadsheet programs run cells that start with = + - @ as formulas. Enquiries are typed by strangers, so defuse them. */
export function csvCell(value: string | null | undefined): string {
  let v = (value ?? "").replace(/\r?\n/g, " ");
  if (/^[=+\-@\t]/.test(v)) v = "'" + v;
  return `"${v.replace(/"/g, '""')}"`;
}

export function enquiriesToCsv(rows: EnquiryRow[]): string {
  const header = ["Received", "Name", "Phone", "Email", "Interested in", "Message", "Source", "Status", "Notes"];
  const body = rows.map((r) =>
    [r.created_at, r.name, r.phone, r.email, r.interest, r.message, sourceLabel(r.source), STATUS_LABEL[r.status], r.notes]
      .map(csvCell)
      .join(","),
  );
  return "﻿" + [header.map(csvCell).join(","), ...body].join("\r\n");
}

/** "5 min ago", "2 days ago", or a date for anything older than a month. */
export const timeAgo = (iso: string) => {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const h = Math.round(mins / 60);
  if (h < 24) return `${h} hr ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d} day${d === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
};

