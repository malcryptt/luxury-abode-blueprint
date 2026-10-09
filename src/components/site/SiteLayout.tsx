import { signOutUser, useSession } from "@/lib/staff";
import { useReplies } from "@/lib/inbox";
import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { Menu, ChevronRight, LayoutDashboard, LogIn, LogOut, Inbox, ArrowUpRight, Instagram } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import logo from "@/assets/wsl-logo.png";
import { CookieNotice } from "./CookieNotice";

import { useSiteContent, type PageVisibility } from "@/lib/siteContent";
export { Seo } from "./Seo";

const allLinks: [string, string][] = [
  ["Home", "/"], ["About Us", "/about"], ["Properties", "/properties"], ["Furniture", "/furniture"],
  ["Previous Jobs", "/previous-jobs"], ["Project Updates", "/project-updates"], ["Arya Luxe", "/arya-luxe"], ["Contact", "/contact"],
];

// Public site shell. Nothing here knows about the admin area or who is signed in:
// the dashboard is a separate application reached by its own URL.
const HIDEABLE_ROUTES: Record<string, keyof PageVisibility> = { "/properties": "properties", "/furniture": "furniture", "/arya-luxe": "aryaLuxe" };

export function SiteLayout() {
  const [open, setOpen] = useState(false);
  const { hidden } = useSiteContent();
  const links = allLinks.filter(([, to]) => !(HIDEABLE_ROUTES[to] && hidden[HIDEABLE_ROUTES[to]]));
  const { user, staff } = useSession();
  const { unread } = useReplies(user && !staff ? user.uid : undefined);
  const badge = unread > 0 ? <span className="nav-badge" aria-label={`${unread} new replies`}>{unread}</span> : null;
  const out = () => { signOutUser().catch(() => {}); };
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); setOpen(false); }, [pathname]);

  return (
    <div className="wsl-site">
      <CookieNotice />
      <header className="site-header">
        <Link className="wordmark" to="/"><img src={logo} alt="WSL Realty" /><span>WSL <b>REALTY</b></span></Link>
        <nav className="desktop-nav" aria-label="Primary">
          {links.map(([l, to]) => <NavLink key={to} to={to} end={to === "/"} className={({ isActive }) => (isActive ? "active" : "")}>{l}</NavLink>)}
        </nav>
        <div className="header-auth">
          {user && !staff && <Link className="header-signin" to="/inbox"><Inbox size={15} aria-hidden="true" /> My enquiries{badge}</Link>}
          {staff && <Link className="header-signin" to="/admin"><LayoutDashboard size={15} aria-hidden="true" /> Admin</Link>}
          {user ? <button type="button" className="header-signin" onClick={out}><LogOut size={15} aria-hidden="true" /> Sign out</button>
            : <Link className="header-signin" to="/auth"><LogIn size={15} aria-hidden="true" /> Sign in</Link>}
        </div>
        <div className="header-right">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild><Button variant="ghost" size="icon" className="mobile-menu" aria-label="Open menu"><Menu /></Button></SheetTrigger>
            <SheetContent>
              <SheetTitle className="sr-only">Menu</SheetTitle>
              <SheetDescription className="sr-only">Site navigation</SheetDescription>
              <nav className="mobile-nav" aria-label="Mobile">{links.map(([l, to]) => <NavLink key={to} to={to} end={to === "/"}>{l}<ChevronRight size={16} /></NavLink>)}{user && !staff && <Link to="/inbox" className="mobile-signin">My enquiries{badge}<Inbox size={16} /></Link>}{staff && <Link to="/admin" className="mobile-signin">Admin<LayoutDashboard size={16} /></Link>}{user ? <button type="button" className="mobile-signin" onClick={out}>Sign out<LogOut size={16} /></button> : <Link to="/auth" className="mobile-signin">Sign in<LogIn size={16} /></Link>}</nav>
            </SheetContent>
          </Sheet>
        </div>
      </header>
      <main className="page-fade" key={pathname}><Outlet /></main>
      <footer className="site-footer">
        <div><Link className="wordmark" to="/"><img src={logo} alt="" /><span>WSL <b>REALTY</b></span></Link><p>Luxury homes, built with you in mind. Abuja, Nigeria.</p></div>
        <nav aria-label="Footer">{links.map(([l, to]) => <Link key={to} to={to}>{l}</Link>)}</nav>
        <div className="socials">
          <a href="https://www.instagram.com/warohomes" target="_blank" rel="noreferrer" aria-label="Instagram: @warohomes" title="@warohomes"><Instagram size={18} /></a>
          <a href="https://www.instagram.com/wslrealty" target="_blank" rel="noreferrer" aria-label="Instagram: @wslrealty" title="@wslrealty"><Instagram size={18} /></a>
          <a href="https://www.tiktok.com/@warosynergy" target="_blank" rel="noreferrer" aria-label="TikTok: @warosynergy" title="@warosynergy"><TikTok size={18} /></a>
          <Link className="text-link" to="/contact">Enquire Now <ArrowUpRight size={14} /></Link>
        </div>
        <small>© {new Date().getFullYear()} WSL Realty. All rights reserved. {user && !staff && <Link className="footer-signin" to="/inbox">My enquiries</Link>}{staff && <Link className="footer-signin" to="/admin">Admin</Link>}{user ? <button type="button" className="footer-signin" onClick={out}>Sign out</button> : <Link className="footer-signin" to="/auth">Sign in</Link>}</small>
      </footer>
    </div>
  );
}

/** lucide has no TikTok mark, so it is drawn here. */
function TikTok({ size = 18 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16.6 2h-3.2v13.2a2.9 2.9 0 1 1-2.9-2.9c.3 0 .6 0 .9.1V9.1a6.2 6.2 0 1 0 5.2 6.1V8.6a7.9 7.9 0 0 0 4.6 1.5V6.9a4.7 4.7 0 0 1-4.6-4.9Z" /></svg>;
}

export function PageHero({ eyebrow, title, text, image }: { eyebrow: string; title: string; text?: string; image?: string }) {
  return (
    <section className={`page-hero ${image ? "with-image" : ""}`}>
      {image && <><img src={image} alt="" /><div className="hero-shade" /></>}
      <div className="page-hero-copy">{eyebrow && <span className={`eyebrow ${image ? "light" : ""}`}>{eyebrow}</span>}<h1>{title}</h1>{text && <p>{text}</p>}</div>
    </section>
  );
}

export function SectionIntro({ eyebrow, title, text }: { eyebrow?: string; title: string; text?: string }) {
  return <div className="section-intro">{eyebrow && <span className="eyebrow">{eyebrow}</span>}<h2>{title}</h2>{text && <p>{text}</p>}</div>;
}
