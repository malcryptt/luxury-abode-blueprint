import { useState } from "react";
import { Play } from "lucide-react";
import { videoPoster } from "@/lib/upload";

/**
 * A video that costs the page nothing until someone asks for it: it shows a still frame and a play button, and only
 * downloads the video after the press. Never autoplays, so it cannot slow the page or use up visitors' data.
 */
export function LazyVideo({ src, title, poster, onPlay, onEnd }: { src: string; title: string; poster?: string; onPlay?: () => void; onEnd?: () => void }) {
  const [on, setOn] = useState(false);
  const still = poster || videoPoster(src);
  if (on) {
    return <video className="lazy-video" src={src} poster={still || undefined} controls autoPlay playsInline preload="metadata" aria-label={title} onPlay={onPlay} onPause={onEnd} onEnded={onEnd} />;
  }
  return (
    <button type="button" className="lazy-video play" onClick={() => { setOn(true); onPlay?.(); }} aria-label={`Play video: ${title}`}>
      {still ? <img src={still} alt="" loading="lazy" /> : <span className="lazy-video-blank" />}
      <span className="lazy-video-btn" aria-hidden="true"><Play size={26} fill="currentColor" /></span>
    </button>
  );
}
