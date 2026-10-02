import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { Menu, ChevronRight, ArrowUpRight, Instagram, Facebook } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/wsl-logo.png";

const links: [string, string][] = [
  ["Home", "/"], ["About Us", "/about"], ["Properties", "/properties"], ["Furniture", "/furniture"],
  ["Previous Jobs", "/previous-jobs"], ["Project Updates", "/project-updates"], ["Arya Luxe", "/arya-luxe"], ["Contact", "/contact"],
];

export function Seo({ title, description }: { title: string; description: string }) {
  const { pathname } = useLocation();
  useEffect(() => {
    document.title = `${title} | WSL Properties`;
    const set = (sel: string, attr: string, key: string, val: string) => {
      let el = document.head.querySelector<HTMLElement>(sel);
      if (!el) { el = document.createElement(sel.startsWith("link") ? "link" : "meta"); el.setAttribute(attr, key); document.head.appendChild(el); }
      el.setAttribute(sel.startsWith("link") ? "href" : "content", val);
    };
    set('meta[name="description"]', "name", "description", description);
    set('meta[property="og:title"]', "property", "og:title", `${title} | WSL Properties`);
    set('meta[property="og:description"]', "property", "og:description", description);
    set('meta[property="og:url"]', "property", "og:url", `https://wslproperties.com.ng${pathname}`);
    set('link[rel="canonical"]', "rel", "canonical", `https://wslproperties.com.ng${pathname}`);
  }, [title, description, pathname]);
  return null;
}

export function SiteLayout() {
  const [signedIn, setSignedIn] = useState(false);
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); setOpen(false); }, [pathname]);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSignedIn(!!s));
    return () => data.subscription.unsubscribe();
  }, []);

  return (
    <div className="wsl-site">
      <header className="site-header">
        <Link className="wordmark" to="/"><img src={logo} alt="WSL Properties" /><span>WSL <b>PROPERTIES</b></span></Link>
        <nav className="desktop-nav">
          {links.map(([l, to]) => <NavLink key={to} to={to} end={to === "/"} className={({ isActive }) => (isActive ? "active" : "")}>{l}</NavLink>)}
        </nav>
        <div className="header-right">
          {signedIn
            ? <button className="text-link" onClick={() => supabase.auth.signOut()}>Sign Out</button>
            : <Link className="text-link" to="/auth">Sign In</Link>}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild><Button variant="ghost" size="icon" className="mobile-menu" aria-label="Open menu"><Menu /></Button></SheetTrigger>
            <SheetContent><nav className="mobile-nav">{links.map(([l, to]) => <NavLink key={to} to={to} end={to === "/"}>{l}<ChevronRight size={16} /></NavLink>)}</nav></SheetContent>
          </Sheet>
        </div>
      </header>
      <main className="page-fade" key={pathname}><Outlet /></main>
      <footer className="site-footer">
        <div><Link className="wordmark" to="/"><img src={logo} alt="" /><span>WSL <b>PROPERTIES</b></span></Link><p>Luxury homes, built with craft. Abuja, Nigeria.</p></div>
        <nav>{links.map(([l, to]) => <Link key={to} to={to}>{l}</Link>)}</nav>
        <div className="socials">
          <a href="https://facebook.com" target="_blank" rel="noreferrer" aria-label="Facebook"><Facebook size={18} /></a>
          <a href="https://instagram.com" target="_blank" rel="noreferrer" aria-label="Instagram"><Instagram size={18} /></a>
          <Link className="text-link" to="/contact">Enquire Now <ArrowUpRight size={14} /></Link>
        </div>
        <small>© {new Date().getFullYear()} WSL Properties. All rights reserved.</small>
      </footer>
    </div>
  );
}

export function PageHero({ eyebrow, title, text, image }: { eyebrow: string; title: string; text?: string; image?: string }) {
  return (
    <section className={`page-hero ${image ? "with-image" : ""}`}>
      {image && <><img src={image} alt="" /><div className="hero-shade" /></>}
      <div className="page-hero-copy"><span className={`eyebrow ${image ? "light" : ""}`}>{eyebrow}</span><h1>{title}</h1>{text && <p>{text}</p>}</div>
    </section>
  );
}

export function SectionIntro({ eyebrow, title, text }: { eyebrow: string; title: string; text?: string }) {
  return <div className="section-intro"><span className="eyebrow">{eyebrow}</span><h2>{title}</h2>{text && <p>{text}</p>}</div>;
}
