import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { 
  Store, MapPin, Package, ArrowRight, ArrowLeft, Check, 
  Sparkles, Building2, Leaf, ShoppingBag
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AmbientBackground } from "@/components/AmbientBackground";
import { useToast } from "@/hooks/use-toast";
import { PageTransition, staggerItem, appleEasing } from "@/components/PageTransition";

type Step = "business" | "location" | "products" | "complete";

const stepVariants = {
  initial: { opacity: 0, x: 60, scale: 0.98 },
  enter: { 
    opacity: 1, 
    x: 0,
    scale: 1,
    transition: { 
      duration: 0.45, 
      ease: appleEasing,
      staggerChildren: 0.05,
      delayChildren: 0.08
    }
  },
  exit: { 
    opacity: 0, 
    x: -60,
    scale: 0.98,
    transition: { duration: 0.3, ease: appleEasing }
  }
};

const productCategories = [
  { id: "vegetables", label: "Vegetables", icon: Leaf },
  { id: "fruits", label: "Fruits", icon: Package },
  { id: "grains", label: "Grains & Pulses", icon: ShoppingBag },
  { id: "dairy", label: "Dairy Products", icon: Store },
  { id: "spices", label: "Spices", icon: Package },
  { id: "other", label: "Other", icon: Building2 }
];

const popularMandis = [
  "Azadpur Mandi, Delhi",
  "Vashi APMC, Mumbai",
  "KR Market, Bangalore",
  "Koyambedu Market, Chennai",
  "Gultekdi Market, Pune",
  "Bowenpally Market, Hyderabad"
];

