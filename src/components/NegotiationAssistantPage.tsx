import { useState, useEffect, useCallback } from "react";
import { 
  MessageSquare, Pause, Save, Languages, Check, RefreshCw, Info, 
  Sun, Sparkles, BarChart3, Mic, Volume2, Play, ArrowLeft,
  CheckCircle2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

interface Message {
  id: string;
  speaker: "buyer" | "vendor";
  language: string;
  time: string;
  text: string;
  translation: string;
}

interface NegotiationAssistantPageProps {
  onBack: () => void;
  productName?: string;
  currentBid: number;
  unitProfit: number;
}

const initialMessages: Message[] = [
  {
    id: "1",
    speaker: "buyer",
    language: "ENGLISH",
    time: "10:42 AM",
    text: '"This price is quite high for a bulk order of 50 units. Can we do better?"',
    translation: '"50 यूनिट के लिए यह कीमत काफी ज़्यादा है। क्या हम कम कर सकते हैं?"'
  },
  {
    id: "2",
    speaker: "vendor",
    language: "HINDI",
    time: "10:43 AM",
    text: '"यह हमारा सबसे अच्छा माल है, साहब। ₹600 से कम नहीं हो पाएगा।"',
    translation: '"This is our best quality stock, sir. It won\'t be possible for less than ₹600."'
  }
];

const buyerResponses = [
  { text: '"Okay, but what about ₹590? I\'m a regular customer."', translation: '"ठीक है, लेकिन ₹590 में? मैं पुराना ग्राहक हूं।"' },
  { text: '"That\'s still too much. My budget is ₹550 maximum."', translation: '"यह अभी भी बहुत ज़्यादा है। मेरा बजट ₹550 है।"' },
  { text: '"Can you throw in free delivery at this price?"', translation: '"इस कीमत पर फ्री डिलीवरी मिलेगी?"' },
];

const vendorResponses = [
  { text: '"₹590 चल जाएगा, लेकिन 100 यूनिट का ऑर्डर होना चाहिए।"', translation: '"₹590 works, but it should be an order of 100 units."' },
  { text: '"आखिरी दाम ₹585, इससे कम नहीं होगा।"', translation: '"Final price ₹585, can\'t go lower than this."' },
  { text: '"डिलीवरी फ्री कर दूंगा अगर कैश पेमेंट हो।"', translation: '"I\'ll make delivery free if it\'s cash payment."' },
];

const aiSuggestions = [
  "Mention the premium quality to justify the price.",
  "Offer a bulk discount for orders above 100 units.",
  "Highlight the freshness guarantee to close the deal.",
  "Suggest a trial order to build trust.",
];

export function NegotiationAssistantPage({
  onBack,
  productName = "Tomato",
  currentBid: initialBid,
  unitProfit: initialProfit
}: NegotiationAssistantPageProps) {
  const [isListening, setIsListening] = useState(true);
  const [outdoorMode, setOutdoorMode] = useState(true);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [currentBid, setCurrentBid] = useState(initialBid);
  const [unitProfit, setUnitProfit] = useState(initialProfit);
  const [negotiationHealth, setNegotiationHealth] = useState(85);
  const [currentSuggestion, setCurrentSuggestion] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [dealStatus, setDealStatus] = useState<"negotiating" | "accepted" | "rejected">("negotiating");
  const [audioWaveform, setAudioWaveform] = useState<number[]>(Array(30).fill(0).map(() => Math.random() * 100));

  // Animate audio waveform when listening
  useEffect(() => {
    if (!isListening) return;
    
    const interval = setInterval(() => {
      setAudioWaveform(Array(30).fill(0).map(() => Math.random() * 100));
    }, 150);
    
    return () => clearInterval(interval);
  }, [isListening]);

  // Simulate incoming messages when listening
  useEffect(() => {
    if (!isListening || dealStatus !== "negotiating") return;
    
    const timeout = setTimeout(() => {
      const isBuyer = messages.length % 2 === 0;
      const responses = isBuyer ? buyerResponses : vendorResponses;
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      
      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      
      const newMessage: Message = {
        id: String(messages.length + 1),
        speaker: isBuyer ? "buyer" : "vendor",
        language: isBuyer ? "ENGLISH" : "HINDI",
        time: timeStr,
        text: randomResponse.text,
        translation: randomResponse.translation
      };
      
      setMessages(prev => [...prev, newMessage]);
      setCurrentSuggestion(prev => (prev + 1) % aiSuggestions.length);
      
      // Update negotiation health randomly
      setNegotiationHealth(prev => Math.min(100, Math.max(50, prev + (Math.random() > 0.5 ? 5 : -3))));
    }, 4000 + Math.random() * 3000);
    
    return () => clearTimeout(timeout);
  }, [isListening, messages.length, dealStatus]);

  const getCurrentTime = () => {
    return new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const handleAccept = useCallback(() => {
    setDealStatus("accepted");
    setIsListening(false);
    toast({
      title: "🎉 Deal Accepted!",
      description: `Closed at ₹${currentBid}/unit. Great negotiation!`,
    });
  }, [currentBid]);

  const handleCounter = useCallback(() => {
    const newBid = currentBid + 10;
    setCurrentBid(newBid);
    setUnitProfit(prev => prev + 2);
    
    const counterMessage: Message = {
      id: String(messages.length + 1),
      speaker: "vendor",
      language: "HINDI",
      time: getCurrentTime(),
      text: `"₹${newBid} से कम नहीं होगा, साहब। यह बहुत अच्छा माल है।"`,
      translation: `"Can't go below ₹${newBid}, sir. This is very good quality."`
    };
    
    setMessages(prev => [...prev, counterMessage]);
    toast({
      title: "Counter offer sent",
      description: `New price: ₹${newBid}/unit`,
    });
  }, [currentBid, messages.length]);

  const handleExplainValue = useCallback(() => {
    const explainMessage: Message = {
      id: String(messages.length + 1),
      speaker: "vendor",
      language: "HINDI",
      time: getCurrentTime(),
      text: `"यह ${productName} सबसे ताज़ा है। आज सुबह ही खेत से आया है। 5 दिन तक खराब नहीं होगा।"`,
      translation: `"This ${productName} is the freshest. Came from the farm this morning. Won't spoil for 5 days."`
    };
    
    setMessages(prev => [...prev, explainMessage]);
    setNegotiationHealth(prev => Math.min(100, prev + 5));
    toast({
      title: "Value explained",
      description: "Highlighted product quality to the buyer",
    });
  }, [messages.length, productName]);

  const handlePlayAudio = useCallback(() => {
    setIsPlaying(true);
    
    // Use Web Speech API for text-to-speech
    if ('speechSynthesis' in window) {
      const lastVendorMessage = [...messages].reverse().find(m => m.speaker === "vendor");
      if (lastVendorMessage) {
        const utterance = new SpeechSynthesisUtterance(lastVendorMessage.text.replace(/"/g, ''));
        utterance.lang = 'hi-IN';
        utterance.rate = 0.9;
        utterance.onend = () => setIsPlaying(false);
        utterance.onerror = () => setIsPlaying(false);
        speechSynthesis.speak(utterance);
      } else {
        setTimeout(() => setIsPlaying(false), 2000);
      }
    } else {
      setTimeout(() => setIsPlaying(false), 2000);
      toast({
        title: "Audio not supported",
        description: "Your browser doesn't support text-to-speech",
        variant: "destructive",
      });
    }
  }, [messages]);

  const handleClearAudio = useCallback(() => {
    setMessages(initialMessages);
    setCurrentBid(initialBid);
    setUnitProfit(initialProfit);
    setNegotiationHealth(85);
    setDealStatus("negotiating");
    toast({
      title: "Transcript cleared",
      description: "Starting fresh negotiation",
    });
  }, [initialBid, initialProfit]);

  const handleSaveLog = useCallback(() => {
    const log = messages.map(m => `[${m.time}] ${m.speaker.toUpperCase()}: ${m.text}`).join('\n');
    const blob = new Blob([log], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `negotiation-${productName}-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: "Log saved",
      description: "Negotiation transcript downloaded",
    });
  }, [messages, productName]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (dealStatus !== "negotiating") return;
      
      if (e.key === 'a' || e.key === 'A') {
        handleAccept();
      } else if (e.key === 'c' || e.key === 'C') {
        handleCounter();
      } else if (e.key === ' ') {
        e.preventDefault();
        setIsListening(prev => !prev);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleAccept, handleCounter, dealStatus]);

  const healthLabel = negotiationHealth >= 70 ? "Strong" : negotiationHealth >= 40 ? "Fair" : "Weak";
  const healthColor = negotiationHealth >= 70 ? "text-success" : negotiationHealth >= 40 ? "text-amber-500" : "text-destructive";

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-card/50">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack}
            className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
          >
            <ArrowLeft size={20} className="text-foreground" />
          </button>
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <MessageSquare size={20} className="text-primary-foreground" />
          </div>
          <div>
            <span className="font-bold text-lg text-foreground">Negotiation Assistant</span>
            <p className="text-xs text-muted-foreground">{productName}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {dealStatus === "accepted" && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-success/10 text-success">
              <CheckCircle2 size={16} />
              <span className="font-semibold text-sm">Deal Closed</span>
            </div>
          )}
          
          <button 
            onClick={() => setOutdoorMode(!outdoorMode)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-sm transition-colors",
              outdoorMode 
                ? "bg-amber-500 text-white" 
                : "bg-muted text-foreground hover:bg-muted/80"
            )}
          >
            <Sun size={16} />
            <span className="hidden sm:inline">Outdoor Mode</span>
          </button>
          
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-primary font-bold">V</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-4 sm:px-6 py-6 max-w-7xl mx-auto w-full overflow-auto">
        {/* Title Section */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className={cn(
              "w-2 h-2 rounded-full",
              isListening && dealStatus === "negotiating" ? "bg-success animate-pulse" : "bg-muted-foreground"
            )} />
            <span className={cn(
              "text-xs font-bold uppercase tracking-wider",
              isListening && dealStatus === "negotiating" ? "text-success" : "text-muted-foreground"
            )}>
              {dealStatus === "accepted" ? "Deal Complete" : isListening ? "Live Recording" : "Paused"}
            </span>
          </div>
          
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1">Market Floor Assistant</h1>
              <p className="text-muted-foreground">
                Active Translation: <span className="font-semibold text-foreground">Hindi</span> ↔ <span className="font-semibold text-foreground">English</span>
              </p>
            </div>
            
            <button className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-xl",
              "bg-card border border-border text-foreground font-medium",
              "hover:bg-muted/50 transition-colors"
            )}>
              <Languages size={18} />
              <span>Change Language</span>
            </button>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left Column - Transcript */}
          <div className="lg:col-span-3">
            <div className="glass-card p-5">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <MessageSquare size={18} className="text-foreground" />
                  <h2 className="font-bold text-foreground">Real-time Transcript</h2>
                  <span className="text-xs text-muted-foreground">({messages.length} messages)</span>
                </div>
                <button 
                  onClick={handleClearAudio}
                  className="text-sm font-semibold text-primary hover:underline"
                >
                  CLEAR
                </button>
              </div>

              {/* Audio Input Visualization */}
              {isListening && dealStatus === "negotiating" && (
                <div className="mb-5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Audio Input</p>
                  <div className="flex items-center gap-1 h-6">
                    {audioWaveform.map((height, i) => (
                      <div 
                        key={i}
                        className="flex-1 bg-primary/60 rounded-full transition-all duration-150"
                        style={{ 
                          height: `${height}%`,
                          opacity: 0.3 + (height / 100) * 0.7
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Messages */}
              <div className="space-y-5 max-h-[400px] overflow-y-auto">
                {messages.map((msg) => (
                  <div key={msg.id}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={cn(
                        "text-xs font-bold uppercase tracking-wider",
                        msg.speaker === "buyer" ? "text-muted-foreground" : "text-success"
                      )}>
                        {msg.speaker === "buyer" ? "Buyer" : "Vendor"} ({msg.language})
                      </span>
                      <span className="text-xs text-muted-foreground">{msg.time}</span>
                    </div>
                    
                    <p className={cn(
                      "text-lg leading-relaxed mb-2",
                      msg.speaker === "vendor" && "font-medium"
                    )}>
                      {msg.text}
                    </p>
                    
                    <div className={cn(
                      "px-4 py-3 rounded-xl border-l-4",
                      msg.speaker === "buyer" 
                        ? "bg-amber-50 border-amber-400 text-amber-800 dark:bg-amber-950/30 dark:text-amber-200" 
                        : "bg-muted/50 border-muted-foreground/30 text-muted-foreground"
                    )}>
                      <span className="text-sm italic">
                        Translation: {msg.translation}
                      </span>
                    </div>
                  </div>
                ))}

                {/* AI Suggestion */}
                {dealStatus === "negotiating" && (
                  <div className="flex justify-center">
                    <div className={cn(
                      "inline-flex items-center gap-2 px-4 py-2 rounded-full",
                      "bg-primary/10 text-primary border border-primary/20"
                    )}>
                      <Sparkles size={14} />
                      <span className="text-sm font-medium">
                        AI Suggestion: {aiSuggestions[currentSuggestion]}
                      </span>
                    </div>
                  </div>
                )}

                {/* Listening Indicator */}
                {isListening && dealStatus === "negotiating" && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        {messages.length % 2 === 0 ? "Buyer" : "Vendor"} ({messages.length % 2 === 0 ? "English" : "Hindi"})
                      </span>
                      <span className="text-xs text-muted-foreground">{getCurrentTime()}</span>
                    </div>
                    <p className="text-lg text-muted-foreground italic flex items-center gap-2">
                      <Mic size={16} className="animate-pulse text-primary" />
                      Listening...
                    </p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-6">
                <button 
                  onClick={() => setIsListening(!isListening)}
                  disabled={dealStatus !== "negotiating"}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold transition-colors tap-feedback",
                    dealStatus !== "negotiating" 
                      ? "bg-muted/50 text-muted-foreground cursor-not-allowed"
                      : "bg-muted text-foreground hover:bg-muted/80"
                  )}
                >
                  {isListening ? <Pause size={18} /> : <Play size={18} />}
                  <span>{isListening ? "Pause" : "Resume"}</span>
                </button>
                <button 
                  onClick={handleSaveLog}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl",
                    "bg-muted text-foreground font-semibold",
                    "hover:bg-muted/80 transition-colors tap-feedback"
                  )}
                >
                  <Save size={18} />
                  <span>Save Log</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Column - Smart Response */}
          <div className="lg:col-span-2 space-y-5">
            {/* Smart Response Header */}
            <div className="flex items-center gap-2">
              <Sparkles size={20} className="text-primary" />
              <h2 className="font-bold text-xl text-foreground">Smart Response</h2>
            </div>

            {/* Action Cards */}
            <button 
              onClick={handleAccept}
              disabled={dealStatus !== "negotiating"}
              className={cn(
                "w-full flex items-center justify-between p-5 rounded-2xl text-left transition-all tap-feedback",
                dealStatus !== "negotiating"
                  ? "bg-muted text-muted-foreground cursor-not-allowed"
                  : "bg-success text-success-foreground hover:opacity-90"
              )}
            >
              <div>
                <p className="font-bold text-xl mb-1">ACCEPT</p>
                <p className="text-sm opacity-90">Close deal at ₹{currentBid}/unit</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <Check size={20} />
              </div>
            </button>

            <button 
              onClick={handleCounter}
              disabled={dealStatus !== "negotiating"}
              className={cn(
                "w-full flex items-center justify-between p-5 rounded-2xl text-left transition-all tap-feedback",
                dealStatus !== "negotiating"
                  ? "bg-muted text-muted-foreground cursor-not-allowed"
                  : "bg-amber-500 text-white hover:opacity-90"
              )}
            >
              <div>
                <p className="font-bold text-xl mb-1">COUNTER</p>
                <p className="text-sm opacity-90">Suggest ₹{currentBid + 10} with free shipping</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <RefreshCw size={20} />
              </div>
            </button>

            {/* Play Audio Button */}
            <button 
              onClick={handlePlayAudio}
              disabled={isPlaying}
              className={cn(
                "w-full flex items-center gap-3 p-4 rounded-xl transition-colors tap-feedback",
                isPlaying 
                  ? "bg-primary/20 border border-primary/40 text-primary"
                  : "bg-primary/10 border border-primary/20 text-primary hover:bg-primary/15"
              )}
            >
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                isPlaying ? "bg-primary/30 animate-pulse" : "bg-primary/20"
              )}>
                <Volume2 size={18} />
              </div>
              <div className="text-left">
                <p className="font-semibold text-sm">
                  {isPlaying ? "Playing..." : "Play Audio Response"}
                </p>
                <p className="text-xs text-primary/70">Hear this counter-offer in your language</p>
              </div>
            </button>

            <button 
              onClick={handleExplainValue}
              disabled={dealStatus !== "negotiating"}
              className={cn(
                "w-full flex items-center justify-between p-5 rounded-2xl text-left transition-all tap-feedback",
                dealStatus !== "negotiating"
                  ? "bg-muted text-muted-foreground cursor-not-allowed"
                  : "bg-teal-600 text-white hover:opacity-90"
              )}
            >
              <div>
                <p className="font-bold text-xl mb-1">EXPLAIN VALUE</p>
                <p className="text-sm opacity-90">Highlight {productName} quality</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <Info size={20} />
              </div>
            </button>

            {/* Deal Overview */}
            <div className="glass-card p-5">
              <h3 className="font-bold text-foreground mb-4">Deal Overview</h3>
              
              <div className="grid grid-cols-2 gap-4 mb-5 pb-5 border-b border-border">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Current Bid</p>
                  <p className="text-3xl font-bold text-primary">₹{currentBid}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Unit Profit</p>
                  <p className="text-3xl font-bold text-success">+{unitProfit}%</p>
                </div>
              </div>

              {/* Negotiation Health */}
              <div className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-foreground">Negotiation Health</p>
                  <span className={cn("text-sm font-bold", healthColor)}>{healthLabel}</span>
                </div>
                <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-amber-400 via-success to-success rounded-full transition-all duration-700"
                    style={{ width: `${negotiationHealth}%` }}
                  />
                </div>
              </div>

              {/* Market Insight */}
              <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/50 border border-border/50">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <BarChart3 size={16} className="text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">Market Insight</p>
                  <p className="text-xs text-muted-foreground">
                    Current bid is {Math.round((currentBid / initialBid - 1) * 100)}% {currentBid >= initialBid ? "above" : "below"} your starting price.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-4 sm:px-6 py-4 border-t border-border bg-card/50 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-4 sm:gap-6 text-xs font-mono text-muted-foreground">
          <span>[A] ACCEPT</span>
          <span>[C] COUNTER</span>
          <span>[SPACE] PAUSE</span>
        </div>
        <p className="text-xs text-muted-foreground">POWERED BY MULTILINGUAL MANDI AI</p>
      </footer>
    </div>
  );
}
