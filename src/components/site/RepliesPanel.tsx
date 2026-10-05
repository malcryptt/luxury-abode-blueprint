import { Link } from "react-router-dom";
import { MessageSquareReply } from "lucide-react";
import { formatDateTime, useReplies } from "@/lib/inbox";
import { useSession } from "@/lib/staff";

/**
 * Sits under the enquiry form. Signed-in customers see the latest replies from our representatives;
 * visitors who are not signed in only see the note, because their enquiries are not linked to an account.
 */
export function RepliesPanel() {
  const { user } = useSession();
  const { replies, unread, loading } = useReplies(user?.uid);

  return (
    <aside className="replies-panel" aria-label="Replies from our representatives">
      {user && (
        <div className="replies-box">
          <h4><MessageSquareReply size={16} aria-hidden="true" /> Replies from our team{unread > 0 && <span className="badge">{unread} new</span>}</h4>
          {loading ? <p className="replies-empty">Checking for replies…</p> : replies.length === 0 ? (
            <p className="replies-empty">No replies yet. When a representative answers your enquiry, it appears here.</p>
          ) : (
            <ul>{replies.slice(0, 3).map((r) => (
              <li key={r.id}><strong>{r.subject}</strong><span>{r.text.length > 140 ? r.text.slice(0, 140) + "…" : r.text}</span><small>{formatDateTime(r.created_at)}{!r.seen_at ? " · new" : ""} · <Link className="text-link" to={`/inbox?open=${r.enquiryId}`}>Reply</Link></small></li>
            ))}</ul>
          )}
          <Link className="text-link" to="/inbox">Open your inbox to read and reply</Link>
        </div>
      )}
      <p className="replies-note">
        Signed in users can see direct replies from our representatives.
        {!user && <> <Link className="text-link" to="/auth">Sign in or create an account</Link></>}
      </p>
    </aside>
  );
}
