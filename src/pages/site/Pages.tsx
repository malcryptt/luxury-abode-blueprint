import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowUpRight, Mail, Phone, MapPin, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import heroImage from "@/assets/hero-luxury-home.jpg";
import { Seo, PageHero, SectionIntro } from "@/components/site/SiteLayout";
import { sized } from "@/lib/img";
import { useSiteContent, placeholders as ph, whatsappLink, telHref, slugify, SiteProperty, type PageVisibility, type SiteArya } from "@/lib/siteContent";
import { EnquiryButton } from "@/components/site/EnquiryDialog";
import { EnquiryForm } from "@/components/site/EnquiryForm";
import { JobsCarousel } from "@/components/site/JobsCarousel";
import { LazyVideo } from "@/components/site/LazyVideo";
import NotFound from "@/pages/NotFound";
import { useProject, stageImage, formatDate } from "@/lib/projects";
import { useSession } from "@/lib/staff";


/** Shows a page only while the team has not hidden it. A hidden page looks like any page that does not exist. */
function Gate({ page, children }: { page: keyof PageVisibility; children: React.ReactNode }) {
  const c = useSiteContent();
  if (!c.loaded) return null;
  return c.hidden[page] ? <NotFound /> : <>{children}</>;
}

function PropertyTile({ p }: { p: SiteProperty }) {
  return (
    <Link to={`/properties/${p.slug}`} className="property-card">
      <div className="property-image"><img src={sized(p.image, 900)} alt={p.title} loading="lazy" decoding="async" /><span className="arrow"><ArrowUpRight size={20} /></span></div>
      <div className="property-info"><div><h3>{p.title}</h3><p>{p.location}</p></div><strong>{p.price}</strong></div>
      <span className="text-link small">View Details <ArrowUpRight size={14} /></span>
    </Link>
  );
}

export function Home() {
  const c = useSiteContent();
  const { data: pr } = useProject("arya-luxe");
  return <>
    <Seo route="/" />
    <section className="hero"><img src={heroImage} alt="Contemporary luxury home in Abuja" fetchPriority="high" decoding="async" /><div className="hero-shade" />
      <div className="hero-copy"><h1>{c.hero.title}</h1><p>{c.hero.subtitle}</p>
        <div className="hero-actions"><Button asChild>{c.hidden.properties ? <Link to="/contact">Enquire Now <ArrowUpRight size={16} /></Link> : <Link to="/properties">View Properties <ArrowUpRight size={16} /></Link>}</Button><Link className="text-link light" to="/project-updates">See Our Progress</Link></div></div>
    </section>
    {!c.hidden.properties && <section className="section"><SectionIntro eyebrow="Available now" title="Featured properties" text="Explore our available properties." />
      <div className="property-grid scroll-x">{c.loaded && c.properties.slice(0, 3).map(p => <PropertyTile key={p.id} p={p} />)}</div>
      <div className="section-link"><Link className="text-link" to="/properties">View All Properties <ArrowUpRight size={16} /></Link></div>
    </section>
    }
    {!c.hidden.aryaLuxe && <section className="project-feature"><div className="project-image">{c.loaded && <img decoding="async" src={sized(c.images.homeFeature, 1400) || ph.property3} alt={`${pr.project.name} construction`} />}<span className="project-label">Currently building</span></div>
      <div className="project-copy"><span className="eyebrow">Featured project</span><h2>{pr.project.name}</h2><p>{pr.project.summary}</p>
        <div className="project-links"><Button asChild><Link to="/arya-luxe">Discover {pr.project.name} <ArrowUpRight size={16} /></Link></Button><Link className="text-link" to="/project-updates">Follow The Build</Link></div></div>
    </section>
    }
    <section className="section why"><SectionIntro eyebrow="Our promise" title="We think beyond the building" />
      <div className="value-grid">{c.promise.map(v => <div key={v.id}><h3>{v.title}</h3><p>{v.description}</p></div>)}</div>
      <div className="section-link"><Button asChild><Link to="/contact">Enquire Now</Link></Button></div>
    </section>
  </>;
}

export function About() {
  const c = useSiteContent();
  return <>
    <Seo route="/about" />
    <PageHero eyebrow="Company" title={c.about.title} text="A property developer with roots in making." />
    <section className="section about-section"><div className="about-image"><img src={c.images.about || ph.furniture1} alt="Crafted interior detail" /></div>
      <div className="about-copy"><SectionIntro eyebrow="Since the beginning" title="Our story" text={c.about.description} />
        <div className="timeline">{["Founded", "Bespoke furniture", "Real estate", "Today"].map((t, i) => <div key={t} className={i === 2 ? "active" : ""}><span>{t}</span></div>)}</div></div>
    </section>
    <section className="section tinted"><SectionIntro eyebrow="Values" title="What we stand for" />
      <div className="value-grid">{c.services.map(s => <div key={s.id}><h3>{s.title}</h3><p>{s.description}</p></div>)}</div>
    </section>
  </>;
}

