import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Header } from "@/components/Header";
import { VoiceButton } from "@/components/VoiceButton";
import { TextInput } from "@/components/TextInput";
import { LanguageBadge } from "@/components/LanguageBadge";
import { AmbientBackground } from "@/components/AmbientBackground";
import { ManualEntryForm } from "@/components/ManualEntryForm";
import { PriceInsightsPage } from "@/components/PriceInsightsPage";
import { NegotiationAssistantPage } from "@/components/NegotiationAssistantPage";
import { ReliableVoiceForm } from "@/components/ReliableVoiceForm";
import { StepIndicator } from "@/components/StepIndicator";
import { PageTransition, pageVariants, staggerItem, appleEasing, slideFromRight } from "@/components/PageTransition";
import { ArrowLeft, Loader2, AlertCircle, Sparkles, Mic } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMandiAI } from "@/hooks/useMandiAI";
import { VoiceFormData } from "@/services/reliableVoiceService";
import { detectLanguage, formatLanguageName } from "@/utils/languageUtils";
import { toast } from "@/hooks/use-toast";

type ViewState = "home" | "reliable-voice" | "listening" | "loading" | "error" | "price" | "negotiation";

const getStepFromView = (view: ViewState): 1 | 2 | 3 => {
  switch (view) {
    case "home":
    case "reliable-voice":
    case "listening":
    case "loading":
    case "error":
      return 1;
    case "price":
      return 2;
    case "negotiation":
      return 3;
  }
};

