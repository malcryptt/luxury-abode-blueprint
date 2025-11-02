import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import PropertyCard from "@/components/PropertyCard";
import ContactForm from "@/components/ContactForm";
import { toast } from "sonner";
import { LogOut, Phone, Facebook, Instagram } from "lucide-react";
import { User } from "@supabase/supabase-js";
import heroImage from "@/assets/hero-luxury-home.jpg";
import wslLogo from "@/assets/wsl-logo.png";
import property1 from "@/assets/property-1.jpg";
import property2 from "@/assets/property-2.jpg";
import property3 from "@/assets/property-3.jpg";
import furniture1 from "@/assets/furniture-1.jpg";
import furniture2 from "@/assets/furniture-2.jpg";
import furniture3 from "@/assets/furniture-3.jpg";

const Index = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [websiteContent, setWebsiteContent] = useState<any>({
    hero: { title: "Where Luxury Finds a Home", subtitle: "Experience unparalleled elegance in Abuja's finest residential properties" },
    about: { title: "About WSL Realty", description: "WSL Realty is dedicated to redefining residential luxury. We combine expertise, innovation, and exceptional service to help you find your dream home or manage your investments effortlessly. Our commitment to excellence ensures every client receives personalized attention and access to Abuja's most prestigious properties." },
    contact: { phone: "+234 901 088 3999", email: "mailwaro.online@gmail.com", address: "Gwarinpa, 900108, FCT Nigeria", whatsapp: "2349010883999" },
    properties: [],
    services: [],
    furniture: [],
  });

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        if (!session?.user) {
          navigate("/auth");
        } else {
          setTimeout(() => {
            checkAdminStatus(session.user.id);
            loadWebsiteContent();
          }, 0);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate("/auth");
      } else {
        checkAdminStatus(session.user.id);
        loadWebsiteContent();
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const checkAdminStatus = async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    setIsAdmin(!!data);
  };

  const loadWebsiteContent = async () => {
    const { data } = await supabase
      .from("website_content")
      .select("section, content");

    if (data) {
      const contentMap: any = {};
      data.forEach((item) => {
        contentMap[item.section] = item.content;
      });
      setWebsiteContent((prev) => ({ ...prev, ...contentMap }));
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out successfully");
    navigate("/auth");
  };

  const handleInquire = (propertyName: string) => {
    const message = encodeURIComponent(`I'm interested in ${propertyName}. Please provide more details.`);
    window.open(`https://wa.me/2349010883999?text=${message}`, "_blank");
  };

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    element?.scrollIntoView({ behavior: "smooth" });
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="fixed top-0 w-full bg-background/95 backdrop-blur-sm border-b border-border z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={wslLogo} alt="WSL Realty" className="w-12 h-12" />
            <h1 className="text-2xl font-playfair font-bold">
              WSL Realty
            </h1>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <button onClick={() => scrollToSection("hero")} className="hover:text-gold transition-smooth">Home</button>
            <button onClick={() => scrollToSection("properties")} className="hover:text-gold transition-smooth">Properties</button>
            <button onClick={() => scrollToSection("about")} className="hover:text-gold transition-smooth">About</button>
            <button onClick={() => scrollToSection("services")} className="hover:text-gold transition-smooth">Services</button>
            <button onClick={() => scrollToSection("furniture")} className="hover:text-gold transition-smooth">Furniture</button>
            <button onClick={() => scrollToSection("contact")} className="hover:text-gold transition-smooth">Contact</button>
            {isAdmin && (
              <Button 
                onClick={() => navigate("/admin")}
                variant="outline"
                size="sm"
                className="border-gold text-gold hover:bg-gold hover:text-charcoal"
              >
                Admin
              </Button>
            )}
            <Button 
              onClick={handleSignOut}
              variant="outline"
              size="sm"
              className="border-gold text-gold hover:bg-gold hover:text-charcoal"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section id="hero" className="relative h-screen flex items-center justify-center mt-16">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroImage})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/70 to-background" />
        </div>
        <div className="relative z-10 text-center space-y-6 px-4 animate-fade-in">
          <h2 className="text-5xl md:text-7xl font-playfair font-bold">
            {websiteContent.hero.title}
          </h2>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
            {websiteContent.hero.subtitle}
          </p>
          <Button 
            onClick={() => scrollToSection("properties")}
            className="bg-gold hover:bg-gold-light text-charcoal font-semibold px-8 py-6 text-lg transition-smooth"
          >
            View Properties
          </Button>
        </div>
      </section>

      {/* Featured Properties */}
      <section id="properties" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 animate-fade-in">
            <h2 className="text-4xl md:text-5xl font-playfair font-bold mb-4">
              Featured <span className="text-gold">Properties</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Discover our curated selection of luxury residences
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {websiteContent.properties && websiteContent.properties.length > 0 ? (
              websiteContent.properties.map((property: any) => (
                <PropertyCard
                  key={property.id}
                  image={property.image}
                  title={property.title}
                  location={property.location}
                  description={property.description}
                  price={property.price}
                  onInquire={() => handleInquire(property.title)}
                />
              ))
            ) : (
              <>
                <PropertyCard
                  image={property1}
                  title="Modern Villa"
                  location="Abuja, FCT Nigeria"
                  description="Experience modern elegance in this stunning luxury home, where sophisticated design meets ultimate comfort. Featuring expansive living spaces, fully furnished and secure living space."
                  price="Starting Price: ₦300 Million"
                  onInquire={() => handleInquire("Modern Villa")}
                />
                <PropertyCard
                  image={property2}
                  title="Luxury Penthouse"
                  location="Abuja, FCT Nigeria"
                  description="Experience modern elegance in this stunning luxury home, where sophisticated design meets ultimate comfort. Featuring panoramic views, a private pool, and smart home amenities."
                  price="Starting Price: ₦300 Million"
                  onInquire={() => handleInquire("Luxury Penthouse")}
                />
                <PropertyCard
                  image={property3}
                  title="Executive Estate"
                  location="Abuja, FCT Nigeria"
                  description="Experience modern elegance in this stunning luxury home, where sophisticated design meets ultimate comfort. Featuring seamless indoor-outdoor flow, every detail is crafted to perfection."
                  price="Starting Price: ₦300 Million"
                  onInquire={() => handleInquire("Executive Estate")}
                />
              </>
            )}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 px-4 bg-secondary/30">
        <div className="max-w-4xl mx-auto text-center space-y-6 animate-fade-in">
          <h2 className="text-4xl md:text-5xl font-playfair font-bold">
            {websiteContent.about.title}
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            {websiteContent.about.description}
          </p>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 animate-fade-in">
            <h2 className="text-4xl md:text-5xl font-playfair font-bold mb-4">
              Our <span className="text-gold">Expertise</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Comprehensive real estate solutions tailored to your needs
            </p>
          </div>

          <div className="luxury-card p-8 mb-8 animate-slide-up">
            <p className="text-lg text-center leading-relaxed">
              We deliver premium residential solutions: design, construction, property development, 
              remodeling, finishing, and bespoke furnishings — all executed with top-tier excellence.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {websiteContent.services && websiteContent.services.length > 0 ? (
              websiteContent.services.map((service: any, idx: number) => (
                <div key={service.id} className="luxury-card p-6 space-y-4 animate-slide-up" style={{ animationDelay: `${idx * 0.1}s` }}>
                  <h3 className="text-2xl font-playfair font-semibold text-gold">{service.title}</h3>
                  <p className="text-muted-foreground">{service.description}</p>
                </div>
              ))
            ) : (
              <>
                <div className="luxury-card p-6 space-y-4 animate-slide-up">
                  <h3 className="text-2xl font-playfair font-semibold text-gold">Buying & Selling</h3>
                  <p className="text-muted-foreground">
                    Seamless property transactions with expert guidance throughout your journey to homeownership.
                  </p>
                </div>
                <div className="luxury-card p-6 space-y-4 animate-slide-up" style={{ animationDelay: "0.1s" }}>
                  <h3 className="text-2xl font-playfair font-semibold text-gold">Renting</h3>
                  <p className="text-muted-foreground">
                    Curated residential options to fit your lifestyle, from luxury apartments to executive estates.
                  </p>
                </div>
                <div className="luxury-card p-6 space-y-4 animate-slide-up" style={{ animationDelay: "0.2s" }}>
                  <h3 className="text-2xl font-playfair font-semibold text-gold">Property Management</h3>
                  <p className="text-muted-foreground">
                    Hassle-free management for your valuable assets with dedicated professional oversight.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Furniture Section */}
      <section id="furniture" className="py-20 px-4 bg-secondary/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 animate-fade-in">
            <h2 className="text-4xl md:text-5xl font-playfair font-bold mb-4">
              Luxury <span className="text-gold">Furniture</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Premium furniture pieces to complement your luxury living
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {websiteContent.furniture && websiteContent.furniture.length > 0 ? (
              websiteContent.furniture.map((item: any) => (
                <PropertyCard
                  key={item.id}
                  image={item.images?.[0] || item.image || furniture1}
                  title={item.title}
                  location={item.location}
                  description={item.description}
                  price={item.price}
                  onInquire={() => handleInquire(item.title)}
                />
              ))
            ) : (
              <>
                <PropertyCard
                  image={furniture1}
                  title="Comfortable Twin Set Bed"
                  location="Abuja, FCT Nigeria"
                  description="Experience ultimate comfort with this luxurious twin set bed, crafted with premium materials and elegant design to transform your bedroom into a sanctuary of relaxation."
                  price="Starting Price: ₦2.5 Million"
                  onInquire={() => handleInquire("Comfortable Twin Set Bed")}
                />
                <PropertyCard
                  image={furniture2}
                  title="Royalty Dining Set"
                  location="Abuja, FCT Nigeria"
                  description="Elevate your dining experience with this exquisite royalty dining set, featuring sophisticated craftsmanship and timeless elegance perfect for hosting memorable gatherings."
                  price="Starting Price: ₦2.5 Million"
                  onInquire={() => handleInquire("Royalty Dining Set")}
                />
                <PropertyCard
                  image={furniture3}
                  title="Exquisite Luxury Cushions"
                  location="Abuja, FCT Nigeria"
                  description="Add a touch of opulence to your living space with these exquisite luxury cushions, meticulously designed with premium fabrics to provide both comfort and aesthetic appeal."
                  price="Starting Price: ₦2.5 Million"
                  onInquire={() => handleInquire("Exquisite Luxury Cushions")}
                />
              </>
            )}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <ContactForm contactInfo={websiteContent.contact} />

      {/* Footer */}
      <footer className="bg-secondary/30 border-t border-border py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <img src={wslLogo} alt="WSL Realty" className="w-10 h-10" />
                <h3 className="text-xl font-playfair font-bold">
                  WSL Realty
                </h3>
              </div>
              <p className="text-muted-foreground">
                Where luxury finds a home in Abuja, Nigeria
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Quick Links</h4>
              <div className="space-y-2">
                <button onClick={() => scrollToSection("properties")} className="block hover:text-gold transition-smooth">Properties</button>
                <button onClick={() => scrollToSection("about")} className="block hover:text-gold transition-smooth">About</button>
                <button onClick={() => scrollToSection("services")} className="block hover:text-gold transition-smooth">Services</button>
                <button onClick={() => scrollToSection("furniture")} className="block hover:text-gold transition-smooth">Furniture</button>
                <button onClick={() => scrollToSection("contact")} className="block hover:text-gold transition-smooth">Contact</button>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Connect With Us</h4>
              <div className="flex gap-4 mb-4">
                <a 
                  href="https://www.facebook.com/share/16ezTSxtsu/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-gold rounded-full flex items-center justify-center hover:bg-gold-light transition-smooth"
                >
                  <Facebook className="w-5 h-5 text-charcoal" />
                </a>
                <a 
                  href="https://www.instagram.com/wslrealty?igsh=ejlheWszYzJ2b2pz" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-gold rounded-full flex items-center justify-center hover:bg-gold-light transition-smooth"
                >
                  <Instagram className="w-5 h-5 text-charcoal" />
                </a>
                <a 
                  href="tel:+2349010883999"
                  className="w-10 h-10 bg-gold rounded-full flex items-center justify-center hover:bg-gold-light transition-smooth"
                >
                  <Phone className="w-5 h-5 text-charcoal" />
                </a>
              </div>
              <p className="text-sm text-muted-foreground">
                {websiteContent.contact.email}
              </p>
            </div>
          </div>
          
          <div className="border-t border-border pt-8 text-center text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} WSL Realty. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
