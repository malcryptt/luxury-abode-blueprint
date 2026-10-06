import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { LazyVideo } from "@/components/site/LazyVideo";
import type { SiteJob } from "@/lib/siteContent";

const EVERY_MS = 4500;

/**
 * Previous work as a slideshow. It moves on by itself and can also be scrolled, swiped, or stepped with the arrows
 * and dots. It pauses while someone is hovering, touching, focused inside it, or playing a video, and it does not
 * move by itself for visitors who ask their device for reduced motion.
 */
export function JobsCarousel({ jobs }: { jobs: SiteJob[] }) {
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [hold, setHold] = useState(false);       // pointer / focus is inside
  const [playing, setPlaying] = useState(false);  // a video is playing
  const [paused, setPaused] = useState(false);    // the visitor pressed pause
  const [reduced, setReduced] = useState(false);
  const lastTouch = useRef(0);
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

  const auto = n > 1 && !reduced && !paused && !hold && !playing;
  useEffect(() => {
    if (!auto) return;
    const t = setInterval(() => { if (Date.now() - lastTouch.current > 2500) goTo(index + 1); }, EVERY_MS);
    return () => clearInterval(t);
  }, [auto, index, goTo]);

  // Resizing changes the slide width, so keep the current slide in view.
  useEffect(() => {
    const on = () => { const el = track.current; if (el) el.scrollTo({ left: index * el.clientWidth }); };
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, [index]);

  if (!n) return null;
  const touched = () => { lastTouch.current = Date.now(); };

  return (
    <div
      className="jobs-carousel"
      role="region"
      aria-roledescription="carousel"
      aria-label="Photos of our previous work"
      onMouseEnter={() => setHold(true)}
      onMouseLeave={() => setHold(false)}
      onFocus={() => setHold(true)}
      onBlur={() => setHold(false)}
      onTouchStart={() => { setHold(true); touched(); }}
      onTouchEnd={() => { touched(); setTimeout(() => setHold(false), 1500); }}
      onKeyDown={(e) => { if (e.key === "ArrowRight") { touched(); goTo(index + 1); } if (e.key === "ArrowLeft") { touched(); goTo(index - 1); } }}
    >
      <div className="jc-track" ref={track} onScroll={onScroll} aria-live={auto ? "off" : "polite"} tabIndex={0}>
        {jobs.map((j, i) => (
          <figure className="jc-slide" key={j.id} aria-roledescription="slide" aria-label={`${i + 1} of ${n}`}>
            <div className="jc-media">
              {j.video
                ? <LazyVideo src={j.video} title={j.title} poster={j.image} onPlay={() => setPlaying(true)} onEnd={() => setPlaying(false)} />
                : <img src={j.image} alt={`${j.title}, ${j.category === "Builds" ? "build" : "furniture"} by WSL Realty`} loading={i < 2 ? "eager" : "lazy"} draggable={false} />}
            </div>
            <figcaption><small>{j.category === "Builds" ? "Build" : "Furniture"}{j.location ? ` · ${j.location}` : ""}</small><h3>{j.title}</h3><p>{j.description}</p></figcaption>
          </figure>
        ))}
      </div>
      {n > 1 && <>
        <div className="jc-bar">
          <div className="jc-dots">{jobs.map((j, i) => <button key={j.id} type="button" className={i === index ? "on" : ""} onClick={() => { touched(); goTo(i); }} aria-label={`Show photo ${i + 1}`} aria-current={i === index} />)}</div>
          <div className="jc-ctrl">
            {!reduced && <button type="button" className="jc-btn" onClick={() => setPaused((p) => !p)} aria-label={paused ? "Start the slideshow" : "Pause the slideshow"}>{paused ? <Play size={15} /> : <Pause size={15} />}</button>}
            <button type="button" className="jc-btn" onClick={() => { touched(); goTo(index - 1); }} aria-label="Previous photo"><ChevronLeft size={20} /></button>
            <button type="button" className="jc-btn" onClick={() => { touched(); goTo(index + 1); }} aria-label="Next photo"><ChevronRight size={20} /></button>
          </div>
        </div>
      </>}
    </div>
  );
}
