import { TrendingUp, MapPin, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface PriceCardProps {
  productName: string;
  minPrice: number;
  maxPrice: number;
  suggestedPrice: number;
  confidence: "high" | "medium" | "low";
  nearbyMarket?: string;
  nearbyPrice?: number;
  className?: string;
}

const confidenceConfig = {
  high: { label: "Highly reliable", color: "text-success", bg: "bg-success/10", border: "border-success/20" },
  medium: { label: "Fairly reliable", color: "text-primary", bg: "bg-primary/10", border: "border-primary/20" }, 
  low: { label: "Approximate", color: "text-muted-foreground", bg: "bg-muted", border: "border-border" }
};

export function PriceCard({
  productName,
  minPrice,
  maxPrice,
  suggestedPrice,
  confidence,
  nearbyMarket,
  nearbyPrice,
  className
}: PriceCardProps) {
  const priceRange = maxPrice - minPrice;
  const suggestedPosition = ((suggestedPrice - minPrice) / priceRange) * 100;
  const { label: confidenceLabel, color, bg, border } = confidenceConfig[confidence];

  return (
    <div className={cn("glass-card-elevated p-7 sm:p-8 slide-up", className)}>
      {/* Product Name & Confidence */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">{productName}</h2>
        <div className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold shrink-0",
          bg, color, "border", border
        )}>
          <CheckCircle size={12} />
          <span>{confidenceLabel}</span>
        </div>
      </div>

      {/* Main Price Display - Hero */}
      <div className="mb-10">
        <p className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide">Best selling price</p>
        <div className="flex items-baseline gap-2">
          <span className="text-6xl sm:text-7xl font-bold gradient-text-primary tracking-tighter">
            ₹{suggestedPrice}
          </span>
          <span className="text-xl font-medium text-muted-foreground">
            /kg
          </span>
        </div>
      </div>

      {/* Price Range Visualization - Premium */}
      <div className="mb-8 p-5 rounded-2xl bg-muted/30 border border-border/40">
        <div className="flex justify-between text-sm font-semibold text-muted-foreground mb-4">
          <span>₹{minPrice}</span>
          <span className="text-xs font-medium text-muted-foreground/60 uppercase tracking-wider">Market range</span>
          <span>₹{maxPrice}</span>
        </div>
        <div className="relative h-3 bg-gradient-to-r from-muted via-muted/50 to-muted rounded-full overflow-hidden">
          {/* Gradient track */}
          <div 
            className="absolute inset-y-0 rounded-full"
            style={{
              left: '10%',
              right: '10%',
              background: `linear-gradient(90deg, 
                hsl(var(--primary) / 0.15) 0%, 
                hsl(var(--primary) / 0.4) 25%,
                hsl(var(--primary)) 50%, 
                hsl(var(--primary) / 0.4) 75%,
                hsl(var(--primary) / 0.15) 100%
              )`
            }}
          />
          {/* Suggested price indicator */}
          <div 
            className="absolute top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-primary shadow-lg shadow-primary/40 transition-all duration-700 ease-out"
            style={{ 
              left: `calc(${suggestedPosition}% - 12px)`,
              boxShadow: '0 0 0 4px hsl(var(--background)), 0 4px 16px hsl(var(--primary) / 0.4)'
            }}
          >
            <div className="absolute inset-1 rounded-full bg-primary-foreground/30" />
          </div>
        </div>
      </div>

      {/* Nearby Market Comparison - If available */}
      {nearbyMarket && nearbyPrice && (
        <div className="flex items-center gap-4 p-5 rounded-2xl bg-secondary/40 border border-border/40">
          <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0">
            <MapPin size={20} className="text-secondary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-muted-foreground font-medium">{nearbyMarket}</p>
            <p className="text-xl font-bold text-foreground">₹{nearbyPrice}/kg</p>
          </div>
          {nearbyPrice > suggestedPrice && (
            <div className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-success/10 text-success text-sm font-bold border border-success/20">
              <TrendingUp size={16} />
              <span>+₹{nearbyPrice - suggestedPrice}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
