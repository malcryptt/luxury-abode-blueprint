import { z } from "zod";
import { db, type EnquiryRow, type EnquiryStatus } from "@/lib/db";

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

/** Saves a validated enquiry. Visitors can insert but never read, so no row is requested back. */
export async function submitEnquiry(data: EnquiryInput, source: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await db.from("enquiries").insert({
    name: data.name,
    phone: data.phone,
    email: data.email || null,
    interest: data.interest || null,
    message: data.message || null,
    source: source.slice(0, 120),
  });
  return error ? { ok: false, error: error.message } : { ok: true };
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
  const { data, error, count } = await db
    .from("enquiries")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  const rows = (data ?? []) as EnquiryRow[];
  return { rows, total: count ?? rows.length };
}

export async function countEnquiries(status?: EnquiryStatus): Promise<number> {
  let q = db.from("enquiries").select("id", { count: "exact", head: true });
  if (status) q = q.eq("status", status);
  const { count, error } = await q;
  if (error) throw error;
  return count ?? 0;
}

export async function fetchEnquiryDates(sinceIso: string): Promise<string[]> {
  const { data, error } = await db
    .from("enquiries")
    .select("created_at")
    .gte("created_at", sinceIso)
    .order("created_at", { ascending: false })
    .limit(2000);
  if (error) throw error;
  return ((data ?? []) as { created_at: string }[]).map((r) => r.created_at);
}

export async function fetchRecentEnquiries(limit = 5): Promise<EnquiryRow[]> {
  const { data, error } = await db.from("enquiries").select("*").order("created_at", { ascending: false }).limit(limit);
  if (error) throw error;
  return (data ?? []) as EnquiryRow[];
}

export async function updateEnquiry(
  id: string,
  patch: { status?: EnquiryStatus; notes?: string | null },
  userId?: string,
): Promise<void> {
  const { error } = await db
    .from("enquiries")
    .update({ ...patch, ...(userId ? { handled_by: userId } : {}) })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteEnquiry(id: string): Promise<void> {
  const { error } = await db.from("enquiries").delete().eq("id", id);
  if (error) throw error;
}

/* ---------------------------------------------------------------------------
   Helpers shared by the inbox and dashboard
--------------------------------------------------------------------------- */

export function sourceLabel(source: string): string {
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

