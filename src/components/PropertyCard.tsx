import { Button } from "@/components/ui/button";
import { MapPin } from "lucide-react";

interface PropertyCardProps {
  image: string;
  title: string;
  location: string;
  description: string;
  price: string;
  onInquire: () => void;
}

const PropertyCard = ({ image, title, location, description, price, onInquire }: PropertyCardProps) => {
  return (
    <div className="luxury-card overflow-hidden group">
      <div className="relative h-64 overflow-hidden">
        <img 
          src={image} 
          alt={title} 
          className="w-full h-full object-cover transition-smooth group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
      </div>
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-2 text-gold text-sm">
          <MapPin className="w-4 h-4" />
          <span>{location}</span>
        </div>
        <h3 className="text-2xl font-playfair font-semibold">{title}</h3>
        <p className="text-muted-foreground leading-relaxed">{description}</p>
        <div className="pt-4 border-t border-border">
          <p className="text-gold font-semibold text-lg mb-4">{price}</p>
          <Button 
            onClick={onInquire}
            className="w-full bg-gold hover:bg-gold-light text-charcoal font-semibold transition-smooth"
          >
            Inquire Now
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PropertyCard;
