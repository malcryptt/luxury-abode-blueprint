import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getConsent, setConsent, trackContactClick, trackPage } from "@/lib/analytics";
import { useLocation } from "react-router-dom";

/** Asks once before any analytics runs, sends page views on route changes and tracks contact taps. */
export function CookieNotice() {
  const [asked, setAsked] = useState(() => getConsent() !== null);
  const { pathname } = useLocation();
  useEffect(() => { trackPage(pathname); }, [pathname, asked]);
  useEffect(() => {
    document.addEventListener("click", trackContactClick);
    return () => document.removeEventListener("click", trackContactClick);
  }, []);
  if (asked) return null;
  const choose = (v: "granted" | "denied") => { setConsent(v); setAsked(true); };
  return (
    <div className="cookie-notice" role="region" aria-label="Cookie notice">
      <p>We use cookies to count visits and see which pages help people most. Nothing is collected until you accept. <Link to="/contact">Contact us</Link> with any questions.</p>
      <div><button type="button" className="cookie-decline" onClick={() => choose("denied")}>Decline</button><button type="button" className="cookie-accept" onClick={() => choose("granted")}>Accept</button></div>
    </div>
  );
}
