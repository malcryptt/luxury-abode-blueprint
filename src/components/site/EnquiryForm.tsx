import { useRef, useState } from "react";
import { CheckCircle2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  buildEnquiryWhatsApp,
  CHAT_SUFFIX,
  emptyEnquiry,
  submitEnquiry,
  validateEnquiry,
  type EnquiryErrors,
  type EnquiryInput,
} from "@/lib/enquiries";
import { checkRate, RATE_REJECTED } from "@/lib/rateLimit";
import { whatsappLink } from "@/lib/siteContent";
import { track } from "@/lib/analytics";
import { auth } from "@/integrations/firebase/client";
import { Link } from "react-router-dom";
import { RepliesPanel } from "@/components/site/RepliesPanel";

interface EnquiryFormProps {
  /** Where the enquiry came from; shown in the admin inbox, e.g. "contact_page" or "property:arya-luxe". */
  source: string;
  /** WhatsApp number (digits) that receives the follow-up message. */
  whatsapp: string;
  /** What the enquiry is about when it is fixed (a property or product). Hides the "Interested in" field. */
  topic?: string;
  /** Show an editable "Interested in" field (used on the Contact page). */
  showInterest?: boolean;
  defaultMessage?: string;
  submitLabel?: string;
  /** When set, the success screen offers a Close button (used inside the dialog). */
  onClose?: () => void;
}

type Phase = "idle" | "sending" | "sent";

/**
 * One enquiry form for the whole site. On submit it saves the enquiry for the team's inbox and opens
 * WhatsApp with the same details, so a lead is never lost if either one fails.
 */
