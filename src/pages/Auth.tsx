import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { 
  Globe, Shield, TrendingUp, ArrowRight, ArrowLeft, Check, 
  Eye, EyeOff, Mic, Sparkles, Users, MapPin
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AmbientBackground } from "@/components/AmbientBackground";
import { useToast } from "@/hooks/use-toast";
import { PageTransition, staggerItem, appleEasing } from "@/components/PageTransition";

type AuthMode = "welcome" | "signup" | "login";

const cardVariants = {
  initial: { opacity: 0, y: 24, scale: 0.97 },
  enter: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { 
      duration: 0.5, 
      ease: appleEasing,
      staggerChildren: 0.06,
      delayChildren: 0.1
    }
  },
  exit: { 
    opacity: 0, 
    y: -16, 
    scale: 0.98,
    transition: { duration: 0.3, ease: appleEasing }
  }
};

// Trust badges data
const trustBadges = [
  { icon: Users, label: "2.4L+ Vendors", sublabel: "Already registered" },
  { icon: MapPin, label: "890+ Mandis", sublabel: "Connected nationwide" },
  { icon: TrendingUp, label: "₹12Cr+", sublabel: "Daily trade volume" }
];

export default function Auth() {
  const [mode, setMode] = useState<AuthMode>("welcome");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Form data
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/");
      }
    };
    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        navigate("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignup = async () => {
    if (!email || !password) {
      toast({
        title: "Missing information",
        description: "Please enter your email and password",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          full_name: name,
          phone: phone
        }
      }
    });

    setIsLoading(false);

    if (error) {
      toast({
        title: "Sign up failed",
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Welcome to Multilingual Mandi!",
        description: "Let's set up your vendor profile."
      });
      navigate("/onboarding");
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      toast({
        title: "Missing information",
        description: "Please enter your email and password",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    setIsLoading(false);

    if (error) {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive"
      });
    }
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
            <p className="text-xs text-muted-foreground -mt-0.5">Fair prices, every language</p>
          </div>
        </div>
          
          {mode === "welcome" && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              onClick={() => setMode("login")}
              className={cn(
                "px-5 py-2.5 rounded-xl border border-border",
                "text-foreground font-medium text-sm",
                "hover:bg-muted/50 transition-colors tap-feedback"
              )}
            >
              Portal Login
            </motion.button>
          )}
          
          {mode !== "welcome" && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={() => setMode("welcome")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl",
                "text-muted-foreground hover:text-foreground",
                "transition-colors tap-feedback"
              )}
            >
              <ArrowLeft size={18} />
              <span className="font-medium">Back</span>
            </motion.button>
          )}
        </motion.header>

        {/* Main Content */}
        <main className="flex-1 flex items-center justify-center px-6 py-8 relative z-10">
          <AnimatePresence mode="wait">
            {/* =================== WELCOME VIEW =================== */}
            {mode === "welcome" && (
              <motion.div
                key="welcome"
                variants={cardVariants}
                initial="initial"
                animate="enter"
                exit="exit"
                className="w-full max-w-md"
              >
                <div className="glass-card-elevated p-8 text-center">
                  {/* Badge Icon */}
                  <motion.div variants={staggerItem} className="flex justify-center mb-6">
                    <div className="relative">
                      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                        <Sparkles className="w-10 h-10 text-primary" />
                      </div>
                      <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-success flex items-center justify-center">
                        <Check size={14} className="text-success-foreground" />
                      </div>
                    </div>
                  </motion.div>

                  {/* Hero Text */}
                  <motion.h1 variants={staggerItem} className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
                    Speak Your Language,
                    <br />
                    <span className="gradient-text-primary">Get Fair Prices</span>
                  </motion.h1>
                  
                  <motion.p variants={staggerItem} className="text-muted-foreground mb-8">
                    Real-time mandi prices in Hindi, Tamil, Telugu &amp; more
                  </motion.p>

                  {/* Feature Card */}
                  <motion.div 
                    variants={staggerItem}
                    className="p-4 rounded-2xl bg-muted/30 border border-border/50 mb-6 text-left"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <Mic className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-bold text-foreground mb-1">Voice-First Design</h3>
                        <p className="text-sm text-muted-foreground">
                          Just speak naturally — we understand your language and find fair prices instantly.
                        </p>
                      </div>
                    </div>
                  </motion.div>

                  {/* Primary CTA */}
                  <motion.button
                    variants={staggerItem}
                    onClick={() => setMode("signup")}
                    className={cn(
                      "w-full flex items-center justify-center gap-3 py-4 rounded-2xl",
                      "bg-primary text-primary-foreground font-bold text-lg",
                      "shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30",
                      "active:scale-[0.98] transition-all tap-feedback"
                    )}
                  >
                    <Mic size={20} />
                    <span>Get Started Free</span>
                  </motion.button>

                  {/* Login Link */}
                  <motion.p variants={staggerItem} className="mt-5 text-sm text-muted-foreground">
                    Already a vendor?{" "}
                    <button 
                      onClick={() => setMode("login")}
                      className="font-semibold text-primary hover:underline inline-flex items-center gap-1"
                    >
                      Login here <ArrowRight size={14} />
                    </button>
                  </motion.p>

                  {/* Trust Badge */}
                  <motion.div variants={staggerItem} className="mt-8 pt-6 border-t border-border/50">
                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                      <Shield size={16} />
                      <span className="text-xs font-medium">
                        Trusted by 2.4 lakh+ vendors across 890+ mandis
                      </span>
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            )}

            {/* =================== SIGNUP VIEW =================== */}
            {mode === "signup" && (
              <motion.div
                key="signup"
                variants={cardVariants}
                initial="initial"
                animate="enter"
                exit="exit"
                className="w-full max-w-md"
              >
                <div className="glass-card-elevated p-8">
                  <motion.div variants={staggerItem} className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-foreground mb-2">
                      Create your account
                    </h2>
                    <p className="text-muted-foreground">
                      Join lakhs of vendors on Multilingual Mandi
                    </p>
                  </motion.div>

                  {/* Name Field */}
                  <motion.div variants={staggerItem} className="mb-4">
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter your full name"
                      className={cn(
                        "w-full px-4 py-3.5 rounded-xl",
                        "bg-muted/30 border border-border",
                        "text-foreground placeholder:text-muted-foreground",
                        "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary",
                        "transition-all"
                      )}
                    />
                  </motion.div>

                  {/* Phone Field */}
                  <motion.div variants={staggerItem} className="mb-4">
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Phone Number (Optional)
                    </label>
                    <div className="flex">
                      <span className="px-4 py-3.5 bg-muted/50 border border-r-0 border-border rounded-l-xl text-muted-foreground font-medium">
                        +91
                      </span>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                        placeholder="10 digit mobile"
                        className={cn(
                          "flex-1 px-4 py-3.5 rounded-r-xl",
                          "bg-muted/30 border border-border",
                          "text-foreground placeholder:text-muted-foreground",
                          "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary",
                          "transition-all"
                        )}
                      />
                    </div>
                  </motion.div>

                  {/* Email Field */}
                  <motion.div variants={staggerItem} className="mb-4">
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="vendor@example.com"
                      className={cn(
                        "w-full px-4 py-3.5 rounded-xl",
                        "bg-muted/30 border border-border",
                        "text-foreground placeholder:text-muted-foreground",
                        "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary",
                        "transition-all"
                      )}
                    />
                  </motion.div>

                  {/* Password Field */}
                  <motion.div variants={staggerItem} className="mb-6">
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Create Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Min 6 characters"
                        className={cn(
                          "w-full px-4 py-3.5 pr-12 rounded-xl",
                          "bg-muted/30 border border-border",
                          "text-foreground placeholder:text-muted-foreground",
                          "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary",
                          "transition-all"
                        )}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                  </motion.div>

                  {/* Submit Button */}
                  <motion.button
                    variants={staggerItem}
                    onClick={handleSignup}
                    disabled={isLoading}
                    className={cn(
                      "w-full flex items-center justify-center gap-3 py-4 rounded-2xl",
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
                        <span>Create Account</span>
                        <ArrowRight size={20} />
                      </>
                    )}
                  </motion.button>

                  {/* Login Link */}
                  <motion.p variants={staggerItem} className="mt-5 text-center text-sm text-muted-foreground">
                    Already have an account?{" "}
                    <button 
                      onClick={() => setMode("login")}
                      className="font-semibold text-primary hover:underline"
                    >
                      Sign in
                    </button>
                  </motion.p>

                  {/* Trust Stats */}
                  <motion.div 
                    variants={staggerItem} 
                    className="mt-8 pt-6 border-t border-border/50 grid grid-cols-3 gap-2"
                  >
                    {trustBadges.map(badge => (
                      <div key={badge.label} className="text-center">
                        <badge.icon size={18} className="mx-auto text-primary mb-1" />
                        <p className="text-xs font-bold text-foreground">{badge.label}</p>
                      </div>
                    ))}
                  </motion.div>
                </div>
              </motion.div>
            )}

            {/* =================== LOGIN VIEW =================== */}
            {mode === "login" && (
              <motion.div
                key="login"
                variants={cardVariants}
                initial="initial"
                animate="enter"
                exit="exit"
                className="w-full max-w-md"
              >
                <div className="glass-card-elevated p-8">
                  <motion.div variants={staggerItem} className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-foreground mb-2">
                      Welcome back
                    </h2>
                    <p className="text-muted-foreground">
                      Sign in to your Multilingual Mandi account
                    </p>
                  </motion.div>

                  {/* Email Field */}
                  <motion.div variants={staggerItem} className="mb-4">
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="vendor@example.com"
                      className={cn(
                        "w-full px-4 py-3.5 rounded-xl",
                        "bg-muted/30 border border-border",
                        "text-foreground placeholder:text-muted-foreground",
                        "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary",
                        "transition-all"
                      )}
                    />
                  </motion.div>

                  {/* Password Field */}
                  <motion.div variants={staggerItem} className="mb-6">
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        className={cn(
                          "w-full px-4 py-3.5 pr-12 rounded-xl",
                          "bg-muted/30 border border-border",
                          "text-foreground placeholder:text-muted-foreground",
                          "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary",
                          "transition-all"
                        )}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                  </motion.div>

                  {/* Submit Button */}
                  <motion.button
                    variants={staggerItem}
                    onClick={handleLogin}
                    disabled={isLoading}
                    className={cn(
                      "w-full flex items-center justify-center gap-3 py-4 rounded-2xl",
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
                        <span>Sign In</span>
                        <ArrowRight size={20} />
                      </>
                    )}
                  </motion.button>

                  {/* Signup Link */}
                  <motion.p variants={staggerItem} className="mt-5 text-center text-sm text-muted-foreground">
                    Don't have an account?{" "}
                    <button 
                      onClick={() => setMode("signup")}
                      className="font-semibold text-primary hover:underline"
                    >
                      Create one
                    </button>
                  </motion.p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </PageTransition>
  );
}
