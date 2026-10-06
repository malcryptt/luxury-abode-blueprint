import { useRef, useState } from "react";
import { Play } from "lucide-react";
import { videoPoster } from "@/lib/upload";

/**
 * A video that costs the page nothing until someone asks for it: it shows a still frame and a play button, and only
 * downloads the video after the first tap. Tap the video to play, tap it again to pause. Never autoplays on load, so
 * it cannot slow the page or use up visitors' data.
 */
export function LazyVideo({ src, title, poster, onPlay, onEnd }: { src: string; title: string; poster?: string; onPlay?: () => void; onEnd?: () => void }) {
  const [on, setOn] = useState(false);
  const [paused, setPaused] = useState(false);
  const ref = useRef<HTMLVideoElement>(null);
  const still = poster || videoPoster(src);
  if (on) {
    const toggle = () => { const v = ref.current; if (!v) return; if (v.paused) v.play().catch(() => {}); else v.pause(); };
    return (
      <button type="button" className="lazy-video play playing" onClick={toggle} aria-label={paused ? `Play video: ${title}` : `Pause video: ${title}`}>
        <video ref={ref} className="lazy-video" src={src} poster={still || undefined} autoPlay playsInline preload="metadata" aria-label={title}
          onPlay={() => { setPaused(false); onPlay?.(); }} onPause={() => { setPaused(true); onEnd?.(); }} onEnded={() => { setPaused(true); onEnd?.(); }} />
        {paused && <span className="lazy-video-btn" aria-hidden="true"><Play size={26} fill="currentColor" /></span>}
      </button>
    );
  }
  return (
    <button type="button" className="lazy-video play" onClick={() => { setOn(true); onPlay?.(); }} aria-label={`Play video: ${title}`}>
      {still ? <img src={still} alt="" loading="lazy" decoding="async" /> : <span className="lazy-video-blank" />}
      <span className="lazy-video-btn" aria-hidden="true"><Play size={26} fill="currentColor" /></span>
    </button>
  );
}
