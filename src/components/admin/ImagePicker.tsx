import { useState } from "react";
import { ImagePlus } from "lucide-react";
import { toast } from "sonner";
import { usableImage } from "@/lib/db";
import { uploadImage } from "@/lib/upload";

export function ImagePicker({ value, onChange, label }: { value: string; onChange: (url: string) => void; label: string }) {
  const [busy, setBusy] = useState(false);
  const pick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    try { onChange(await uploadImage(file)); } catch (err) { toast.error((err as Error).message); } finally { setBusy(false); }
  };
  return (
    <div className="adm-field">
      <span>{label}</span>
      {usableImage(value) && <img src={value} alt="" style={{ width: "100%", maxWidth: 260, height: 150, objectFit: "cover", border: "1px solid var(--a-line)" }} />}
      <div className="adm-actions" style={{ marginTop: 0 }}>
        <label className="adm-btn small ghost" style={{ cursor: busy ? "wait" : "pointer" }}>
          <ImagePlus size={15} /> {busy ? "Uploading…" : value ? "Replace photo" : "Add photo"}
          <input type="file" accept="image/*" onChange={pick} disabled={busy} className="sr-only" aria-label={label} />
        </label>
        {value && <button type="button" className="adm-btn small ghost" onClick={() => onChange("")}>Remove</button>}
      </div>
    </div>
  );
}
