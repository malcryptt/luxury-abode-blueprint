import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Phone, Mail, MapPin } from "lucide-react";
import { z } from "zod";

const contactSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  email: z.string().trim().email("Invalid email address").max(255, "Email must be less than 255 characters"),
  phone: z.string().trim().min(10, "Phone number is required").max(20, "Phone number must be less than 20 characters"),
  message: z.string().trim().min(1, "Message is required").max(1000, "Message must be less than 1000 characters"),
});

interface ContactFormProps {
  contactInfo?: {
    phone: string;
    email: string;
    address: string;
    whatsapp: string;
  };
}

const ContactForm = ({ contactInfo }: ContactFormProps) => {
  const info = contactInfo || {
    phone: "+234 901 088 3999",
    email: "mailwaro.online@gmail.com",
    address: "Gwarinpa, 900108, FCT Nigeria",
    whatsapp: "2349010883999",
  };
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const validatedData = contactSchema.parse(formData);
      
      const whatsappMessage = encodeURIComponent(
        `New Inquiry from WSL Realty Website\n\nName: ${validatedData.name}\nEmail: ${validatedData.email}\nPhone: ${validatedData.phone}\n\nMessage:\n${validatedData.message}`
      );
      
      window.open(`https://wa.me/${info.whatsapp}?text=${whatsappMessage}`, "_blank");
      
      toast.success("Message sent! We'll get back to you soon.");
      setFormData({ name: "", email: "", phone: "", message: "" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.errors[0];
        toast.error(firstError.message);
      } else {
        toast.error("Failed to send message. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="contact" className="py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12 animate-fade-in">
          <h2 className="text-4xl md:text-5xl font-playfair font-bold mb-4">
            Get in <span className="text-gold">Touch</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Ready to find your dream home? Contact us today.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-12">
          <div className="space-y-6 animate-slide-up">
            <div className="luxury-card p-6">
              <h3 className="text-xl font-playfair font-semibold mb-6">Contact Information</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <Phone className="w-5 h-5 text-gold mt-1" />
                  <div>
                    <p className="font-semibold">Phone</p>
                    <a href={`tel:${info.phone.replace(/\s/g, '')}`} className="text-muted-foreground hover:text-gold transition-smooth">
                      {info.phone}
                    </a>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <Mail className="w-5 h-5 text-gold mt-1" />
                  <div>
                    <p className="font-semibold">Email</p>
                    <a href={`mailto:${info.email}`} className="text-muted-foreground hover:text-gold transition-smooth">
                      {info.email}
                    </a>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <MapPin className="w-5 h-5 text-gold mt-1" />
                  <div>
                    <p className="font-semibold">Address</p>
                    <p className="text-muted-foreground">{info.address}</p>
                  </div>
                </div>
              </div>
            </div>

            <Button 
              onClick={() => window.open(`https://wa.me/${info.whatsapp}`, "_blank")}
              className="w-full bg-gold hover:bg-gold-light text-charcoal font-semibold py-6 text-lg transition-smooth"
            >
              Quick WhatsApp Contact
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 animate-slide-up">
            <div className="luxury-card p-6 space-y-4">
              <Input
                placeholder="Your Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                maxLength={100}
                className="bg-secondary border-border focus:border-gold"
              />
              <Input
                type="email"
                placeholder="Email Address"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                maxLength={255}
                className="bg-secondary border-border focus:border-gold"
              />
              <Input
                type="tel"
                placeholder="Phone Number"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
                maxLength={20}
                className="bg-secondary border-border focus:border-gold"
              />
              <Textarea
                placeholder="Your Message / Inquiry"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                required
                maxLength={1000}
                rows={5}
                className="bg-secondary border-border focus:border-gold resize-none"
              />
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full bg-gold hover:bg-gold-light text-charcoal font-semibold py-6 transition-smooth"
              >
                {isSubmitting ? "Sending..." : "Send Message"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
};

export default ContactForm;
