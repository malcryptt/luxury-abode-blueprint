import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { Menu, ChevronRight, LogIn, ArrowUpRight, Instagram, Facebook } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import logo from "@/assets/wsl-logo.png";

export { Seo } from "./Seo";

const links: [string, string][] = [
  ["Home", "/"], ["About Us", "/about"], ["Properties", "/properties"], ["Furniture", "/furniture"],
  ["Previous Jobs", "/previous-jobs"], ["Project Updates", "/project-updates"], ["Arya Luxe", "/arya-luxe"], ["Contact", "/contact"],
];

// Public site shell. Nothing here knows about the admin area or who is signed in:
// the dashboard is a separate application reached by its own URL.
export function SiteLayout() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); setOpen(false); }, [pathname]);

  return (
    <div className="wsl-site">
      <header className="site-header">
        <Link className="wordmark" to="/"><img src={logo} alt="WSL Realty" /><span>WSL <b>REALTY</b></span></Link>
        <nav className="desktop-nav" aria-label="Primary">
          {links.map(([l, to]) => <NavLink key={to} to={to} end={to === "/"} className={({ isActive }) => (isActive ? "active" : "")}>{l}</NavLink>)}
        </nav>
        <Link className="header-signin" to="/auth"><LogIn size={15} aria-hidden="true" /> Sign in</Link>
        <div className="header-right">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild><Button variant="ghost" size="icon" className="mobile-menu" aria-label="Open menu"><Menu /></Button></SheetTrigger>
            <SheetContent>
              <SheetTitle className="sr-only">Menu</SheetTitle>
              <SheetDescription className="sr-only">Site navigation</SheetDescription>
              <nav className="mobile-nav" aria-label="Mobile">{links.map(([l, to]) => <NavLink key={to} to={to} end={to === "/"}>{l}<ChevronRight size={16} /></NavLink>)}<Link to="/auth" className="mobile-signin">Sign in<LogIn size={16} /></Link></nav>
            </SheetContent>
          </Sheet>
        </div>
      </header>
      <main className="page-fade" key={pathname}><Outlet /></main>
      <footer className="site-footer">
        <div><Link className="wordmark" to="/"><img src={logo} alt="" /><span>WSL <b>REALTY</b></span></Link><p>Luxury homes, built with craft. Abuja, Nigeria.</p></div>
        <nav aria-label="Footer">{links.map(([l, to]) => <Link key={to} to={to}>{l}</Link>)}</nav>
        <div className="socials">
          <a href="https://facebook.com" target="_blank" rel="noreferrer" aria-label="Facebook"><Facebook size={18} /></a>
          <a href="https://instagram.com" target="_blank" rel="noreferrer" aria-label="Instagram"><Instagram size={18} /></a>
          <Link className="text-link" to="/contact">Enquire Now <ArrowUpRight size={14} /></Link>
        </div>
        <small>© {new Date().getFullYear()} WSL Realty. All rights reserved. <Link className="footer-signin" to="/auth">Sign in</Link></small>
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
