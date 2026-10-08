import { useRef, useState } from "react";
import { Play, Volume2, VolumeX } from "lucide-react";
import { videoPoster } from "@/lib/upload";

/**
 * A video that costs the page nothing until someone asks for it: it shows a still frame and a play button, and only
 * downloads the video after the first tap. Tap the video to play, tap it again to pause. Never autoplays on load, so
 * it cannot slow the page or use up visitors' data.
 */
export function LazyVideo({ src, title, poster, onPlay, onEnd }: { src: string; title: string; poster?: string; onPlay?: () => void; onEnd?: () => void }) {
  const [on, setOn] = useState(false);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(true); // always starts silent; the visitor can turn the sound on
  const ref = useRef<HTMLVideoElement>(null);
  const still = poster || videoPoster(src);
  if (on) {
    const toggle = () => { const v = ref.current; if (!v) return; if (v.paused) v.play().catch(() => {}); else v.pause(); };
    const mute = () => { const v = ref.current; if (!v) return; v.muted = !v.muted; setMuted(v.muted); };
    return (
      <div className="lazy-video lv-wrap">
        <button type="button" className="lazy-video play playing" onClick={toggle} aria-label={paused ? `Play video: ${title}` : `Pause video: ${title}`}>
          <video ref={ref} className="lazy-video" src={src} poster={still || undefined} autoPlay muted playsInline preload="metadata" aria-label={title}
            onPlay={() => { setPaused(false); onPlay?.(); }} onPause={() => { setPaused(true); onEnd?.(); }} onEnded={() => { setPaused(true); onEnd?.(); }} />
          {paused && <span className="lazy-video-btn" aria-hidden="true"><Play size={26} fill="currentColor" /></span>}
        </button>
        <button type="button" className="lv-mute" onClick={mute} aria-label={muted ? "Turn sound on" : "Turn sound off"}>{muted ? <VolumeX size={18} /> : <Volume2 size={18} />}</button>
      </div>
    );
  }
  return (
    <button type="button" className="lazy-video play" onClick={() => { setOn(true); onPlay?.(); }} aria-label={`Play video: ${title}`}>
      {still ? <img src={still} alt="" loading="lazy" decoding="async" /> : <span className="lazy-video-blank" />}
      <span className="lazy-video-btn" aria-hidden="true"><Play size={26} fill="currentColor" /></span>
    </button>
  );
}
