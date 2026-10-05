import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, CheckCheck, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageHero } from "@/components/site/SiteLayout";
import { useNoIndex } from "@/components/site/Seo";
import { sourceLabel, STATUS_LABEL } from "@/lib/enquiries";
import type { EnquiryRow } from "@/lib/db";
import { checkRate, isRefused, RATE_REJECTED } from "@/lib/rateLimit";
import { fetchMessages, fetchMyEnquiries, formatDateTime, markMessagesSeen, sendMessage, type ThreadMessage } from "@/lib/inbox";
import { useSession } from "@/lib/staff";

/** "Seen" ticks under a message the customer sent, so they know when the team has read it. */
function SeenMark({ at }: { at: string | null }) {
  return at
    ? <span className="seen yes"><CheckCheck size={14} aria-hidden="true" /> Seen {formatDateTime(at)}</span>
    : <span className="seen"><Check size={14} aria-hidden="true" /> Sent, not seen yet</span>;
}

function Thread({ row, name }: { row: EnquiryRow; name: string }) {
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const key = ["inbox", "messages", row.id];
  const { data: msgs = [], isLoading } = useQuery({ queryKey: key, queryFn: () => fetchMessages(row.id), refetchInterval: 30_000 });

  // Opening the conversation marks the team's replies as seen.
  useEffect(() => {
    if (msgs.some((m) => m.from === "staff" && !m.seen_at)) {
      markMessagesSeen(row.id, msgs, "customer").then((n) => n && qc.invalidateQueries({ queryKey: key })).catch(() => {});
    }
  }, [msgs]); // eslint-disable-line react-hooks/exhaustive-deps

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || busy) return;
    const gate = checkRate("message");
    if (!gate.ok) return toast.error(gate.message);
    setBusy(true);
    try {
      await sendMessage(row.id, "customer", text, name);
      setText("");
      qc.invalidateQueries({ queryKey: key });
    } catch (err) {
      toast.error(isRefused(err) ? RATE_REJECTED : "Your message could not be sent. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="thread">
      <div className="bubble mine">
        <p>{row.message || "(No message. You sent your contact details.)"}</p>
        <small>{formatDateTime(row.created_at)}</small>
        <SeenMark at={row.seen_at} />
      </div>
      {isLoading && <p className="inbox-note">Loading replies…</p>}
      {msgs.map((m: ThreadMessage) => m.from === "staff" ? (
        <div key={m.id} className="bubble theirs"><b>WSL Realty</b><p>{m.text}</p><small>{formatDateTime(m.created_at)}</small></div>
      ) : (
        <div key={m.id} className="bubble mine"><p>{m.text}</p><small>{formatDateTime(m.created_at)}</small><SeenMark at={m.seen_at} /></div>
      ))}
      {row.status === "closed" ? <p className="inbox-note">This enquiry has been closed. Send a new enquiry from the Contact page if you need more help.</p> : (
        <form className="thread-reply" onSubmit={send}>
          <textarea aria-label="Your reply" rows={2} maxLength={2000} value={text} onChange={(e) => setText(e.target.value)} placeholder="Write a message to our team…" />
          <Button type="submit" disabled={busy || !text.trim()}><Send size={15} /> {busy ? "Sending…" : "Send"}</Button>
        </form>
      )}
    </div>
  );
}

export function Inbox() {
  useNoIndex("Your enquiries");
  const { user, ready } = useSession();
  const [params] = useSearchParams();
  const [open, setOpen] = useState<string | null>(params.get("open"));
  const { data: rows = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["inbox", "mine", user?.uid], queryFn: () => fetchMyEnquiries(user!.uid), enabled: !!user, refetchInterval: 60_000,
  });

  return <>
    <PageHero eyebrow="Your account" title="Your enquiries" text="Everything you have sent us, with our replies." />
    <section className="section inbox">
      {!ready ? <p className="inbox-note">Loading…</p> : !user ? (
        <div className="inbox-empty"><p>Sign in to see the enquiries you have sent and our replies.</p>
          <Button asChild><Link to="/auth">Sign in or create an account</Link></Button></div>
      ) : <>
        {!user.emailVerified && <p className="inbox-banner">We sent a link to {user.email}. Please confirm your email so we can reach you.</p>}
        {isError && <p className="inbox-note" role="alert">Your enquiries could not be loaded. <button className="text-link" onClick={() => refetch()}>Try again</button></p>}
        {isLoading ? <p className="inbox-note">Loading…</p> : rows.length === 0 ? (
          <div className="inbox-empty"><p>You have not sent any enquiries from this account yet. Enquiries you send while signed in will appear here.</p>
            <Button asChild><Link to="/contact">Send an enquiry</Link></Button></div>
        ) : (
          <ul className="inbox-list">{rows.map((r) => (
            <li key={r.id} className={open === r.id ? "open" : ""}>
              <button type="button" className="inbox-row" aria-expanded={open === r.id} onClick={() => setOpen(open === r.id ? null : r.id)}>
                <span className="inbox-main"><strong>{r.interest || sourceLabel(r.source)}</strong><span>{r.message ? r.message.slice(0, 90) : "No message"}</span></span>
                <span className="inbox-meta"><span className={`pill ${r.status}`}>{STATUS_LABEL[r.status]}</span><span className={`seen ${r.seen_at ? "yes" : ""}`}>{r.seen_at ? <><CheckCheck size={14} /> Seen</> : <><Check size={14} /> Not seen yet</>}</span><small>{formatDateTime(r.created_at)}</small></span>
              </button>
              {open === r.id && <Thread row={r} name={user.email ?? "Customer"} />}
            </li>))}</ul>
        )}
      </>}
    </section>
  </>;
}
