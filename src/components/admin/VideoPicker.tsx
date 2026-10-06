import { useState } from "react";
import { Film } from "lucide-react";
import { toast } from "sonner";
import { MAX_VIDEO_MB, MAX_VIDEO_SECONDS, uploadVideo, videoPoster } from "@/lib/upload";

/** Upload one short video. It is checked before upload (size, length, type) and served compressed. */
export function VideoPicker({ value, onChange, label, disabled, disabledReason }: { value: string; onChange: (url: string) => void; label: string; disabled?: boolean; disabledReason?: string }) {
  const [pct, setPct] = useState<number | null>(null);
  const busy = pct !== null;
  const pick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setPct(0);
    try { onChange(await uploadVideo(file, setPct)); toast.success("Video uploaded"); } catch (err) { toast.error((err as Error).message); } finally { setPct(null); }
  };
  const poster = value ? videoPoster(value) : "";
  return (
    <div className="adm-field">
      <span>{label}</span>
      {value && (poster ? <img src={poster} alt="" style={{ width: "100%", maxWidth: 260, height: 150, objectFit: "cover", border: "1px solid var(--a-line)" }} /> : <small>Video added</small>)}
      <div className="adm-actions" style={{ marginTop: 0 }}>
        <label className="adm-btn small ghost" style={{ cursor: busy ? "wait" : disabled ? "not-allowed" : "pointer", opacity: disabled && !value ? .6 : 1 }} title={disabled && !value ? disabledReason : undefined}>
          <Film size={15} /> {busy ? `Uploading… ${pct}%` : value ? "Replace video" : "Add video"}
          <input type="file" accept="video/mp4,video/webm,video/quicktime" onChange={pick} disabled={busy || (disabled && !value)} className="sr-only" aria-label={label} />
        </label>
        {value && !busy && <button type="button" className="adm-btn small ghost" onClick={() => onChange("")}>Remove video</button>}
      </div>
      {busy && <div className="adm-meter" aria-hidden="true"><div style={{ width: `${pct}%` }} /></div>}
      <small>MP4, WebM or MOV, up to {MAX_VIDEO_MB} MB and {MAX_VIDEO_SECONDS} seconds. The website plays it compressed, and only loads it when a visitor presses play.{disabled && !value && disabledReason ? ` ${disabledReason}` : ""}</small>
    </div>
  );
}
