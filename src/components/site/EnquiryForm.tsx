import { useRef, useState } from "react";
import { CheckCircle2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  buildEnquiryWhatsApp,
  emptyEnquiry,
  submitEnquiry,
  validateEnquiry,
  type EnquiryErrors,
  type EnquiryInput,
} from "@/lib/enquiries";
import { whatsappLink } from "@/lib/siteContent";

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
  const [values, setValues] = useState<EnquiryInput>({ ...emptyEnquiry, message: defaultMessage });
  const [errors, setErrors] = useState<EnquiryErrors>({});
  const [honeypot, setHoneypot] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [saved, setSaved] = useState(true);
  const [waUrl, setWaUrl] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  const set = (k: keyof EnquiryInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setValues((v) => ({ ...v, [k]: e.target.value }));
    if (errors[k]) setErrors((er) => ({ ...er, [k]: undefined }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phase === "sending") return;

    // Hidden field only bots fill in: pretend it worked and do nothing.
    if (honeypot) {
      setPhase("sent");
      return;
    }

    const input: EnquiryInput = { ...values, interest: topic ?? values.interest };
    const result = validateEnquiry(input);
    if (!result.ok) {
      setErrors(result.errors);
      requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }

    // Open WhatsApp first, while the click still counts as a user action (browsers block popups after an await).
    const url = whatsappLink(whatsapp, buildEnquiryWhatsApp(result.data, topic));
    setWaUrl(url);
    window.open(url, "_blank", "noopener,noreferrer");

    setPhase("sending");
    const res = await submitEnquiry(result.data, source);
    setSaved(res.ok);
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
        {saved ? (
          <p>We have received your enquiry and will be in touch shortly. We have also opened WhatsApp so you can message us directly.</p>
        ) : (
          <p>We could not save your details on our site just now, but WhatsApp should have opened so you can message us directly. If it did not, use the button below.</p>
        )}
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
      <Button type="submit" className="enq-submit" disabled={phase === "sending"}>
        {phase === "sending" ? "Sending…" : submitLabel}
      </Button>
    </form>
  );
}
