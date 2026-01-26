import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Sparkles, MessageSquare, Volume2, Languages, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMandiAI } from "@/hooks/useMandiAI";
import { AIInsightsCard } from "@/components/AIInsightsCard";
import { IndicTTSShowcase } from "@/components/IndicTTSShowcase";
import { PageTransition } from "@/components/PageTransition";
import { Header } from "@/components/Header";
import { getAllLanguages, formatLanguageName } from "@/utils/languageUtils";
import { toast } from "@/hooks/use-toast";

const DEMO_SCENARIOS = [
  {
    id: 1,
    title: "Tomato Bulk Purchase",
    productName: "Tomato",
    location: "Delhi",
    quantity: "100 kg",
    vendorLanguage: "hindi",
    buyerMessage: "This price is quite high for a bulk order of 100 kg. Can we do better?",
    description: "Buyer negotiating bulk tomato purchase in Delhi mandi"
  },
  {
    id: 2,
    title: "Onion Quality Check",
    productName: "Onion",
    location: "Mumbai",
    quantity: "50 kg",
    vendorLanguage: "marathi",
    buyerMessage: "I need premium quality onions. What's your best rate?",
    description: "Premium onion purchase in Mumbai with Marathi translation"
  },
  {
    id: 3,
    title: "Rice Wholesale Deal",
    productName: "Rice",
    location: "Kolkata",
    quantity: "500 kg",
    vendorLanguage: "bengali",
    buyerMessage: "Looking for wholesale rates for 500 kg rice. Can you match competitor prices?",
    description: "Large rice wholesale negotiation in Kolkata"
  },
  {
    id: 4,
    title: "Mango Seasonal Purchase",
    productName: "Mango",
    location: "Bangalore",
    quantity: "25 kg",
    vendorLanguage: "kannada",
    buyerMessage: "These mangoes look good but the price seems high for the season.",
    description: "Seasonal mango purchase with Kannada translation"
  }
];

