import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowUpRight, Mail, Phone, MapPin, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import heroImage from "@/assets/hero-luxury-home.jpg";
import { Seo, PageHero, SectionIntro } from "@/components/site/SiteLayout";
import { useSiteContent, placeholders as ph, whatsappLink, slugify, SiteProperty } from "@/lib/siteContent";
import { EnquiryButton } from "@/components/site/EnquiryDialog";
import { EnquiryForm } from "@/components/site/EnquiryForm";
import NotFound from "@/pages/NotFound";
import { useProject, stageImage, formatDate } from "@/lib/projects";
import { useSession } from "@/lib/staff";


function PropertyTile({ p }: { p: SiteProperty }) {
  return (
    <Link to={`/properties/${p.slug}`} className="property-card">
      <div className="property-image"><img src={p.image} alt={p.title} loading="lazy" /><span className="arrow"><ArrowUpRight size={20} /></span></div>
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
    <section className="hero"><img src={heroImage} alt="Contemporary luxury home in Abuja" /><div className="hero-shade" />
      <div className="hero-copy"><h1>{c.hero.title}</h1><p>{c.hero.subtitle}</p>
        <div className="hero-actions"><Button asChild><Link to="/properties">View Properties <ArrowUpRight size={16} /></Link></Button><Link className="text-link light" to="/project-updates">See Our Progress</Link></div></div>
    </section>
    <section className="section"><SectionIntro eyebrow="Available now" title="Featured properties" text="Explore our available properties." />
      <div className="property-grid scroll-x">{c.properties.slice(0, 3).map(p => <PropertyTile key={p.id} p={p} />)}</div>
      <div className="section-link"><Link className="text-link" to="/properties">View All Properties <ArrowUpRight size={16} /></Link></div>
    </section>
    <section className="project-feature"><div className="project-image"><img src={ph.property3} alt="Arya Luxe construction" /><span className="project-label">Currently building</span></div>
      <div className="project-copy"><span className="eyebrow">Featured project</span><h2>Arya Luxe</h2><p>Follow the construction of Arya Luxe, a private collection of contemporary residences in Gwarinpa.</p>
        <div className="progress-line" role="progressbar" aria-label="Arya Luxe progress" aria-valuenow={pr.percent} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${pr.percent}%` }} /></div>
        <div className="progress-meta"><span>Current stage</span><strong>{pr.stages[pr.project.current_stage].title} · {pr.percent}% complete</strong></div>
        <Link className="text-link" to="/arya-luxe">Follow The Build <ArrowUpRight size={16} /></Link></div>
    </section>
    <section className="section why"><SectionIntro eyebrow="Our promise" title="Why WSL Realty" />
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
    <section className="section about-section"><div className="about-image"><img src={ph.furniture1} alt="Crafted interior detail" /></div>
      <div className="about-copy"><SectionIntro eyebrow="Since the beginning" title="Our story" text={c.about.description} />
        <div className="timeline">{["Founded", "Bespoke furniture", "Real estate", "Today"].map((t, i) => <div key={t} className={i === 2 ? "active" : ""}><span>{t}</span></div>)}</div></div>
    </section>
    <section className="section tinted"><SectionIntro eyebrow="Values" title="What we stand for" />
      <div className="value-grid">{c.services.map(s => <div key={s.id}><h3>{s.title}</h3><p>{s.description}</p></div>)}</div>
    </section>
  </>;
}

export function Properties() {
  const c = useSiteContent();
  return <>
    <Seo route="/properties" />
    <PageHero eyebrow="A considered collection" title={c.pages.properties.title} text={c.pages.properties.text} />
    <section className="section"><div className="property-grid">{c.properties.map(p => <PropertyTile key={p.id} p={p} />)}</div></section>
  </>;
}

export function PropertyDetail() {
  const { slug } = useParams();
  const c = useSiteContent();
  const p = c.properties.find(x => x.slug === slug);
  if (!p) return <NotFound />;
  const others = c.properties.filter(x => x.slug !== slug).slice(0, 3);
  return <>
    <Seo property={p} />
    <section className="detail"><img className="detail-image" src={p.image} alt={p.title} />
      <div className="detail-copy"><span className="eyebrow">Featured property</span><h1>{p.title}</h1><p className="detail-loc"><MapPin size={16} /> {p.location}</p>
        <strong className="detail-price">{p.price}</strong><p>{p.description}</p>
        <div className="hero-actions"><EnquiryButton topic={`${p.title} (${p.location})`} heading={p.title} source={`property:${p.slug}`} />
          <a className="text-link" href={whatsappLink(c.contact.whatsapp, `Hello, I'm interested in ${p.title} (${p.location}).`)} target="_blank" rel="noreferrer">Chat on WhatsApp <MessageCircle size={14} /></a>
          <Link className="text-link" to="/properties">Back to Properties</Link></div></div>
    </section>
    {others.length > 0 && <section className="section tinted"><SectionIntro eyebrow="More homes" title="You may also like" /><div className="property-grid scroll-x">{others.map(o => <PropertyTile key={o.id} p={o} />)}</div></section>}
  </>;
}

export function Furniture() {
  const c = useSiteContent();
  return <>
    <Seo route="/furniture" />
    <PageHero eyebrow="Handcrafted" title={c.pages.furniture.title} text={c.pages.furniture.text} />
    <section className="section"><div className="property-grid scroll-x">{c.furniture.map(f => (
      <article key={f.id} className="property-card">
        <div className="property-image"><img src={f.images[0]} alt={f.title} loading="lazy" /></div>
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
      <div className="filter-tabs">{["All", "Builds", "Furniture"].map(x => <button key={x} className={filter === x ? "active" : ""} onClick={() => setFilter(x)}>{x}</button>)}</div>
      {shown.length === 0 && <p className="empty-note">New work will be added here soon.</p>}
      <div className="jobs-grid">{shown.map(j => <figure key={j.id} className="job-card"><div className="job-img"><img src={j.image} alt={`${j.title}, ${j.category === "Builds" ? "build" : "furniture"} by WSL Realty`} loading="lazy" /></div>
        <figcaption><small>{j.category === "Builds" ? "Build" : "Furniture"}{j.location ? ` · ${j.location}` : ""}</small><h3>{j.title}</h3><p>{j.description}</p></figcaption></figure>)}</div>
    </section>
  </>;
}

export function ProjectUpdates() {
  const c = useSiteContent();
  const { data: pr, loaded } = useProject("arya-luxe");
  return <>
    <Seo route="/project-updates" />
    <PageHero eyebrow="Construction journal" title={c.pages.updates.title} text={c.pages.updates.text} />
    <section className="section"><SectionIntro eyebrow="Project update" title="Latest updates" text={`Arya Luxe is ${pr.percent}% complete.`} />
      <div className="update-list">{pr.updates.length === 0 && <p>{loaded ? "No updates have been posted yet. Check back soon." : "Loading updates…"}</p>}{pr.updates.map(u => (
        <article key={u.id} className="update-item"><img src={stageImage(u.images?.[0], u.stage % 2 ? ph.property2 : ph.property3)} alt={pr.stages[u.stage]?.title ?? "Project update"} loading="lazy" />
          <div><span className="eyebrow">{pr.project.name} · {formatDate(u.posted_on)}</span><h3>{u.title || pr.stages[u.stage]?.title}</h3><p>{u.body}</p><Link className="text-link" to="/arya-luxe">View Project <ArrowUpRight size={14} /></Link></div></article>))}</div>
    </section>
    <section className="section tinted"><SectionIntro eyebrow="Stay informed" title="Get project updates" text="Message us on WhatsApp to receive new progress reports." /><Button asChild><Link to="/contact">Register Interest</Link></Button></section>
  </>;
}

export function AryaLuxe() {
  const { data: pr } = useProject("arya-luxe");
  const cur = pr.project.current_stage;
  const [picked, setPicked] = useState<number | null>(null);
  const sel = picked ?? cur;
  const st = pr.stages[sel];
  const state = sel < cur ? "complete" : sel === cur ? "in progress" : "upcoming";
  const pct = sel < cur ? 100 : sel === cur ? st.progress : 0;
  return <>
    <Seo route="/arya-luxe" />
    <PageHero eyebrow={`${pr.project.location} · 2025—26`} title={pr.project.name} text={pr.project.summary} image={ph.property1} />
    <section className="section"><SectionIntro eyebrow="Current stage" title="Follow the build" text={`${pr.project.name} is ${pr.percent}% complete. Now at: ${pr.stages[cur].title}.`} />
      <div className="progress-line" role="progressbar" aria-label="Overall progress" aria-valuenow={pr.percent} aria-valuemin={0} aria-valuemax={100} style={{ marginBottom: 28 }}><span style={{ width: `${pr.percent}%` }} /></div>
      <div className="stage-tabs">{pr.stages.map((s, i) => <button key={s.stage} className={`${sel === i ? "active" : ""} ${i < cur ? "done" : ""}`} onClick={() => setPicked(i)} aria-pressed={sel === i}><span>0{i + 1}</span>{s.title}</button>)}</div>
      <div className="journal-detail"><img src={stageImage(st.image, sel % 2 ? ph.property2 : ph.property3)} alt={`${st.title} at ${pr.project.name}`} />
        <div><span className="eyebrow">Stage 0{sel + 1} · {state}</span><h3>{st.title}</h3>
          <div className="progress-line" aria-hidden="true" style={{ margin: "14px 0" }}><span style={{ width: `${pct}%` }} /></div>
          <p>{st.note || (sel < cur ? "This stage is complete." : sel === cur ? `Work on this stage is ${pct}% done.` : "This stage is upcoming.")}</p></div></div>
      {pr.gallery.some(g => g.stage === sel) && <div className="stage-gallery" aria-label={`${st.title} photos`}>{pr.gallery.filter(g => g.stage === sel).map(g => (
        <figure key={g.id}><img src={g.image} alt={g.title} loading="lazy" /><figcaption><strong>{g.title}</strong><span>{g.taken_on ? formatDate(g.taken_on) : ""}{g.taken_on ? " · " : ""}{g.level}% of this stage done</span><p>{g.description}</p></figcaption></figure>))}</div>}
    </section>
    <section className="section tinted"><SectionIntro eyebrow="Interested?" title="Register your interest" text="Units are limited. Speak to our team about pricing and availability." />
      <EnquiryButton label="Register Interest" topic="Arya Luxe (Gwarinpa, Abuja)" heading="Arya Luxe" source="project:arya-luxe" defaultMessage="Hello, I'd like to register my interest in Arya Luxe." /></section>
  </>;
}

export function Contact() {
  const c = useSiteContent();
  const { user } = useSession();
  return <>
    <Seo route="/contact" />
    <PageHero eyebrow="Start a conversation" title={c.pages.contact.title} text={c.pages.contact.text} />
    <section className="contact-section">
      <div className="contact-details"><a href={`mailto:${c.contact.email}`}><Mail size={18} />{c.contact.email}</a><a href={`tel:${c.contact.phone}`}><Phone size={18} />{c.contact.phone}</a><span><MapPin size={18} />{c.contact.address}</span></div>
      <EnquiryForm source="contact_page" whatsapp={c.contact.whatsapp} showInterest />
    </section>
    <section className="contact-inbox"><div><h2>Follow your enquiry</h2>
      <p>{user ? "Open your inbox to see when our team has seen your enquiry, read our replies and write back." : "Create an account or sign in before you send an enquiry, and you can follow it here: see when we have read it and read our replies."}</p></div>
      <Button asChild variant="outline"><Link to={user ? "/inbox" : "/auth"}>{user ? "Open your inbox" : "Sign in or create an account"}</Link></Button></section>
  </>;
}
