import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowUpRight, Mail, Phone, MapPin, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import heroImage from "@/assets/hero-luxury-home.jpg";
import { Seo, PageHero, SectionIntro } from "@/components/site/SiteLayout";
import { useSiteContent, placeholders as ph, whatsappLink, SiteProperty } from "@/lib/siteContent";
import NotFound from "@/pages/NotFound";

const stages = ["Foundation", "Block Work", "Ceiling", "Windows", "Finishing", "Handover"];
const CURRENT_STAGE = 1;

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
        <div className="progress-line"><span style={{ width: `${((CURRENT_STAGE + 1) / stages.length) * 100}%` }} /></div>
        <div className="progress-meta"><span>Current stage</span><strong>{stages[CURRENT_STAGE]}</strong></div>
        <Link className="text-link" to="/arya-luxe">Follow The Build <ArrowUpRight size={16} /></Link></div>
    </section>
    <section className="section why"><SectionIntro eyebrow="Our promise" title="Why WSL Properties" />
      <div className="value-grid">{[["Craft", "A heritage in bespoke furniture shapes every finish."], ["Clarity", "Transparent progress updates at every stage."], ["Longevity", "Homes built with materials and methods that last."]].map(([t, d]) => <div key={t}><h3>{t}</h3><p>{d}</p></div>)}</div>
      <div className="section-link"><Button asChild><Link to="/contact">Enquire Now</Link></Button></div>
    </section>
  </>;
}

export function About() {
  const c = useSiteContent();
  return <>
    <Seo route="/about" />
    <PageHero eyebrow="Company" title="About WSL Properties" text="A property developer with roots in making." />
    <section className="section about-section"><div className="about-image"><img src={ph.furniture1} alt="Crafted interior detail" /></div>
      <div className="about-copy"><SectionIntro eyebrow="Since the beginning" title="Our story" text={c.about.description} />
        <div className="timeline">{["Founded", "Bespoke furniture", "Real estate", "Today"].map((t, i) => <div key={t} className={i === 2 ? "active" : ""}><b>0{i + 1}</b><span>{t}</span></div>)}</div></div>
    </section>
    <section className="section tinted"><SectionIntro eyebrow="Values" title="What we stand for" />
      <div className="value-grid">{(c.services.length ? c.services : [{ id: "a", title: "Quality", description: "No shortcuts on materials or workmanship." }, { id: "b", title: "Integrity", description: "Honest pricing and honest timelines." }, { id: "c", title: "Design", description: "Considered spaces made for real living." }]).map(s => <div key={s.id}><h3>{s.title}</h3><p>{s.description}</p></div>)}</div>
    </section>
  </>;
}

export function Properties() {
  const c = useSiteContent();
  return <>
    <Seo route="/properties" />
    <PageHero eyebrow="A considered collection" title="Properties" text="Explore our available properties." />
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
        <div className="hero-actions"><Button asChild><a href={whatsappLink(c.contact.whatsapp, `Hello, I'm interested in ${p.title} (${p.location}).`)} target="_blank" rel="noreferrer">Enquire Now <MessageCircle size={16} /></a></Button><Link className="text-link" to="/properties">Back to Properties</Link></div></div>
    </section>
    {others.length > 0 && <section className="section tinted"><SectionIntro eyebrow="More homes" title="You may also like" /><div className="property-grid scroll-x">{others.map(o => <PropertyTile key={o.id} p={o} />)}</div></section>}
  </>;
}

export function Furniture() {
  const c = useSiteContent();
  return <>
    <Seo route="/furniture" />
    <PageHero eyebrow="Handcrafted" title="Furniture" text="Bespoke pieces made with the same care as our homes." />
    <section className="section"><div className="property-grid scroll-x">{c.furniture.map(f => (
      <article key={f.id} className="property-card">
        <div className="property-image"><img src={f.images[0]} alt={f.title} loading="lazy" /></div>
        <div className="property-info"><div><h3>{f.title}</h3><p>{f.location}</p></div><strong>{f.price}</strong></div>
        <p className="card-desc">{f.description}</p>
        <a className="text-link small" href={whatsappLink(c.contact.whatsapp, `Hello, I'm interested in the ${f.title}.`)} target="_blank" rel="noreferrer">Enquire Now <ArrowUpRight size={14} /></a>
      </article>))}</div></section>
  </>;
}

export function PreviousJobs() {
  const [filter, setFilter] = useState("All");
  const items = [ph.property1, ph.furniture1, ph.property2, ph.furniture2, ph.property3, ph.furniture3].map((src, i) => ({ src, cat: i % 2 ? "Furniture" : "Builds" }));
  const shown = filter === "All" ? items : items.filter(i => i.cat === filter);
  return <>
    <Seo route="/previous-jobs" />
    <PageHero eyebrow="Portfolio" title="Previous Jobs" text="A selection of spaces, details and objects from our previous work." />
    <section className="section"><SectionIntro eyebrow="Proof of craft" title="Our previous work" />
      <div className="filter-tabs">{["All", "Builds", "Furniture"].map(x => <button key={x} className={filter === x ? "active" : ""} onClick={() => setFilter(x)}>{x}</button>)}</div>
      <div className="media-grid">{shown.map((m, i) => <div key={m.src} className={`media-item media-${i}`}><img src={m.src} alt={`WSL ${m.cat}`} loading="lazy" /></div>)}</div>
    </section>
  </>;
}