export default function AIDemo() {
  const navigate = useNavigate();
  const [selectedScenario, setSelectedScenario] = useState<typeof DEMO_SCENARIOS[0] | null>(null);
  const [activeTab, setActiveTab] = useState<'scenarios' | 'tts-showcase'>('scenarios');
  const [customInput, setCustomInput] = useState({
    productName: "",
    location: "",
    quantity: "",
    vendorLanguage: "hindi",
    buyerMessage: ""
  });
  const [showCustomForm, setShowCustomForm] = useState(false);

  const { state: aiState, processRequest, reset } = useMandiAI();
  const supportedLanguages = getAllLanguages();

  const handleScenarioTest = async (scenario: typeof DEMO_SCENARIOS[0]) => {
    setSelectedScenario(scenario);
    
    try {
      await processRequest({
        productName: scenario.productName,
        location: scenario.location,
        quantity: scenario.quantity,
        vendorLanguage: scenario.vendorLanguage,
        buyerMessage: scenario.buyerMessage
      });
      
      toast({
        title: "AI Processing Complete",
        description: `Generated insights for ${scenario.title}`,
      });
    } catch (error) {
      toast({
        title: "Processing Failed",
        description: "Unable to process the scenario. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleCustomTest = async () => {
    if (!customInput.productName || !customInput.buyerMessage) {
      toast({
        title: "Missing Information",
        description: "Please fill in product name and buyer message",
        variant: "destructive"
      });
      return;
    }

    try {
      await processRequest({
        productName: customInput.productName,
        location: customInput.location || "Delhi",
        quantity: customInput.quantity || "1 unit",
        vendorLanguage: customInput.vendorLanguage,
        buyerMessage: customInput.buyerMessage
      });
      
      toast({
        title: "Custom Test Complete",
        description: `Generated insights for ${customInput.productName}`,
      });
    } catch (error) {
      toast({
        title: "Processing Failed",
        description: "Unable to process your custom input. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleReset = () => {
    reset();
    setSelectedScenario(null);
    setShowCustomForm(false);
  };

  return (
    <PageTransition>
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        
        <main className="flex-1 px-4 sm:px-6 py-6 max-w-6xl mx-auto w-full">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <button 
              onClick={() => navigate("/")}
              className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
              title="Back to Home"
            >
              <ArrowLeft size={20} className="text-foreground" />
            </button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">AI Demo</h1>
              <p className="text-muted-foreground">
                Test the Multilingual Mandi AI system with different scenarios
              </p>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setActiveTab('scenarios')}
              className={cn(
                "px-4 py-2 rounded-lg font-medium text-sm transition-colors",
                activeTab === 'scenarios'
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground hover:bg-muted/80"
              )}
            >
              <MessageSquare size={16} className="inline mr-2" />
              AI Scenarios
            </button>
            <button
              onClick={() => setActiveTab('tts-showcase')}
              className={cn(
                "px-4 py-2 rounded-lg font-medium text-sm transition-colors",
                activeTab === 'tts-showcase'
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground hover:bg-muted/80"
              )}
            >
              <Volume2 size={16} className="inline mr-2" />
              Indic TTS Showcase
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'tts-showcase' ? (
            <IndicTTSShowcase />
          ) : (

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Controls */}
            <div className="space-y-6">
              {/* Demo Scenarios */}
              <div className="glass-card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles size={18} className="text-primary" />
                  <h2 className="font-bold text-foreground">Demo Scenarios</h2>
                </div>
                
                <div className="space-y-3">
                  {DEMO_SCENARIOS.map((scenario) => (
                    <button
                      key={scenario.id}
                      onClick={() => handleScenarioTest(scenario)}
                      disabled={aiState.loading}
                      className={cn(
                        "w-full p-4 rounded-xl text-left transition-all",
                        "border border-border hover:border-primary/50",
                        "hover:bg-primary/5 disabled:opacity-50 disabled:cursor-not-allowed",
                        selectedScenario?.id === scenario.id && "border-primary bg-primary/10"
                      )}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-foreground">{scenario.title}</h3>
                        <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
                          {formatLanguageName(scenario.vendorLanguage)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {scenario.description}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>📍 {scenario.location}</span>
                        <span>📦 {scenario.quantity}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Input Form */}
              <div className="glass-card p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <MessageSquare size={18} className="text-primary" />
                    <h2 className="font-bold text-foreground">Custom Test</h2>
                  </div>
                  <button
                    onClick={() => setShowCustomForm(!showCustomForm)}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    {showCustomForm ? "Hide" : "Show"} Form
                  </button>
                </div>

                {showCustomForm && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">
                          Product Name *
                        </label>
                        <input
                          type="text"
                          value={customInput.productName}
                          onChange={(e) => setCustomInput(prev => ({ ...prev, productName: e.target.value }))}
                          placeholder="e.g., Potato"
                          className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">
                          Location
                        </label>
                        <input
                          type="text"
                          value={customInput.location}
                          onChange={(e) => setCustomInput(prev => ({ ...prev, location: e.target.value }))}
                          placeholder="e.g., Delhi"
                          className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">
                          Quantity
                        </label>
                        <input
                          type="text"
                          value={customInput.quantity}
                          onChange={(e) => setCustomInput(prev => ({ ...prev, quantity: e.target.value }))}
                          placeholder="e.g., 50 kg"
                          className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">
                          Vendor Language
                        </label>
                        <select
                          value={customInput.vendorLanguage}
                          onChange={(e) => setCustomInput(prev => ({ ...prev, vendorLanguage: e.target.value }))}
                          className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                        >
                          {supportedLanguages.map((lang) => (
                            <option key={lang.code} value={lang.code}>
                              {lang.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Buyer Message *
                      </label>
                      <textarea
                        value={customInput.buyerMessage}
                        onChange={(e) => setCustomInput(prev => ({ ...prev, buyerMessage: e.target.value }))}
                        placeholder="Enter the buyer's message in English..."
                        rows={3}
                        className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                      />
                    </div>

                    <button
                      onClick={handleCustomTest}
                      disabled={aiState.loading || !customInput.productName || !customInput.buyerMessage}
                      className={cn(
                        "w-full py-3 rounded-xl font-semibold transition-colors",
                        "bg-primary text-primary-foreground",
                        "hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                      )}
                    >
                      {aiState.loading ? "Processing..." : "Test Custom Input"}
                    </button>
                  </div>
                )}
              </div>

              {/* Reset Button */}
              {(aiState.response || aiState.error) && (
                <button
                  onClick={handleReset}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-muted text-foreground font-medium hover:bg-muted/80 transition-colors"
                >
                  <RefreshCw size={18} />
                  <span>Reset Demo</span>
                </button>
              )}
            </div>

            {/* Right Column - Results */}
            <div className="space-y-6">
              {aiState.loading && (
                <div className="glass-card p-8 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Sparkles size={24} className="text-primary animate-pulse" />
                  </div>
                  <h3 className="font-bold text-foreground mb-2">Processing AI Request</h3>
                  <p className="text-muted-foreground">
                    Analyzing prices, translating messages, and generating voice output...
                  </p>
                </div>
              )}

              {aiState.error && (
                <div className="glass-card p-6 border-destructive/20 bg-destructive/5">
                  <h3 className="font-bold text-destructive mb-2">Processing Error</h3>
                  <p className="text-muted-foreground">{aiState.error}</p>
                </div>
              )}

              {aiState.response && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
                      <Sparkles size={16} className="text-success" />
                    </div>
                    <h2 className="font-bold text-foreground">AI Results</h2>
                    {selectedScenario && (
                      <span className="text-sm text-muted-foreground">
                        • {selectedScenario.title}
                      </span>
                    )}
                  </div>
                  
                  <AIInsightsCard
                    aiResponse={aiState.response}
                    vendorLanguage={selectedScenario?.vendorLanguage || customInput.vendorLanguage}
                    priceSummary={aiState.response.priceSummary}
                  />
                </div>
              )}

              {!aiState.loading && !aiState.response && !aiState.error && (
                <div className="glass-card p-8 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                    <Languages size={24} className="text-muted-foreground" />
                  </div>
                  <h3 className="font-bold text-foreground mb-2">Ready to Test</h3>
                  <p className="text-muted-foreground">
                    Select a demo scenario or create a custom test to see the AI in action.
                  </p>
                </div>
              )}
            </div>
          </div>
          )}
        </main>
      </div>
    </PageTransition>
  );
}