export function Properties() { return <Gate page="properties"><PropertiesPage /></Gate>; }
function PropertiesPage() {
  const c = useSiteContent();
  return <>
    <Seo route="/properties" />
    <PageHero eyebrow="A considered collection" title={c.pages.properties.title} text={c.pages.properties.text} />
    <section className="section"><div className="property-grid">{c.loaded && c.properties.map(p => <PropertyTile key={p.id} p={p} />)}</div></section>
  </>;
}

export function PropertyDetail() { return <Gate page="properties"><PropertyDetailPage /></Gate>; }
function PropertyDetailPage() {
  const { slug } = useParams();
  const c = useSiteContent();
  const p = c.properties.find(x => x.slug === slug);
  if (!p) return c.loaded ? <NotFound /> : <section className="section" aria-busy="true" />;
  const others = c.properties.filter(x => x.slug !== slug).slice(0, 3);
  return <>
    <Seo property={p} />
    <section className="detail"><img className="detail-image" src={sized(p.image, 1400)} alt={p.title} />
      <div className="detail-copy"><span className="eyebrow">Featured property</span><h1>{p.title}</h1><p className="detail-loc"><MapPin size={16} /> {p.location}</p>
        <strong className="detail-price">{p.price}</strong><p>{p.description}</p>
        <div className="hero-actions"><EnquiryButton topic={`${p.title} (${p.location})`} heading={p.title} source={`property:${p.slug}`} />
          <a className="text-link" href={whatsappLink(c.contact.whatsapp, `Hello, I'm interested in ${p.title} (${p.location}).`)} target="_blank" rel="noreferrer">Chat on WhatsApp <MessageCircle size={14} /></a>
          <Link className="text-link" to="/properties">Back to Properties</Link></div></div>
    </section>
    {others.length > 0 && <section className="section tinted"><SectionIntro eyebrow="More homes" title="You may also like" /><div className="property-grid scroll-x">{others.map(o => <PropertyTile key={o.id} p={o} />)}</div></section>}
  </>;
}

/** One large photo with small thumbnails to switch between a piece's photos. */
function FurnitureGallery({ images, title }: { images: string[]; title: string }) {
  const [i, setI] = useState(0);
  const shown = images[Math.min(i, images.length - 1)];
  return <>
    <div className="property-image"><img src={sized(shown, 900)} alt={title} loading="lazy" decoding="async" /></div>
    {images.length > 1 && <div className="thumb-row" role="group" aria-label={`${title} photos`}>{images.map((src, k) => (
      <button key={k} type="button" className={k === i ? "on" : ""} onClick={() => setI(k)} aria-label={`Show photo ${k + 1} of ${images.length}`} aria-pressed={k === i}><img src={sized(src, 400)} alt="" loading="lazy" decoding="async" /></button>))}</div>}
  </>;
}

export function Furniture() { return <Gate page="furniture"><FurniturePage /></Gate>; }
function FurniturePage() {
  const c = useSiteContent();
  return <>
    <Seo route="/furniture" />
    <PageHero eyebrow="Handcrafted" title={c.pages.furniture.title} text={c.pages.furniture.text} />
    <section className="section"><div className="property-grid scroll-x">{c.loaded && c.furniture.map(f => (
      <article key={f.id} className="property-card">
        <FurnitureGallery images={f.images} title={f.title} />
        <div className="property-info"><div><h3>{f.title}</h3><p>{f.location}</p></div><strong>{f.price}</strong></div>
        <p className="card-desc">{f.description}</p>
        <EnquiryButton look="link" topic={`the ${f.title}`} heading={f.title} source={`furniture:${slugify(f.title)}`} />
      </article>))}</div></section>
  </>;
}

export function PreviousJobs() {
  const c = useSiteContent();
  const [filter, setFilter] = useState("All");
  const shown = filter === "All" ? c.jobs : c.jobs.filter(j => j.category === filter);
  return <>
    <Seo route="/previous-jobs" />
    <PageHero eyebrow="Portfolio" title={c.pages.jobs.title} text={c.pages.jobs.text} />
    <section className="section"><SectionIntro eyebrow="Proof of craft" title="Our previous work" />
      <div className="filter-tabs">{(["Builds", "Furniture"].filter(k => c.jobs.some(j => j.category === k)).length > 1 ? ["All", "Builds", "Furniture"] : []).map(x => <button key={x} className={filter === x ? "active" : ""} onClick={() => setFilter(x)}>{x}</button>)}</div>
      {c.loaded && shown.length === 0 && <p className="empty-note">New work will be added here soon.</p>}
      {c.loaded && <JobsCarousel key={filter} jobs={shown} />}
      <div className="jobs-grid">{c.loaded && shown.map(j => <figure key={j.id} className="job-card"><div className="job-img">{j.video ? <LazyVideo src={j.video} title={j.title} poster={sized(j.image, 900)} /> : <img src={sized(j.image, 900)} alt={`${j.title}, ${j.category === "Builds" ? "build" : "furniture"} by WSL Realty`} loading="lazy" decoding="async" />}</div>
        <figcaption><small>{j.category === "Builds" ? "Build" : "Furniture"}{j.location ? ` · ${j.location}` : ""}</small><h3>{j.title}</h3><p>{j.description}</p></figcaption></figure>)}</div>
    </section>
  </>;
}

