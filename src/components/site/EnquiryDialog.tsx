import { useState } from "react";
import { ArrowUpRight, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EnquiryForm } from "@/components/site/EnquiryForm";
import { useSiteContent } from "@/lib/siteContent";

interface EnquiryButtonProps {
  /** What the visitor is asking about, e.g. "Arya Luxe (Gwarinpa, Abuja)". */
  topic: string;
  /** Short name for the dialog heading. Defaults to the topic. */
  heading?: string;
  /** Saved with the enquiry so the team sees where it came from, e.g. "property:arya-luxe". */
  source: string;
  label?: string;
  /** "button" is the solid call to action, "link" is the small text link used on cards. */
  look?: "button" | "link";
  defaultMessage?: string;
}

/** A button that opens an enquiry form in a dialog, so visitors enquire without leaving the page. */
export function EnquiryButton({ topic, heading, source, label = "Enquire Now", look = "button", defaultMessage }: EnquiryButtonProps) {
  const [open, setOpen] = useState(false);
  const { contact } = useSiteContent();

  return (
    <>
      {look === "link" ? (
        <button type="button" className="text-link small" onClick={() => setOpen(true)}>
          {label} <ArrowUpRight size={14} />
        </button>
      ) : (
        <Button type="button" onClick={() => setOpen(true)}>
          {label} <MessageCircle size={16} />
        </Button>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="enq-dialog">
          <DialogHeader>
            <DialogTitle>{`Enquire about ${heading ?? topic}`}</DialogTitle>
            <DialogDescription>Leave your details and our team will get back to you. We will also open WhatsApp so you can message us directly.</DialogDescription>
          </DialogHeader>
          <EnquiryForm
            source={source}
            whatsapp={contact.whatsapp}
            topic={topic}
            defaultMessage={defaultMessage ?? `Hello, I'm interested in ${topic}.`}
            submitLabel="Send enquiry"
            onClose={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
