import { useQuery } from "@tanstack/react-query";
import {
  addDoc, collection, doc, getDocs, query, serverTimestamp, updateDoc, where, type DocumentData,
} from "firebase/firestore";
import { db } from "@/integrations/firebase/client";
import type { EnquiryRow } from "@/lib/db";
import { col, toRow, updateEnquiry } from "@/lib/enquiries";

export interface ThreadMessage {
  id: string;
  from: "staff" | "customer";
  text: string;
  author: string;
  created_at: string;
  seen_at: string | null;
}

const messagesCol = (enquiryId: string) => collection(db, "enquiries", enquiryId, "messages");

const toMessage = (id: string, x: DocumentData): ThreadMessage => ({
  id, from: x.from === "staff" ? "staff" : "customer", text: x.text ?? "", author: x.author ?? "",
  created_at: x.created_at?.toDate?.().toISOString() ?? new Date().toISOString(),
  seen_at: x.seen_at?.toDate?.().toISOString() ?? null,
});

/** A signed-in customer's own enquiries, newest first. Filtered by uid only (no composite index needed). */
export async function fetchMyEnquiries(uid: string): Promise<EnquiryRow[]> {
  const snap = await getDocs(query(col(), where("user_id", "==", uid)));
  return snap.docs.map(toRow).sort((a, b) => b.created_at.localeCompare(a.created_at));
}

/** Oldest first, like a chat. */
export async function fetchMessages(enquiryId: string): Promise<ThreadMessage[]> {
  const snap = await getDocs(messagesCol(enquiryId));
  return snap.docs.map((d) => toMessage(d.id, d.data())).sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export async function sendMessage(enquiryId: string, from: "staff" | "customer", text: string, author: string): Promise<void> {
  await addDoc(messagesCol(enquiryId), { from, text: text.trim(), author: author.slice(0, 120), seen_at: null, created_at: serverTimestamp() });
}

/** Marks the other side's unseen messages as seen. Returns how many were updated. */
export async function markMessagesSeen(enquiryId: string, messages: ThreadMessage[], reader: "staff" | "customer"): Promise<number> {
  const unseen = messages.filter((m) => m.from !== reader && !m.seen_at);
  await Promise.all(unseen.map((m) => updateDoc(doc(db, "enquiries", enquiryId, "messages", m.id), { seen_at: serverTimestamp() })));
  return unseen.length;
}

/** Staff opened the enquiry: record that the team has seen it (once). */
export async function markEnquirySeen(row: EnquiryRow, staffId: string): Promise<void> {
  if (row.seen_at) return;
  await updateEnquiry(row.id, { seen_at: serverTimestamp(), seen_by: staffId });
}

export const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

export interface ReplyItem extends ThreadMessage { enquiryId: string; subject: string }

/** The team's most recent replies across a customer's enquiries (newest first). */
export async function fetchLatestReplies(uid: string, max = 5): Promise<ReplyItem[]> {
  const rows = (await fetchMyEnquiries(uid)).slice(0, 8);
  const lists = await Promise.all(rows.map((r) => fetchMessages(r.id).then((ms) => ms.filter((m) => m.from === "staff").map((m) => ({ ...m, enquiryId: r.id, subject: r.interest || r.message?.slice(0, 40) || "Your enquiry" })))));
  return lists.flat().sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, max);
}

/** Replies from the team for the signed-in customer, refreshed every minute. Disabled when signed out. */
export function useReplies(uid: string | undefined) {
  const q = useQuery({ queryKey: ["inbox", "replies", uid], queryFn: () => fetchLatestReplies(uid!), enabled: !!uid, refetchInterval: 60_000, staleTime: 30_000 });
  const replies = q.data ?? [];
  return { replies, unread: replies.filter((r) => !r.seen_at).length, loading: q.isLoading };
}