export function ProjectUpdates() {
  const c = useSiteContent();
  const { data: pr, loaded } = useProject("arya-luxe");
  const cur = pr.project.current_stage;
  const [picked, setPicked] = useState<number | null>(null);
  const sel = picked ?? cur;
  const st = pr.stages[sel];
  const state = sel < cur ? "complete" : sel === cur ? "in progress" : "upcoming";
  const pct = sel < cur ? 100 : sel === cur ? st.progress : 0;
  return <>
    <Seo route="/project-updates" />
    <PageHero eyebrow="Construction journal" title={c.pages.updates.title} text={c.pages.updates.text} />
    <section className="section"><SectionIntro eyebrow={pr.project.name} title="Follow the build" text={`${pr.project.name} is ${pr.percent}% complete. Now at: ${pr.stages[cur].title}.`} />
      <div className="progress-line" role="progressbar" aria-label="Overall progress" aria-valuenow={pr.percent} aria-valuemin={0} aria-valuemax={100} style={{ marginBottom: 28 }}><span style={{ width: `${pr.percent}%` }} /></div>
      <div className="stage-tabs">{pr.stages.map((s, i) => <button key={s.stage} className={`${sel === i ? "active" : ""} ${i < cur ? "done" : ""}`} onClick={() => setPicked(i)} aria-pressed={sel === i}><span>0{i + 1}</span>{s.title}</button>)}</div>
      <div className="journal-detail"><img decoding="async" src={sized(stageImage(st.image, sel % 2 ? ph.property2 : ph.property3), 1400)} alt={`${st.title} at ${pr.project.name}`} />
        <div><span className="eyebrow">Stage 0{sel + 1} · {state}</span><h3>{st.title}</h3>
          <div className="progress-line" aria-hidden="true" style={{ margin: "14px 0" }}><span style={{ width: `${pct}%` }} /></div>
          <p>{st.note || (sel < cur ? "This stage is complete." : sel === cur ? `Work on this stage is ${pct}% done.` : "This stage is upcoming.")}</p></div></div>
      {pr.gallery.some(g => g.stage === sel) && <div className="stage-gallery" aria-label={`${st.title} photos`}>{pr.gallery.filter(g => g.stage === sel).map(g => (
        <figure key={g.id}><img src={sized(g.image, 900)} alt={g.title} loading="lazy" decoding="async" /><figcaption><strong>{g.title}</strong><span>{g.taken_on ? formatDate(g.taken_on) : ""}{g.taken_on ? " · " : ""}{g.level}% of this stage done</span><p>{g.description}</p></figcaption></figure>))}</div>}
    </section>
    <section className="section tinted"><SectionIntro eyebrow="Project update" title="Latest updates" />
      <div className="update-list">{pr.updates.length === 0 && <p>{loaded ? "No updates have been posted yet. Check back soon." : "Loading updates…"}</p>}{pr.updates.map(u => (
        <article key={u.id} className="update-item"><img src={sized(stageImage(u.images?.[0], u.stage % 2 ? ph.property2 : ph.property3), 900)} alt={pr.stages[u.stage]?.title ?? "Project update"} loading="lazy" decoding="async" />
          <div><span className="eyebrow">{pr.project.name} · {formatDate(u.posted_on)}</span><h3>{u.title || pr.stages[u.stage]?.title}</h3><p>{u.body}</p>{!c.hidden.aryaLuxe && <Link className="text-link" to="/arya-luxe">View Project <ArrowUpRight size={14} /></Link>}</div></article>))}</div>
    </section>
    <section className="section"><SectionIntro eyebrow="Stay informed" title="Get project updates" text="Message us on WhatsApp to receive new progress reports." /><Button asChild><Link to="/contact">Register Interest</Link></Button></section>
  </>;
}