const updates = [
  { date: "14 September 2025", stage: 1, text: "Block work completed through level 2. The structure is taking shape with clean lines and generous light." },
  { date: "20 July 2025", stage: 0, text: "Foundation completed and inspected. Ground works signed off ahead of schedule." },
];

export function ProjectUpdates() {
  return <>
    <Seo route="/project-updates" />
    <PageHero eyebrow="Construction journal" title="Project Updates" text="Real progress, documented from the ground up." />
    <section className="section"><SectionIntro eyebrow="Project update" title="Latest updates" />
      <div className="update-list">{updates.map(u => (
        <article key={u.date} className="update-item"><img src={u.stage ? ph.property2 : ph.property3} alt={stages[u.stage]} loading="lazy" />
          <div><span className="eyebrow">Arya Luxe · {u.date}</span><h3>{stages[u.stage]}</h3><p>{u.text}</p><Link className="text-link" to="/arya-luxe">View Project <ArrowUpRight size={14} /></Link></div></article>))}</div>
    </section>
    <section className="section tinted"><SectionIntro eyebrow="Stay informed" title="Get project updates" text="Message us on WhatsApp to receive new progress reports." /><Button asChild><Link to="/contact">Register Interest</Link></Button></section>
  </>;
}

export function AryaLuxe() {
  const [sel, setSel] = useState(CURRENT_STAGE);
  const c = useSiteContent();
  return <>
    <Seo route="/arya-luxe" />
    <PageHero eyebrow="Gwarinpa, Abuja · 2025—26" title="Arya Luxe" text="A private collection of contemporary residences, built with clarity, quality and a long view." image={ph.property1} />
    <section className="section"><SectionIntro eyebrow="Current stage" title="Follow the build" text="Follow the construction of Arya Luxe." />
      <div className="stage-tabs">{stages.map((s, i) => <button key={s} className={`${sel === i ? "active" : ""} ${i <= CURRENT_STAGE ? "done" : ""}`} onClick={() => setSel(i)}><span>0{i + 1}</span>{s}</button>)}</div>
      <div className="journal-detail"><img src={sel % 2 ? ph.property2 : ph.property3} alt={`${stages[sel]} at Arya Luxe`} />
        <div><span className="eyebrow">Stage 0{sel + 1}</span><h3>{stages[sel]}</h3><p>{sel < CURRENT_STAGE ? "This stage is complete." : sel === CURRENT_STAGE ? "Work on this stage is in progress." : "This stage is upcoming."}</p></div></div>
    </section>
    <section className="section tinted"><SectionIntro eyebrow="Interested?" title="Register your interest" text="Units are limited. Speak to our team about pricing and availability." />
      <Button asChild><a href={whatsappLink(c.contact.whatsapp, "Hello, I'd like to register interest in Arya Luxe.")} target="_blank" rel="noreferrer">Register Interest</a></Button></section>
  </>;
}

export function Contact() {
  const c = useSiteContent();
  const [f, setF] = useState({ name: "", phone: "", email: "", interest: "", message: "" });
  const send = (e: React.FormEvent) => {
    e.preventDefault();
    const text = `Name: ${f.name}\nPhone: ${f.phone}\nEmail: ${f.email}\nInterested In: ${f.interest}\n\n${f.message}`;
    window.open(whatsappLink(c.contact.whatsapp, text), "_blank");
  };
  const field = (k: keyof typeof f, label: string, type = "text") => <label className="form-field">{label}<Input required={k === "name" || k === "phone"} maxLength={200} type={type} value={f[k]} onChange={e => setF({ ...f, [k]: e.target.value })} /></label>;
  return <>
    <Seo route="/contact" />
    <PageHero eyebrow="Start a conversation" title="Contact Us" text="For property enquiries, project information or partnerships, our team is ready to help." />
    <section className="contact-section">
      <div className="contact-details"><a href={`mailto:${c.contact.email}`}><Mail size={18} />{c.contact.email}</a><a href={`tel:${c.contact.phone}`}><Phone size={18} />{c.contact.phone}</a><span><MapPin size={18} />{c.contact.address}</span></div>
      <form onSubmit={send}>{field("name", "Full Name")}{field("phone", "Phone Number", "tel")}{field("email", "Email Address", "email")}{field("interest", "Interested In")}
        <label className="form-field">Message<Textarea maxLength={1000} value={f.message} onChange={e => setF({ ...f, message: e.target.value })} /></label>
        <Button type="submit">Send Enquiry</Button></form>
    </section>
  </>;
}
