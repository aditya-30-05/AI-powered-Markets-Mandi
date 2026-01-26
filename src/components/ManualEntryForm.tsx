import { useState } from "react";
import { ChevronDown, MapPin, ArrowRight, Loader2, MapPinOff, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useGeolocation } from "@/hooks/useGeolocation";

interface ManualEntryFormProps {
  onSubmit: (data: { product: string; quantity?: string; quality?: string; location?: string }) => void;
}

export function ManualEntryForm({ onSubmit }: ManualEntryFormProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [product, setProduct] = useState("");
  const [quantity, setQuantity] = useState("");
  const [quality, setQuality] = useState("");
  
  const { 
    loading: locationLoading, 
    error: locationError, 
    locationName, 
    marketName,
    requestLocation,
    hasLocation 
  } = useGeolocation();

  const handleSubmit = () => {
    if (product.trim()) {
      onSubmit({ 
        product, 
        quantity, 
        quality,
        location: locationName || undefined
      });
    }
  };

  return (
    <div className="w-full">
      {/* Expand Toggle */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "w-full flex items-center justify-center gap-2 py-3",
          "text-sm font-medium text-muted-foreground/70 hover:text-muted-foreground",
          "transition-colors duration-200"
        )}
      >
        <span>Prefer detailed entry?</span>
        <ChevronDown 
          size={16} 
          className={cn(
            "transition-transform duration-300",
            isExpanded && "rotate-180"
          )}
        />
      </button>

      {/* Expandable Form */}
      <div 
        className={cn(
          "overflow-hidden transition-all duration-500 ease-out",
          isExpanded ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="glass-card p-6 mt-2 space-y-5">
          {/* Product Field - Required */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Product / Service <span className="text-primary">*</span>
            </label>
            <input
              type="text"
              value={product}
              onChange={(e) => setProduct(e.target.value)}
              placeholder="e.g., Tomatoes, Onions, Rice..."
              className={cn(
                "w-full px-4 py-3 rounded-xl",
                "bg-muted/50 border border-border/60",
                "text-foreground placeholder:text-muted-foreground/50",
                "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30",
                "transition-all duration-200"
              )}
            />
          </div>

          {/* Quantity Field - Optional */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Quantity <span className="text-muted-foreground/60 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="e.g., 50 kg, 100 pieces..."
              className={cn(
                "w-full px-4 py-3 rounded-xl",
                "bg-muted/50 border border-border/60",
                "text-foreground placeholder:text-muted-foreground/50",
                "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30",
                "transition-all duration-200"
              )}
            />
          </div>

          {/* Quality Field - Optional */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Quality <span className="text-muted-foreground/60 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={quality}
              onChange={(e) => setQuality(e.target.value)}
              placeholder="e.g., Fresh, Grade A, Premium..."
              className={cn(
                "w-full px-4 py-3 rounded-xl",
                "bg-muted/50 border border-border/60",
                "text-foreground placeholder:text-muted-foreground/50",
                "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30",
                "transition-all duration-200"
              )}
            />
          </div>

          {/* Location - Auto-detected with real geolocation */}
          <div 
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-300",
              locationLoading && "bg-muted/30 border-border/40",
              hasLocation && "bg-success/8 border-success/15",
              locationError && "bg-destructive/8 border-destructive/15"
            )}
          >
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors",
              locationLoading && "bg-muted",
              hasLocation && "bg-success/15",
              locationError && "bg-destructive/15"
            )}>
              {locationLoading ? (
                <Loader2 size={18} className="text-muted-foreground animate-spin" />
              ) : locationError ? (
                <MapPinOff size={18} className="text-destructive" />
              ) : (
                <MapPin size={18} className="text-success" />
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              {locationLoading ? (
                <>
                  <p className="text-sm font-medium text-foreground">Detecting location...</p>
                  <p className="text-xs text-muted-foreground">Please allow location access</p>
                </>
              ) : locationError ? (
                <>
                  <p className="text-sm font-medium text-foreground">{locationError}</p>
                  <p className="text-xs text-muted-foreground">Tap to try again</p>
                </>
              ) : hasLocation ? (
                <>
                  <p className="text-sm font-medium text-foreground">
                    {locationName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Nearby: <span className="font-medium text-success">{marketName}</span>
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium text-foreground">Location not available</p>
                  <p className="text-xs text-muted-foreground">Tap to detect</p>
                </>
              )}
            </div>

            {/* Retry/Refresh button */}
            {(locationError || !hasLocation) && !locationLoading && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  requestLocation();
                }}
                className={cn(
                  "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                  "bg-muted hover:bg-muted/80",
                  "text-muted-foreground hover:text-foreground",
                  "transition-all duration-200 tap-feedback"
                )}
                aria-label="Retry location detection"
              >
                <RefreshCw size={16} />
              </button>
            )}
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={!product.trim()}
            className={cn(
              "w-full flex items-center justify-center gap-3 py-4 rounded-xl",
              "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground",
              "font-semibold text-base",
              "shadow-lg shadow-primary/20",
              "hover:shadow-xl hover:shadow-primary/25",
              "active:scale-[0.98]",
              "disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none",
              "transition-all duration-200"
            )}
          >
            <span>Find fair price</span>
            <ArrowRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