function AryaUnits({ units }: { units: SiteArya["units"] }) {
  const [i, setI] = useState(0);
  const u = units[Math.min(i, units.length - 1)];
  return <div className="arya-units">
    <div role="tablist" aria-label="Apartment type" className="arya-unit-tabs">{units.map((x, k) => <button key={x.id} type="button" role="tab" aria-selected={k === i} className={k === i ? "active" : ""} onClick={() => setI(k)}>{x.label}</button>)}</div>
    <div role="tabpanel" className="arya-unit-panel">{u.image && <img className="arya-unit-img" src={sized(u.image, 1400)} alt={`${u.label} apartment`} loading="lazy" decoding="async" />}<p className="arya-unit-stats">{[u.count, u.size].filter(Boolean).join(" · ")}</p><p>{u.description}</p>
      <ul>{u.features.split(/\n+/).map(t => t.trim()).filter(Boolean).map((t, k) => <li key={k}>{t}</li>)}</ul></div>
  </div>;
}
export function AryaLuxe() { return <Gate page="aryaLuxe"><AryaLuxePage /></Gate>; }
function AryaLuxePage() {
  const c = useSiteContent();
  const { data: pr } = useProject("arya-luxe");
  const a = c.arya;
  const gallery = a.gallery.filter(g => g.image);
  const paras = (a.about.text || "").split(/\n+/).map(t => t.trim()).filter(Boolean);
  return <>
    <Seo route="/arya-luxe" />
    <PageHero eyebrow="" title={pr.project.name} text={pr.project.summary} image={c.loaded ? (c.images.aryaBanner || ph.property1) : undefined} />
    {a.facts.length > 0 && <section className="arya-facts" aria-label="Key facts"><dl>{a.facts.map(f => <div key={f.id}><dt>{f.label}</dt><dd>{f.value}</dd></div>)}</dl></section>}
    {(a.about.title || paras.length > 0) && <section className="section arya-about"><SectionIntro eyebrow="The building" title={a.about.title} />
      <div className="arya-text">{paras.map((t, i) => <p key={i}>{t}</p>)}</div></section>}
    {c.loaded && a.units.length > 0 && <section className="section"><SectionIntro eyebrow="Apartments" title="3 and 4-bedroom smart apartments" />
      <AryaUnits units={a.units} /></section>}
    {a.highlights.length > 0 && <section className="section tinted"><SectionIntro eyebrow="Features" title="Features and amenities" />
      <div className="value-grid">{a.highlights.map(h => <div key={h.id}><h3>{h.title}</h3><p>{h.description}</p></div>)}</div></section>}
    {c.loaded && gallery.length > 0 && <section className="section"><SectionIntro eyebrow="Gallery" title={`Inside ${pr.project.name}`} />
      <div className="stage-gallery">{gallery.map(g => <figure key={g.id}><img src={sized(g.image, 900)} alt={g.caption || pr.project.name} loading="lazy" decoding="async" />{g.caption && <figcaption><p>{g.caption}</p></figcaption>}</figure>)}</div></section>}
    {a.video && <section className="section"><SectionIntro eyebrow="Film" title={`See ${pr.project.name}`} />
      <div className="arya-video"><LazyVideo src={a.video} title={`${pr.project.name} film`} /></div></section>}
    <section className="section tinted"><SectionIntro eyebrow="Interested?" title={a.cta.title} text={a.cta.text} />
      <div className="arya-cta"><EnquiryButton label="Register Interest" topic={`${pr.project.name} (${pr.project.location})`} heading={pr.project.name} source="project:arya-luxe" defaultMessage={`Hello, I'd like to register my interest in ${pr.project.name}.`} />
        <Link className="text-link" to="/project-updates">Follow the construction <ArrowUpRight size={14} /></Link></div></section>
  </>;
}

export function Contact() {
  const c = useSiteContent();
  const { user } = useSession();
  return <>
    <Seo route="/contact" />
    <PageHero eyebrow="Start a conversation" title={c.pages.contact.title} text={c.pages.contact.text} />
    <section className="contact-section">
      <div className="contact-details"><a href={`mailto:${c.contact.email}`}><Mail size={18} />{c.contact.email}</a><a href={telHref(c.contact.phone)}><Phone size={18} />{c.contact.phone}</a><span><MapPin size={18} />{c.contact.address}</span></div>
      <EnquiryForm source="contact_page" whatsapp={c.contact.whatsapp} showInterest />
    </section>
    <section className="contact-inbox"><div><h2>Follow your enquiry</h2>
      <p>{user ? "Open your inbox to see when our team has seen your enquiry, read our replies and write back." : "Create an account or sign in before you send an enquiry, and you can follow it here: see when we have read it and read our replies."}</p></div>
      <Button asChild variant="outline"><Link to={user ? "/inbox" : "/auth"}>{user ? "Open your inbox" : "Sign in or create an account"}</Link></Button></section>
  </>;
}
