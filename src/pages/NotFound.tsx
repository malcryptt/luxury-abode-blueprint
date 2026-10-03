import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Seo } from "@/components/site/Seo";

// Rendered inside the public layout, so a missing page still has the site header and footer.
const NotFound = () => (
  <>
    <Seo title="Page not found" description="The page you are looking for has moved or does not exist." noindex />
    <section className="page-hero">
      <div className="page-hero-copy">
        <span className="eyebrow">Error 404</span>
        <h1>Page not found</h1>
        <p>The page you are looking for has moved or does not exist.</p>
        <div className="hero-actions">
          <Button asChild><Link to="/">Back to Home</Link></Button>
          <Link className="text-link" to="/properties">Browse properties</Link>
        </div>
      </div>
    </section>
  </>
);

export default NotFound;
