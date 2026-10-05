import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { toast } from "sonner";
import { db } from "@/integrations/firebase/client";
import { HIDEABLE_LABELS, fetchSiteContent, type PageVisibility } from "@/lib/siteContent";

const ROUTE: Record<keyof PageVisibility, string> = { properties: "/properties", furniture: "/furniture", aryaLuxe: "/arya-luxe" };

/** On/off switches for whole pages. A hidden page leaves the menu and shows "Page not found"; nothing is deleted. */
export function PageSwitches({ only, title = "Show or hide pages", sub }: { only?: (keyof PageVisibility)[]; title?: string; sub?: string }) {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["admin", "site-content"], queryFn: fetchSiteContent });
  const [busy, setBusy] = useState<string>("");
  if (!data) return null;
  const keys = (only ?? (Object.keys(HIDEABLE_LABELS) as (keyof PageVisibility)[]));

  const toggle = async (k: keyof PageVisibility, show: boolean) => {
    setBusy(k);
    try {
      await setDoc(doc(db, "content", "hidden"), { value: { ...data.hidden, [k]: !show }, updated_at: serverTimestamp() });
      await qc.invalidateQueries({ queryKey: ["admin", "site-content"] });
      qc.invalidateQueries({ queryKey: ["site-content"] });
      toast.success(`${HIDEABLE_LABELS[k]} page is now ${show ? "visible" : "hidden"}`);
    } catch {
      toast.error("Could not change that. Please try again.");
    } finally {
      setBusy("");
    }
  };

  return (
    <section className="adm-panel">
      <h2>{title}</h2>
      <p className="sub">{sub ?? "Switch a page off to take it out of the menu and footer. Visitors who open its link see “Page not found”. Your content is kept, and you can switch it back on at any time."}</p>
      <div className="adm-grid">
        {keys.map((k) => {
          const shown = !data.hidden[k];
          return (
            <label key={k} className="adm-check" style={{ display: "flex", alignItems: "center", gap: 10, cursor: busy ? "wait" : "pointer" }}>
              <input type="checkbox" checked={shown} disabled={!!busy} onChange={(e) => toggle(k, e.target.checked)} aria-label={`Show the ${HIDEABLE_LABELS[k]} page on the website`} />
              <span><b>{HIDEABLE_LABELS[k]}</b> page ({ROUTE[k]}): {shown ? "visible" : "hidden"}</span>
            </label>
          );
        })}
      </div>
    </section>
  );
}
