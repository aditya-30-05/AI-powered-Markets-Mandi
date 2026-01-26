import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Mic, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { GuidedVoiceForm } from "@/components/GuidedVoiceForm";
import { PriceInsightsPage } from "@/components/PriceInsightsPage";
import { PageTransition } from "@/components/PageTransition";
import { Header } from "@/components/Header";
import { FormData } from "@/services/guidedVoiceService";
import { useMandiAI } from "@/hooks/useMandiAI";
import { toast } from "@/hooks/use-toast";

type ViewState = "intro" | "guided-voice" | "processing" | "price-insights";

export default function GuidedVoiceDemo() {
  const navigate = useNavigate();
  const [view, setView] = useState<ViewState>("intro");
  const [formData, setFormData] = useState<FormData | null>(null);
  const { state: aiState, processRequest } = useMandiAI();

  const handleStartGuidedVoice = () => {
    setView("guided-voice");
  };

  const handleGuidedVoiceComplete = async (data: FormData) => {
    console.log('Guided Voice Form completed with data:', data);
    setFormData(data);
    setView("processing");

    try {
      // Process the form data through AI service
      await processRequest({
        productName: data.product,
        location: data.location,
        quantity: data.quantity,
        vendorLanguage: data.language,
        buyerMessage: `I want to buy ${data.quantity} of ${data.product}${data.quality ? ` of ${data.quality} quality` : ""}. What's your best price?`
      });

      // Automatically redirect to price insights
      setTimeout(() => {
        setView("price-insights");
        toast({
          title: "Price Analysis Complete! 📊",
          description: "Your market insights are ready",
        });
      }, 1000);

    } catch (error) {
      console.error('AI processing failed:', error);
      toast({
        title: "Processing Failed",
        description: "Unable to get price insights. Please try again.",
        variant: "destructive"
      });
      setView("guided-voice");
    }
  };

  const handleGuidedVoiceCancel = () => {
    setView("intro");
  };

  const handleBackToPriceInsights = () => {
    setView("price-insights");
  };

  const handleBackToHome = () => {
    navigate("/");
  };

  return (
    <PageTransition>
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        
        <main className="flex-1 px-4 sm:px-6 py-6 max-w-4xl mx-auto w-full">
          <AnimatePresence mode="wait">
            {/* =================== INTRO VIEW =================== */}
            {view === "intro" && (
              <motion.div
                key="intro"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="text-center max-w-2xl mx-auto"
              >
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                  <button 
                    onClick={handleBackToHome}
                    className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
                    title="Back to Home"
                  >
                    <ArrowLeft size={20} className="text-foreground" />
                  </button>
                  <div className="text-left">
                    <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Guided Voice Demo</h1>
                    <p className="text-muted-foreground">
                      Experience the 7-step voice-guided form with automatic redirection
                    </p>
                  </div>
                </div>

                {/* Demo Description */}
                <div className="glass-card p-8 mb-8">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
                    <Mic size={24} className="text-primary" />
                  </div>
                  
                  <h2 className="text-xl font-bold text-foreground mb-4">
                    7-Step Guided Voice Form
                  </h2>
                  
                  <p className="text-muted-foreground mb-6">
                    This demo showcases our advanced voice-guided form that takes users through 
                    7 structured steps and automatically redirects to Price Insights upon completion.
                  </p>

                  {/* Steps Preview */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6 text-left">
                    {[
                      { step: 1, title: "Name", description: "Your name" },
                      { step: 2, title: "Product", description: "What you're selling" },
                      { step: 3, title: "Quantity", description: "How much" },
                      { step: 4, title: "Quality", description: "Product quality" },
                      { step: 5, title: "Location", description: "Your location" },
                      { step: 6, title: "Confirmation", description: "Review details" },
                      { step: 7, title: "Auto-Redirect", description: "→ Price Insights" }
                    ].map((item) => (
                      <div key={item.step} className="flex items-center gap-3 p-3 rounded-lg bg-muted/20">
                        <div className="w-8 h-8 rounded-full bg-primary/20 text-primary font-bold text-sm flex items-center justify-center">
                          {item.step === 7 ? "🚀" : item.step}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{item.title}</p>
                          <p className="text-xs text-muted-foreground">{item.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={handleStartGuidedVoice}
                    className={cn(
                      "w-full py-4 rounded-xl font-semibold text-lg transition-colors",
                      "bg-primary text-primary-foreground",
                      "hover:bg-primary/90"
                    )}
                  >
                    Start Guided Voice Demo
                  </button>
                </div>

                {/* Features */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="glass-card p-4 text-center">
                    <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center mx-auto mb-3">
                      🎤
                    </div>
                    <h3 className="font-semibold text-foreground mb-1">Voice-First</h3>
                    <p className="text-sm text-muted-foreground">Speak naturally in your language</p>
                  </div>
                  
                  <div className="glass-card p-4 text-center">
                    <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mx-auto mb-3">
                      🔄
                    </div>
                    <h3 className="font-semibold text-foreground mb-1">State Machine</h3>
                    <p className="text-sm text-muted-foreground">Predictable step-by-step flow</p>
                  </div>
                  
                  <div className="glass-card p-4 text-center">
                    <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center mx-auto mb-3">
                      🚀
                    </div>
                    <h3 className="font-semibold text-foreground mb-1">Auto-Redirect</h3>
                    <p className="text-sm text-muted-foreground">Seamless flow to insights</p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* =================== GUIDED VOICE VIEW =================== */}
            {view === "guided-voice" && (
              <motion.div
                key="guided-voice"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="max-w-2xl mx-auto"
              >
                <GuidedVoiceForm
                  onComplete={handleGuidedVoiceComplete}
                  onCancel={handleGuidedVoiceCancel}
                  autoRedirectToPriceInsights={true}
                />
              </motion.div>
            )}

            {/* =================== PROCESSING VIEW =================== */}
            {view === "processing" && (
              <motion.div
                key="processing"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="text-center max-w-md mx-auto"
              >
                <div className="glass-card p-8">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                  </div>
                  
                  <h2 className="text-xl font-bold text-foreground mb-3">
                    Processing Your Information
                  </h2>
                  
                  <p className="text-muted-foreground mb-6">
                    Analyzing market prices for <span className="font-semibold text-foreground">{formData?.product}</span>
                  </p>

                  {/* Processing Steps */}
                  <div className="space-y-3 text-left">
                    {[
                      { label: "Form data collected", completed: true },
                      { label: "Fetching market prices", completed: true },
                      { label: "Generating AI insights", completed: false },
                      { label: "Preparing visualization", completed: false }
                    ].map((step, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <div className={cn(
                          "w-5 h-5 rounded-full flex items-center justify-center",
                          step.completed ? "bg-success text-white" : "bg-muted"
                        )}>
                          {step.completed ? <CheckCircle size={12} /> : <div className="w-2 h-2 bg-muted-foreground rounded-full" />}
                        </div>
                        <span className={cn(
                          "text-sm",
                          step.completed ? "text-foreground" : "text-muted-foreground"
                        )}>
                          {step.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* =================== PRICE INSIGHTS VIEW =================== */}
            {view === "price-insights" && aiState.response && formData && (
              <motion.div
                key="price-insights"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="w-full"
              >
                <PriceInsightsPage
                  productName={formData.product}
                  productVariant={formData.quality || "Standard"}
                  currentPrice={aiState.response.priceAnalysis.priceRange.average}
                  lowPrice={aiState.response.priceAnalysis.priceRange.low}
                  avgPrice={aiState.response.priceAnalysis.priceRange.average}
                  highPrice={aiState.response.priceAnalysis.priceRange.high}
                  priceChange={8.4}
                  marketPosition="good"
                  onStartNegotiation={() => {
                    toast({
                      title: "Negotiation Feature",
                      description: "This would start the negotiation flow",
                    });
                  }}
                  onBack={() => setView("intro")}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </PageTransition>
  );
}