export default function Onboarding() {
  const [step, setStep] = useState<Step>("business");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile, updateProfile } = useProfile();

  // Form data
  const [businessName, setBusinessName] = useState("");
  const [mandiLocation, setMandiLocation] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
      }
    };
    checkAuth();
  }, [navigate]);

  useEffect(() => {
    if (profile) {
      if (profile.business_name) setBusinessName(profile.business_name);
      if (profile.mandi_location) setMandiLocation(profile.mandi_location);
      if (profile.product_categories) setSelectedCategories(profile.product_categories);
    }
  }, [profile]);

  const handleCategoryToggle = (categoryId: string) => {
    setSelectedCategories(prev => 
      prev.includes(categoryId)
        ? prev.filter(c => c !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleNext = async () => {
    if (step === "business") {
      if (!businessName.trim()) {
        toast({
          title: "Business name required",
          description: "Please enter your business or shop name",
          variant: "destructive"
        });
        return;
      }
      setStep("location");
    } else if (step === "location") {
      if (!mandiLocation.trim()) {
        toast({
          title: "Location required",
          description: "Please enter your primary mandi location",
          variant: "destructive"
        });
        return;
      }
      setStep("products");
    } else if (step === "products") {
      if (selectedCategories.length === 0) {
        toast({
          title: "Select at least one category",
          description: "Please select the products you sell",
          variant: "destructive"
        });
        return;
      }
      
      setIsLoading(true);
      const result = await updateProfile({
        business_name: businessName,
        mandi_location: mandiLocation,
        product_categories: selectedCategories
      });
      setIsLoading(false);

      if (result.success) {
        setStep("complete");
      }
    }
  };

  const handleBack = () => {
    if (step === "location") setStep("business");
    else if (step === "products") setStep("location");
  };

  const handleComplete = () => {
    navigate("/");
  };

  const stepProgress = {
    business: 1,
    location: 2,
    products: 3,
    complete: 4
  };

  return (
    <PageTransition>
      <div className="min-h-screen flex flex-col bg-background grain-overlay relative overflow-hidden">
        <AmbientBackground />
        
        {/* Header */}
        <motion.header 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: appleEasing }}
          className="relative z-20 px-6 py-5 flex items-center justify-between"
        >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-lg">म</span>
          </div>
          <div className="hidden sm:block">
            <span className="font-bold text-lg text-foreground">Multilingual Mandi</span>
          </div>
        </div>
          
          {/* Progress Indicator */}
          <div className="flex items-center gap-2">
            {[1, 2, 3].map(i => (
              <motion.div
                key={i}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: stepProgress[step] >= i ? 1 : 0.3 }}
                transition={{ duration: 0.4, ease: appleEasing }}
                className={cn(
                  "w-8 h-1.5 rounded-full origin-left",
                  stepProgress[step] >= i ? "bg-primary" : "bg-muted"
                )}
              />
            ))}
          </div>
        </motion.header>

        {/* Main Content */}
        <main className="flex-1 flex items-center justify-center px-6 py-8 relative z-10">
          <AnimatePresence mode="wait">
            {/* =================== BUSINESS NAME STEP =================== */}
            {step === "business" && (
              <motion.div
                key="business"
                variants={stepVariants}
                initial="initial"
                animate="enter"
                exit="exit"
                className="w-full max-w-md"
              >
                <div className="glass-card-elevated p-8">
                  <motion.div variants={staggerItem} className="text-center mb-8">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <Store className="w-8 h-8 text-primary" />
                    </div>
                    <h2 className="text-2xl font-bold text-foreground mb-2">
                      What's your business name?
                    </h2>
                    <p className="text-muted-foreground">
                      This helps buyers find and recognize you
                    </p>
                  </motion.div>

                  <motion.div variants={staggerItem} className="mb-6">
                    <input
                      type="text"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="e.g., Sharma Fresh Vegetables"
                      className={cn(
                        "w-full px-4 py-4 rounded-xl text-lg",
                        "bg-muted/30 border border-border",
                        "text-foreground placeholder:text-muted-foreground",
                        "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary",
                        "transition-all"
                      )}
                      autoFocus
                    />
                  </motion.div>

                  <motion.button
                    variants={staggerItem}
                    onClick={handleNext}
                    className={cn(
                      "w-full flex items-center justify-center gap-3 py-4 rounded-2xl",
                      "bg-primary text-primary-foreground font-bold text-lg",
                      "shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30",
                      "active:scale-[0.98] transition-all tap-feedback"
                    )}
                  >
                    <span>Continue</span>
                    <ArrowRight size={20} />
                  </motion.button>
                </div>
              </motion.div>
            )}

            {/* =================== LOCATION STEP =================== */}
            {step === "location" && (
              <motion.div
                key="location"
                variants={stepVariants}
                initial="initial"
                animate="enter"
                exit="exit"
                className="w-full max-w-md"
              >
                <div className="glass-card-elevated p-8">
                  <motion.div variants={staggerItem} className="text-center mb-8">
                    <div className="w-16 h-16 rounded-2xl bg-success/10 flex items-center justify-center mx-auto mb-4">
                      <MapPin className="w-8 h-8 text-success" />
                    </div>
                    <h2 className="text-2xl font-bold text-foreground mb-2">
                      Where do you sell?
                    </h2>
                    <p className="text-muted-foreground">
                      Your primary mandi or market location
                    </p>
                  </motion.div>

                  <motion.div variants={staggerItem} className="mb-4">
                    <input
                      type="text"
                      value={mandiLocation}
                      onChange={(e) => setMandiLocation(e.target.value)}
                      placeholder="Enter your mandi location"
                      className={cn(
                        "w-full px-4 py-4 rounded-xl text-lg",
                        "bg-muted/30 border border-border",
                        "text-foreground placeholder:text-muted-foreground",
                        "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary",
                        "transition-all"
                      )}
                      autoFocus
                    />
                  </motion.div>

                  {/* Popular Mandis */}
                  <motion.div variants={staggerItem} className="mb-6">
                    <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                      Popular Mandis
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {popularMandis.map(mandi => (
                        <button
                          key={mandi}
                          onClick={() => setMandiLocation(mandi)}
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                            mandiLocation === mandi
                              ? "bg-primary text-primary-foreground scale-105"
                              : "bg-muted/50 text-foreground hover:bg-muted"
                          )}
                        >
                          {mandi.split(",")[0]}
                        </button>
                      ))}
                    </div>
                  </motion.div>

                  <motion.div variants={staggerItem} className="flex gap-3">
                    <button
                      onClick={handleBack}
                      className={cn(
                        "flex items-center justify-center gap-2 px-6 py-4 rounded-2xl",
                        "bg-muted text-foreground font-semibold",
                        "hover:bg-muted/80 transition-colors tap-feedback"
                      )}
                    >
                      <ArrowLeft size={18} />
                    </button>
                    <button
                      onClick={handleNext}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-3 py-4 rounded-2xl",
                        "bg-primary text-primary-foreground font-bold text-lg",
                        "shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30",
                        "active:scale-[0.98] transition-all tap-feedback"
                      )}
                    >
                      <span>Continue</span>
                      <ArrowRight size={20} />
                    </button>
                  </motion.div>
                </div>
              </motion.div>
            )}

            {/* =================== PRODUCTS STEP =================== */}
            {step === "products" && (
              <motion.div
                key="products"
                variants={stepVariants}
                initial="initial"
                animate="enter"
                exit="exit"
                className="w-full max-w-md"
              >
                <div className="glass-card-elevated p-8">
                  <motion.div variants={staggerItem} className="text-center mb-8">
                    <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
                      <Package className="w-8 h-8 text-amber-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-foreground mb-2">
                      What do you sell?
                    </h2>
                    <p className="text-muted-foreground">
                      Select all product categories that apply
                    </p>
                  </motion.div>

                  <motion.div variants={staggerItem} className="grid grid-cols-2 gap-3 mb-6">
                    {productCategories.map(category => {
                      const isSelected = selectedCategories.includes(category.id);
                      const Icon = category.icon;
                      
                      return (
                        <motion.button
                          key={category.id}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => handleCategoryToggle(category.id)}
                          className={cn(
                            "relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                            isSelected
                              ? "border-primary bg-primary/5"
                              : "border-border bg-muted/20 hover:border-primary/50"
                          )}
                        >
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                            isSelected ? "bg-primary/20" : "bg-muted"
                          )}>
                            <Icon className={cn(
                              "w-5 h-5",
                              isSelected ? "text-primary" : "text-muted-foreground"
                            )} />
                          </div>
                          <span className={cn(
                            "font-medium text-sm",
                            isSelected ? "text-primary" : "text-foreground"
                          )}>
                            {category.label}
                          </span>
                          {isSelected && (
                            <motion.div 
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="absolute top-2 right-2"
                            >
                              <Check size={16} className="text-primary" />
                            </motion.div>
                          )}
                        </motion.button>
                      );
                    })}
                  </motion.div>

                  <motion.div variants={staggerItem} className="flex gap-3">
                    <button
                      onClick={handleBack}
                      className={cn(
                        "flex items-center justify-center gap-2 px-6 py-4 rounded-2xl",
                        "bg-muted text-foreground font-semibold",
                        "hover:bg-muted/80 transition-colors tap-feedback"
                      )}
                    >
                      <ArrowLeft size={18} />
                    </button>
                    <button
                      onClick={handleNext}
                      disabled={isLoading}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-3 py-4 rounded-2xl",
                        "bg-primary text-primary-foreground font-bold text-lg",
                        "shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30",
                        "active:scale-[0.98] transition-all tap-feedback",
                        "disabled:opacity-60 disabled:cursor-not-allowed"
                      )}
                    >
                      {isLoading ? (
                        <div className="w-6 h-6 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      ) : (
                        <>
                          <span>Complete Setup</span>
                          <Check size={20} />
                        </>
                      )}
                    </button>
                  </motion.div>
                </div>
              </motion.div>
            )}

            {/* =================== COMPLETE STEP =================== */}
            {step === "complete" && (
              <motion.div
                key="complete"
                variants={stepVariants}
                initial="initial"
                animate="enter"
                exit="exit"
                className="w-full max-w-md"
              >
                <div className="glass-card-elevated p-8 text-center">
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                    className="w-20 h-20 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-6"
                  >
                    <Check className="w-10 h-10 text-success" />
                  </motion.div>

                  <motion.h2 
                    variants={staggerItem}
                    className="text-2xl font-bold text-foreground mb-2"
                  >
                    You're all set! 🎉
                  </motion.h2>
                  <motion.p 
                    variants={staggerItem}
                    className="text-muted-foreground mb-8"
                  >
                    Start discovering fair prices and connecting with buyers.
                  </motion.p>

                  <motion.div variants={staggerItem} className="glass-card p-4 mb-6 text-left">
                    <div className="flex items-center gap-3 mb-3">
                      <Sparkles className="w-5 h-5 text-primary" />
                      <span className="font-semibold text-foreground">Your Profile</span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <p><span className="text-muted-foreground">Business:</span> <span className="font-medium">{businessName}</span></p>
                      <p><span className="text-muted-foreground">Location:</span> <span className="font-medium">{mandiLocation}</span></p>
                      <p><span className="text-muted-foreground">Products:</span> <span className="font-medium">{selectedCategories.length} categories</span></p>
                    </div>
                  </motion.div>

                  <motion.button
                    variants={staggerItem}
                    onClick={handleComplete}
                    className={cn(
                      "w-full flex items-center justify-center gap-3 py-4 rounded-2xl",
                      "bg-primary text-primary-foreground font-bold text-lg",
                      "shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30",
                      "active:scale-[0.98] transition-all tap-feedback"
                    )}
                  >
                    <span>Start Exploring</span>
                    <ArrowRight size={20} />
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </PageTransition>
  );
}