export function EnquiryForm({ source, whatsapp, topic, showInterest, defaultMessage = "", submitLabel = "Send Enquiry", onClose }: EnquiryFormProps) {
  const [values, setValues] = useState<EnquiryInput>({ ...emptyEnquiry, email: auth.currentUser?.email ?? "", message: defaultMessage });
  const [errors, setErrors] = useState<EnquiryErrors>({});
  const [honeypot, setHoneypot] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [saved, setSaved] = useState(true);
  const [mode, setMode] = useState<"whatsapp" | "chat">("whatsapp");
  const [waUrl, setWaUrl] = useState("");
  const [limitError, setLimitError] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  const set = (k: keyof EnquiryInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setValues((v) => ({ ...v, [k]: e.target.value }));
    if (errors[k]) setErrors((er) => ({ ...er, [k]: undefined }));
  };

  const onSubmit = (e: React.FormEvent) => { e.preventDefault(); return submit("whatsapp"); };

  /** "whatsapp": save the enquiry and open WhatsApp. "chat": send straight to the team's dashboard, no WhatsApp. */
  const submit = async (how: "whatsapp" | "chat") => {
    if (phase === "sending") return;
    setMode(how);

    // Hidden field only bots fill in: pretend it worked and do nothing.
    if (honeypot) {
      setPhase("sent");
      return;
    }

    const input: EnquiryInput = { ...values, interest: topic ?? values.interest };
    const result = validateEnquiry(input);
    if (how === "chat" && result.ok && !result.data.message.trim()) {
      setErrors({ message: "Please write the message you would like to send to a representative" });
      requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }
    if (!result.ok) {
      setErrors(result.errors);
      requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }

    const gate = checkRate("enquiry");
    if (!gate.ok) { setLimitError(gate.message); return; }
    setLimitError("");

    // Open WhatsApp first, while the click still counts as a user action (browsers block popups after an await).
    if (how === "whatsapp") {
      const url = whatsappLink(whatsapp, buildEnquiryWhatsApp(result.data, topic));
      setWaUrl(url);
      window.open(url, "_blank", "noopener,noreferrer");
    }

    setPhase("sending");
    const res = await submitEnquiry(result.data, how === "chat" ? source.slice(0, 120 - CHAT_SUFFIX.length) + CHAT_SUFFIX : source);
    if (!res.ok && res.error === RATE_REJECTED) { setLimitError(res.error); setPhase("idle"); return; }
    setSaved(res.ok);
    if (res.ok) track("generate_lead", { method: how, page_path: window.location.pathname });
    setPhase("sent");
  };

  const reset = () => {
    setValues({ ...emptyEnquiry, message: defaultMessage });
    setErrors({});
    setPhase("idle");
  };

  if (phase === "sent") {
    const first = values.name.trim().split(/\s+/)[0];
    return (
      <div className="enq-sent" role="status">
        <CheckCircle2 size={30} aria-hidden="true" />
        <h3>{first ? `Thank you, ${first}` : "Thank you"}</h3>
        {mode === "chat" ? (saved ? (
          <p>Your message has gone straight to our representatives. {auth.currentUser ? "We will reply in your inbox on this website." : "We will contact you on the number you gave. Sign in or create an account next time to read replies right here."}</p>
        ) : (
          <p>We could not send your message just now. Please try again, or use the Send Enquiry button to reach us on WhatsApp.</p>
        )) : saved ? (
          <p>We have received your enquiry and will be in touch shortly. We have also opened WhatsApp so you can message us directly.</p>
        ) : (
          <p>We could not save your details on our site just now, but WhatsApp should have opened so you can message us directly. If it did not, use the button below.</p>
        )}
        {saved && auth.currentUser && <p><Link className="text-link" to="/inbox">Follow this enquiry in your inbox</Link></p>}
        <div className="enq-sent-actions">
          {waUrl && (
            <Button asChild>
              <a href={waUrl} target="_blank" rel="noreferrer">Open WhatsApp <MessageCircle size={16} /></a>
            </Button>
          )}
          {onClose ? (
            <button type="button" className="text-link" onClick={onClose}>Close</button>
          ) : (
            <button type="button" className="text-link" onClick={reset}>Send another enquiry</button>
          )}
        </div>
      </div>
    );
  }

  const field = (k: keyof EnquiryInput, label: string, props: { type?: string; autoComplete?: string; required?: boolean; maxLength: number }) => (
    <label className="form-field">
      <span>{label}{props.required ? <b aria-hidden="true"> *</b> : null}</span>
      <input
        className="enq-input"
        name={k}
        type={props.type ?? "text"}
        autoComplete={props.autoComplete}
        maxLength={props.maxLength}
        value={values[k]}
        onChange={set(k)}
        aria-invalid={errors[k] ? true : undefined}
        aria-describedby={errors[k] ? `enq-${k}-error` : undefined}
      />
      {errors[k] && <span id={`enq-${k}-error`} className="field-error" role="alert">{errors[k]}</span>}
    </label>
  );

  return (
    <form ref={formRef} className="enq-form" onSubmit={onSubmit} noValidate>
      {field("name", "Full name", { autoComplete: "name", required: true, maxLength: 100 })}
      {field("phone", "Phone number", { type: "tel", autoComplete: "tel", required: true, maxLength: 30 })}
      {field("email", "Email address", { type: "email", autoComplete: "email", maxLength: 255 })}
      {showInterest && field("interest", "Interested in", { maxLength: 200 })}
      <label className="form-field">
        <span>Message</span>
        <textarea
          className="enq-input"
          name="message"
          rows={4}
          maxLength={1000}
          value={values.message}
          onChange={set("message")}
          aria-invalid={errors.message ? true : undefined}
          aria-describedby={errors.message ? "enq-message-error" : undefined}
        />
        {errors.message && <span id="enq-message-error" className="field-error" role="alert">{errors.message}</span>}
      </label>
      {/* Honeypot: invisible to people, tempting to bots */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="enq-hp"
        value={honeypot}
        onChange={(e) => setHoneypot(e.target.value)}
      />
      <div className="enq-buttons">
        <Button type="submit" className="enq-submit" disabled={phase === "sending"}>
          {phase === "sending" && mode === "whatsapp" ? "Sending…" : submitLabel}
        </Button>
        <Button type="button" variant="outline" className="enq-chat" disabled={phase === "sending"} onClick={() => submit("chat")}>
          <MessageCircle size={16} aria-hidden="true" /> {phase === "sending" && mode === "chat" ? "Sending…" : "Chat with a representative"}
        </Button>
      </div>
      {limitError && <p className="field-error" role="alert">{limitError}</p>}
      <p className="enq-chat-note">Talking directly with a representative is generally faster.</p>
      <RepliesPanel />
    </form>
  );
}
