import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { sized } from "@/lib/img";
import { LazyVideo } from "@/components/site/LazyVideo";
import type { SiteJob } from "@/lib/siteContent";

const EVERY_MS = 3000;

/**
 * Previous work as a slideshow. It moves on every 3 seconds by itself and keeps going. It only stands still while a
 * visitor is holding it (finger or mouse button down, so they can swipe or drag) or a video is playing, and carries on
 * as soon as they let go. It can also be stepped with the arrows and dots. It does not move by itself for visitors who
 * ask their device for reduced motion.
 */
export function JobsCarousel({ jobs }: { jobs: SiteJob[] }) {
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [hold, setHold] = useState(false);       // a finger or the mouse button is down on it
  const [playing, setPlaying] = useState(false);  // a video is playing
  const [tick, setTick] = useState(0);            // restarts the 3 second timer after a touch
  const [reduced, setReduced] = useState(false);
  const n = jobs.length;

  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mq) return;
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);

  const goTo = useCallback((i: number) => {
    const el = track.current;
    if (!el || !n) return;
    const next = ((i % n) + n) % n;
    el.scrollTo({ left: next * el.clientWidth, behavior: reduced ? "auto" : "smooth" });
    setIndex(next);
  }, [n, reduced]);

  // Keep the dot in step when the visitor scrolls or swipes by hand. Only the settled position counts, so a smooth
  // scroll that is still moving never flips the dot back and forth.
  const settle = useRef<ReturnType<typeof setTimeout>>();
  const onScroll = () => {
    clearTimeout(settle.current);
    settle.current = setTimeout(() => {
      const el = track.current;
      if (!el || !el.clientWidth) return;
      setIndex(Math.min(n - 1, Math.max(0, Math.round(el.scrollLeft / el.clientWidth))));
    }, 140);
  };
  useEffect(() => () => clearTimeout(settle.current), []);

  const auto = n > 1 && !reduced && !hold && !playing;
  useEffect(() => {
    if (!auto) return;
    const t = setTimeout(() => goTo(index + 1), EVERY_MS);
    return () => clearTimeout(t);
  }, [auto, index, tick, goTo]);

  // Resizing changes the slide width, so keep the current slide in view.
  useEffect(() => {
    const on = () => { const el = track.current; if (el) el.scrollTo({ left: index * el.clientWidth }); };
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, [index]);

  if (!n) return null;
  const touched = () => setTick((t) => t + 1);
  const release = () => { setHold(false); touched(); };

  return (
    <div
      className="jobs-carousel"
      data-hold={hold || playing ? "1" : "0"}
      role="region"
      aria-roledescription="carousel"
      aria-label="Photos of our previous work"
      onPointerDown={(e) => { if (e.pointerType === "mouse") setHold(true); }}
      onPointerUp={(e) => { if (e.pointerType === "mouse") release(); }}
      onPointerCancel={(e) => { if (e.pointerType === "mouse") release(); }}
      onTouchStart={() => setHold(true)}
      onTouchEnd={release}
      onTouchCancel={release}
      onMouseLeave={() => { if (hold) release(); }}
      onKeyDown={(e) => { if (e.key === "ArrowRight") { touched(); goTo(index + 1); } if (e.key === "ArrowLeft") { touched(); goTo(index - 1); } }}
    >
      <div className="jc-track" ref={track} onScroll={onScroll} aria-live={auto ? "off" : "polite"} tabIndex={0}>
        {jobs.map((j, i) => (
          <figure className="jc-slide" key={j.id} aria-roledescription="slide" aria-label={`${i + 1} of ${n}`}>
            <div className="jc-media">
              {j.video
                ? <LazyVideo src={j.video} title={j.title} poster={sized(j.image, 1200)} onPlay={() => setPlaying(true)} onEnd={() => setPlaying(false)} />
                : <img src={sized(j.image, 1200)} alt={`${j.title}, ${j.category === "Builds" ? "build" : "furniture"} by WSL Realty`} loading={i < 1 ? "eager" : "lazy"} decoding="async" draggable={false} />}
            </div>
            <figcaption><small>{j.category === "Builds" ? "Build" : "Furniture"}{j.location ? ` · ${j.location}` : ""}</small><h3>{j.title}</h3><p>{j.description}</p></figcaption>
          </figure>
        ))}
      </div>
      {n > 1 && <>
        <div className="jc-bar">
          <div className="jc-dots">{jobs.map((j, i) => <button key={j.id} type="button" className={i === index ? "on" : ""} onClick={() => { touched(); goTo(i); }} aria-label={`Show photo ${i + 1}`} aria-current={i === index} />)}</div>
          <div className="jc-ctrl">
            <button type="button" className="jc-btn" onClick={() => { touched(); goTo(index - 1); }} aria-label="Previous photo"><ChevronLeft size={20} /></button>
            <button type="button" className="jc-btn" onClick={() => { touched(); goTo(index + 1); }} aria-label="Next photo"><ChevronRight size={20} /></button>
          </div>
        </div>
      </>}
    </div>
  );
}