const Index = () => {
  const [view, setView] = useState<ViewState>("home");
  const [isListening, setIsListening] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [detectedLanguage, setDetectedLanguage] = useState<string | null>(null);
  const [productName, setProductName] = useState("");
  const [currentLocation, setCurrentLocation] = useState("Delhi");
  const [vendorLanguage, setVendorLanguage] = useState("hindi");
  
  // AI service integration
  const { state: aiState, processRequest, reset: resetAI } = useMandiAI();

  const simulateLoading = async (product: string, quantity: string = "50 kg", location?: string) => {
    setProductName(product);
    setView("loading");
    
    try {
      // Process AI request
      await processRequest({
        productName: product,
        location: location || currentLocation,
        quantity,
        vendorLanguage,
        buyerMessage: textInput || `I want to buy ${quantity} of ${product}. What's your best price?`
      });
      
      // Show results
      setView("price");
    } catch (error) {
      console.error('AI processing failed:', error);
      setView("error");
      toast({
        title: "AI Processing Failed",
        description: "Unable to get price insights. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleVoiceClick = () => {
    if (isListening) {
      setIsListening(false);
      setView("home");
    } else {
      // Always use reliable voice form for best results
      setView("reliable-voice");
    }
  };

  const handleReliableVoiceComplete = async (data: VoiceFormData) => {
    setProductName(data.product);
    setDetectedLanguage(data.language === 'english' ? 'en' : 'hi');
    setVendorLanguage(data.language);
    
    if (data.location) {
      setCurrentLocation(data.location);
    }
    
    setView("loading");
    
    try {
      // Process AI request with reliable voice data
      await processRequest({
        productName: data.product,
        location: data.location || currentLocation,
        quantity: data.quantity || "1 unit",
        vendorLanguage: data.language,
        buyerMessage: `I want to buy ${data.quantity || "some"} ${data.product}${data.quality ? ` of ${data.quality} quality` : ""}. What's your best price?`
      });
      
      // Show results
      setView("price");
    } catch (error) {
      console.error('AI processing failed:', error);
      setView("error");
      toast({
        title: "AI Processing Failed",
        description: "Unable to get price insights. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleReliableVoiceCancel = () => {
    setView("home");
  };

  const handleTextSubmit = () => {
    if (textInput.trim()) {
      const detected = detectLanguage(textInput);
      setDetectedLanguage(detected);
      setVendorLanguage(detected === 'hi' ? 'hindi' : 'english');
      simulateLoading(textInput.trim(), "1 unit");
      setTextInput("");
    }
  };

  const handleManualSubmit = (data: { product: string; quantity?: string; quality?: string; location?: string }) => {
    setDetectedLanguage("en");
    setVendorLanguage("english");
    if (data.location) {
      setCurrentLocation(data.location);
    }
    simulateLoading(data.product, data.quantity || "1 unit", data.location);
  };

  const handleRetry = () => {
    if (productName) {
      simulateLoading(productName, "50 kg");
    } else {
      setView("home");
    }
  };

  const handleBack = () => {
    if (view === "reliable-voice") {
      setView("home");
    } else {
      setView("home");
      setIsListening(false);
      setDetectedLanguage(null);
      setProductName("");
      resetAI();
    }
  };

  const handleNegotiate = () => {
    setView("negotiation");
  };

  // Negotiation view uses its own full-screen layout with slide animation
  if (view === "negotiation") {
    return (
      <PageTransition>
        <div className="min-h-screen flex flex-col bg-background">
          <Header onHome={handleBack} />
          <StepIndicator currentStep={3} />
          <AnimatePresence mode="wait">
            <motion.div
              key="negotiation"
              variants={slideFromRight}
              initial="initial"
              animate="enter"
              exit="exit"
              className="flex-1"
            >
              <NegotiationAssistantPage
                onBack={() => setView("price")}
                productName={productName}
                currentBid={580}
                unitProfit={12}
              />
            </motion.div>
          </AnimatePresence>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="min-h-screen flex flex-col bg-background grain-overlay">
        <AmbientBackground />
        <Header onHome={handleBack} />
        
        {/* Step Indicator */}
        <StepIndicator currentStep={getStepFromView(view)} />

        <main className="flex-1 flex flex-col px-6 sm:px-8 pb-8 safe-bottom relative z-10">
          <AnimatePresence mode="wait">
            {/* =================== HOME VIEW =================== */}
            {view === "home" && (
              <motion.div
                key="home"
                variants={pageVariants}
                initial="initial"
                animate="enter"
                exit="exit"
                className="flex-1 flex flex-col items-center justify-center text-center max-w-md mx-auto w-full py-8"
              >
                {/* Hero Text */}
                <div className="mb-10">
                  <motion.h1 
                    variants={staggerItem}
                    className="text-hero mb-4 text-foreground"
                  >
                    What are you
                    <br />
                    <span className="gradient-text-primary">selling today?</span>
                  </motion.h1>
                  <motion.p 
                    variants={staggerItem}
                    className="text-subtitle text-muted-foreground max-w-xs mx-auto"
                  >
                    Speak naturally — we'll find the fair price
                  </motion.p>
                  <motion.p 
                    variants={staggerItem}
                    className="text-xs font-medium text-muted-foreground/70 mt-2 tracking-wide"
                  >
                    Based on nearby market prices
                  </motion.p>
                </div>

                {/* Voice Button - Quick Option */}
                <motion.div 
                  variants={staggerItem}
                  className="mb-4"
                >
                  <VoiceButton
                    isListening={isListening}
                    onClick={handleVoiceClick}
                  />
                </motion.div>

                {/* Helper Text */}
                <motion.p 
                  variants={staggerItem}
                  className="text-sm text-muted-foreground/70 mb-8 font-medium"
                >
                  Works in your local language
                </motion.p>

                {/* Text Input - Secondary */}
                <motion.div 
                  variants={staggerItem}
                  className="w-full mb-3"
                >
                  <TextInput
                    value={textInput}
                    onChange={setTextInput}
                    onSubmit={handleTextSubmit}
                    placeholder="Or type your product name..."
                  />
                </motion.div>

                {/* Manual Entry - Expandable */}
                <motion.div 
                  variants={staggerItem}
                  className="w-full"
                >
                  <ManualEntryForm onSubmit={handleManualSubmit} />
                </motion.div>
              </motion.div>
            )}

            {/* =================== RELIABLE VOICE VIEW =================== */}
            {view === "reliable-voice" && (
              <motion.div
                key="reliable-voice"
                variants={pageVariants}
                initial="initial"
                animate="enter"
                exit="exit"
                className="flex-1 flex flex-col items-center justify-center max-w-2xl mx-auto w-full"
              >
                <ReliableVoiceForm
                  onComplete={handleReliableVoiceComplete}
                  onCancel={handleReliableVoiceCancel}
                />
              </motion.div>
            )}

            {/* =================== LISTENING VIEW =================== */}
            {view === "listening" && (
              <motion.div
                key="listening"
                variants={pageVariants}
                initial="initial"
                animate="enter"
                exit="exit"
                className="flex-1 flex flex-col items-center justify-center text-center max-w-md mx-auto w-full"
              >
                <div>
                  {detectedLanguage && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.1, duration: 0.3, ease: appleEasing }}
                      className="mb-10"
                    >
                      <LanguageBadge language={detectedLanguage} />
                    </motion.div>
                  )}

                  <motion.h2 
                    variants={staggerItem}
                    className="text-title mb-3 text-foreground"
                  >
                    Listening...
                  </motion.h2>
                  <motion.p 
                    variants={staggerItem}
                    className="text-muted-foreground mb-12 text-lg"
                  >
                    Speak clearly in your language
                  </motion.p>

                  <motion.div variants={staggerItem}>
                    <VoiceButton
                      isListening={isListening}
                      onClick={handleVoiceClick}
                    />
                  </motion.div>

                  <motion.p 
                    variants={staggerItem}
                    className="text-sm text-muted-foreground/70 mt-10 font-medium"
                  >
                    Tap again when you're done
                  </motion.p>

                  <motion.button
                    variants={staggerItem}
                    onClick={handleBack}
                    className={cn(
                      "mt-14 px-6 py-3 rounded-full",
                      "text-muted-foreground hover:text-foreground",
                      "hover:bg-muted/60",
                      "flex items-center gap-2 mx-auto",
                      "transition-all tap-feedback"
                    )}
                  >
                    <ArrowLeft size={18} />
                    <span className="font-medium">Cancel</span>
                  </motion.button>
                </div>
              </motion.div>
            )}

            {/* =================== LOADING VIEW =================== */}
            {view === "loading" && (
              <motion.div
                key="loading"
                variants={pageVariants}
                initial="initial"
                animate="enter"
                exit="exit"
                className="flex-1 flex flex-col items-center justify-center text-center max-w-md mx-auto w-full"
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mb-8"
                >
                  <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
                    <Loader2 size={32} className="text-primary animate-spin" />
                  </div>
                  <h2 className="text-2xl font-bold text-foreground mb-3">
                    Analyzing mandi prices…
                  </h2>
                  <p className="text-muted-foreground mb-6">
                    Checking rates for <span className="font-semibold text-foreground">{productName}</span> in nearby markets
                  </p>

                  {/* Progress Steps */}
                  <div className="flex flex-col gap-3 text-left max-w-xs mx-auto">
                    {[
                      { label: "Fetching nearby mandis", delay: 0 },
                      { label: "Comparing market rates", delay: 0.6 },
                      { label: "Generating AI insights", delay: 1.2 },
                    ].map((step, index) => (
                      <motion.div
                        key={step.label}
                        initial={{ opacity: 0.4 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: step.delay, duration: 0.3 }}
                        className="flex items-center gap-3"
                      >
                        <motion.div
                          initial={{ scale: 0.5, backgroundColor: "hsl(var(--muted))" }}
                          animate={{ 
                            scale: 1, 
                            backgroundColor: "hsl(var(--primary))" 
                          }}
                          transition={{ delay: step.delay, duration: 0.3 }}
                          className="w-2 h-2 rounded-full"
                        />
                        <motion.span
                          initial={{ color: "hsl(var(--muted-foreground))" }}
                          animate={{ color: "hsl(var(--foreground))" }}
                          transition={{ delay: step.delay, duration: 0.3 }}
                          className="text-sm font-medium"
                        >
                          {step.label}
                        </motion.span>
                        {index < 2 && (
                          <motion.span
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: step.delay + 0.5, duration: 0.2 }}
                            className="text-xs text-success ml-auto"
                          >
                            ✓
                          </motion.span>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="flex items-center gap-2 text-sm text-muted-foreground/70"
                >
                  <Sparkles size={14} className="text-primary" />
                  <span>AI-powered market intelligence</span>
                </motion.div>
              </motion.div>
            )}

            {/* =================== ERROR VIEW =================== */}
            {view === "error" && (
              <motion.div
                key="error"
                variants={pageVariants}
                initial="initial"
                animate="enter"
                exit="exit"
                className="flex-1 flex flex-col items-center justify-center text-center max-w-md mx-auto w-full"
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <div className="w-20 h-20 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-6">
                    <AlertCircle size={32} className="text-destructive" />
                  </div>
                  <h2 className="text-2xl font-bold text-foreground mb-3">
                    Unable to fetch estimate
                  </h2>
                  <p className="text-muted-foreground mb-8">
                    We couldn't get prices for <span className="font-semibold text-foreground">{productName}</span>. Please try again.
                  </p>

                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                      onClick={handleRetry}
                      className={cn(
                        "px-6 py-3 rounded-xl",
                        "bg-primary text-primary-foreground font-semibold",
                        "hover:bg-primary/90 transition-colors tap-feedback"
                      )}
                    >
                      Try Again
                    </button>
                    <button
                      onClick={handleBack}
                      className={cn(
                        "px-6 py-3 rounded-xl",
                        "bg-muted text-foreground font-medium",
                        "hover:bg-muted/80 transition-colors tap-feedback"
                      )}
                    >
                      Go Back
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}

            {/* =================== PRICE DISCOVERY VIEW =================== */}
            {view === "price" && aiState.response && (
              <motion.div
                key="price"
                variants={pageVariants}
                initial="initial"
                animate="enter"
                exit="exit"
                className="flex-1 max-w-5xl mx-auto w-full pt-2"
              >
                <PriceInsightsPage
                  productName={productName}
                  productVariant="Fresh"
                  currentPrice={aiState.response.priceAnalysis.priceRange.average}
                  lowPrice={aiState.response.priceAnalysis.priceRange.low}
                  avgPrice={aiState.response.priceAnalysis.priceRange.average}
                  highPrice={aiState.response.priceAnalysis.priceRange.high}
                  priceChange={8.4}
                  marketPosition="good"
                  onStartNegotiation={handleNegotiate}
                  onBack={handleBack}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </PageTransition>
  );
};

export default Index;
