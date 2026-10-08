import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { sized } from "@/lib/img";
import { LazyVideo } from "@/components/site/LazyVideo";
import { jobMedia, type SiteJob } from "@/lib/siteContent";

const EVERY_MS = 3000;

/**
 * Previous work as a slideshow. It moves on every 3 seconds by itself and keeps going. It only stands still while a
 * visitor is holding it (finger or mouse button down, so they can swipe or drag) or a video is playing, and carries on
 * as soon as they let go. It can also be stepped with the arrows and dots. It does not move by itself for visitors who
 * ask their device for reduced motion.
 */
export function JobsCarousel({ jobs: all }: { jobs: SiteJob[] }) {
  const jobs = all.slice(0, 15); // the slideshow never shows more than 15
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
    // Going on from the last photo carries on forwards into a copy of the first one (see the clone slide below); the
    // jump back to the real first photo happens unseen once the scroll has settled.
    const forward = i === n && n > 1;
    const next = forward ? 0 : ((i % n) + n) % n;
    el.scrollTo({ left: (forward ? n : next) * el.clientWidth, behavior: reduced ? "auto" : "smooth" });
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
      const at = Math.round(el.scrollLeft / el.clientWidth);
      if (n > 1 && at >= n) { el.scrollTo({ left: 0, behavior: "instant" as ScrollBehavior }); setIndex(0); return; }
      setIndex(Math.min(n - 1, Math.max(0, at)));
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
        {(n > 1 ? [...jobs, jobs[0]] : jobs).map((j, i) => {
          const clone = i === n;
          return (
          <figure className="jc-slide" key={clone ? "clone" : j.id} aria-roledescription="slide" aria-label={`${(clone ? 0 : i) + 1} of ${n}`} aria-hidden={clone || undefined} data-clone={clone || undefined}>
            <div className={`jc-media${jobMedia(j).length > 1 ? " both" : ""}`}>
              {jobMedia(j).map((m, k) => (
                <div className="jc-cell" key={k}>
                  {m.kind === "video"
                    ? <LazyVideo src={m.url} title={j.title} onPlay={() => setPlaying(true)} onEnd={() => setPlaying(false)} />
                    : <img className="jc-photo" src={sized(m.url, 900)} alt={clone ? "" : `${j.title}, ${j.category === "Builds" ? "build" : "furniture"} by WSL Realty`} loading={i < 1 ? "eager" : "lazy"} decoding="async" draggable={false} />}
                  {m.tag && <span className="media-tag">{m.tag}</span>}
                </div>
              ))}
            </div>
            <figcaption><small>{j.category === "Builds" ? "Build" : "Furniture"}{j.location ? ` · ${j.location}` : ""}</small><h3>{j.title}</h3><p>{j.description}</p></figcaption>
          </figure>);
        })}
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
