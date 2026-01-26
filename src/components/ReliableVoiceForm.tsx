import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Mic, MicOff, Volume2, VolumeX, Check, X, Edit3, 
  User, Package, Scale, Award, MapPin, Languages, ArrowRight,
  Keyboard, RefreshCw, AlertCircle, CheckCircle, Bug
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useReliableVoice } from "@/hooks/useReliableVoice";
import { VoiceFormData } from "@/services/reliableVoiceService";
import { useGeolocation } from "@/hooks/useGeolocation";
import { toast } from "@/hooks/use-toast";
import { SpeechDebugger } from "./SpeechDebugger";

interface ReliableVoiceFormProps {
  onComplete: (data: VoiceFormData) => void;
  onCancel: () => void;
  className?: string;
}

const FIELD_ICONS = {
  name: User,
  product: Package,
  quantity: Scale,
  quality: Award,
  location: MapPin
};

const FIELD_LABELS = {
  name: "Name",
  product: "Product",
  quantity: "Quantity", 
  quality: "Quality",
  location: "Location"
};

const QUALITY_OPTIONS = [
  { value: 'good', label: 'Good', hindi: 'अच्छा' },
  { value: 'average', label: 'Average', hindi: 'साधारण' },
  { value: 'premium', label: 'Premium', hindi: 'प्रीमियम' }
] as const;

const LANGUAGE_OPTIONS = [
  { code: 'hindi', name: 'Hindi', native: 'हिंदी' },
  { code: 'english', name: 'English', native: 'English' }
];

const PRODUCT_SUGGESTIONS = [
  { english: 'Tomato', hindi: 'टमाटर' },
  { english: 'Onion', hindi: 'प्याज' },
  { english: 'Potato', hindi: 'आलू' },
  { english: 'Carrot', hindi: 'गाजर' },
  { english: 'Cabbage', hindi: 'पत्ता गोभी' },
  { english: 'Cauliflower', hindi: 'फूल गोभी' }
];

export function ReliableVoiceForm({ onComplete, onCancel, className }: ReliableVoiceFormProps) {
  const { 
    state, 
    start, 
    stop, 
    startListening, 
    stopListening, 
    updateField,
    setOnComplete,
    getCurrentStep,
    getCurrentQuestion,
    goToStep,
    processManualInput
  } = useReliableVoice();

  const { location } = useGeolocation();
  const [selectedLanguage, setSelectedLanguage] = useState("hindi");
  const [manualInput, setManualInput] = useState("");
  const [showManualInput, setShowManualInput] = useState(false);
  const [inputMethod, setInputMethod] = useState<'voice' | 'text'>('voice');
  const [showDebugger, setShowDebugger] = useState(false);

  useEffect(() => {
    setOnComplete(onComplete);
  }, [onComplete, setOnComplete]);

  const handleStart = async () => {
    const detectedLocation = location ? `${location.city}, ${location.state}` : undefined;
    await start(selectedLanguage, detectedLocation);
  };

  const handleStop = () => {
    stop();
    onCancel();
  };

  const handleManualSubmit = async () => {
    if (!manualInput.trim()) return;
    
    try {
      await processManualInput(manualInput.trim());
      setManualInput("");
      setShowManualInput(false);
      
      toast({
        title: "Input Processed",
        description: "Your input has been processed successfully",
      });
    } catch (error) {
      toast({
        title: "Processing Error",
        description: "Failed to process input. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleQuickSelect = async (value: string) => {
    try {
      await processManualInput(value);
      toast({
        title: "Quick Select",
        description: `Selected: ${value}`,
      });
    } catch (error) {
      toast({
        title: "Selection Error",
        description: "Failed to process selection. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleFieldEdit = (field: keyof VoiceFormData, value: string) => {
    updateField(field, value);
  };

  const getStepProgress = () => {
    return ((state.currentStep + 1) / 7) * 100;
  };

  const renderQuickOptions = () => {
    const currentStep = getCurrentStep();
    
    if (currentStep === 'product') {
      return (
        <div className="mt-4">
          <p className="text-sm font-medium text-foreground mb-2">Quick Select:</p>
          <div className="grid grid-cols-2 gap-2">
            {PRODUCT_SUGGESTIONS.map((product) => (
              <button
                key={product.english}
                onClick={() => handleQuickSelect(product.english)}
                className="p-2 rounded-lg bg-muted hover:bg-muted/80 text-sm font-medium text-foreground transition-colors"
              >
                {state.language === 'hindi' ? product.hindi : product.english}
              </button>
            ))}
          </div>
        </div>
      );
    }
    
    if (currentStep === 'quality') {
      return (
        <div className="mt-4">
          <p className="text-sm font-medium text-foreground mb-2">Quick Select:</p>
          <div className="grid grid-cols-3 gap-2">
            {QUALITY_OPTIONS.map((quality) => (
              <button
                key={quality.value}
                onClick={() => handleQuickSelect(quality.value)}
                className="p-2 rounded-lg bg-muted hover:bg-muted/80 text-sm font-medium text-foreground transition-colors"
              >
                {state.language === 'hindi' ? quality.hindi : quality.label}
              </button>
            ))}
          </div>
        </div>
      );
    }
    
    return null;
  };

  const renderFormFields = () => {
    return (
      <div className="space-y-3">
        <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
          <Edit3 size={16} />
          Form Progress
        </h3>
        
        {Object.entries(FIELD_LABELS).map(([field, label]) => {
          const value = state.formData[field as keyof VoiceFormData];
          const isCurrentField = getCurrentStep() === field;
          const Icon = FIELD_ICONS[field as keyof typeof FIELD_ICONS];
          
          return (
            <div 
              key={field}
              className={cn(
                "flex items-center justify-between p-3 rounded-lg border transition-all",
                isCurrentField 
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20" 
                  : "border-border bg-muted/20",
                value && "bg-success/5 border-success/30"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center",
                  isCurrentField ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground",
                  value && "bg-success/20 text-success"
                )}>
                  <Icon size={16} />
                </div>
                <div>
                  <p className="font-medium text-foreground">{label}</p>
                  <p className={cn(
                    "text-sm",
                    value ? "text-foreground" : "text-muted-foreground"
                  )}>
                    {field === 'quality' && value ? 
                      value.charAt(0).toUpperCase() + value.slice(1) : 
                      value || "Not filled"
                    }
                  </p>
                </div>
              </div>
              
              {value && field !== 'language' && (
                <button
                  onClick={() => {
                    if (field === 'quality') {
                      const newValue = prompt(`Select quality (good, average, premium):`, value);
                      if (newValue && ['good', 'average', 'premium'].includes(newValue)) {
                        handleFieldEdit(field as keyof VoiceFormData, newValue);
                      }
                    } else {
                      const newValue = prompt(`Edit ${label}:`, value);
                      if (newValue !== null) {
                        handleFieldEdit(field as keyof VoiceFormData, newValue);
                      }
                    }
                  }}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Edit3 size={14} />
                </button>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  if (!state.isActive) {
    return (
      <div className={cn("glass-card p-6", className)}>
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Mic size={24} className="text-primary" />
          </div>
          
          <h2 className="text-xl font-bold text-foreground mb-2">
            Reliable Voice Form
          </h2>
          <p className="text-muted-foreground mb-6">
            Multiple speech recognition methods for maximum reliability
          </p>

          {/* Language Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-foreground mb-2">
              Select Language
            </label>
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              {LANGUAGE_OPTIONS.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name} ({lang.native})
                </option>
              ))}
            </select>
          </div>

          {/* Input Method Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-foreground mb-2">
              Preferred Input Method
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setInputMethod('voice')}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-colors",
                  inputMethod === 'voice' 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-muted text-foreground hover:bg-muted/80"
                )}
              >
                <Mic size={16} />
                Voice
              </button>
              <button
                onClick={() => setInputMethod('text')}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-colors",
                  inputMethod === 'text' 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-muted text-foreground hover:bg-muted/80"
                )}
              >
                <Keyboard size={16} />
                Text
              </button>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleStart}
              className="flex-1 flex items-center justify-center gap-3 py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-lg hover:bg-primary/90 transition-colors"
            >
              {inputMethod === 'voice' ? <Mic size={20} /> : <Keyboard size={20} />}
              Start Form
            </button>
            
            <button
              onClick={onCancel}
              className="px-6 py-4 rounded-2xl bg-muted text-foreground font-medium hover:bg-muted/80 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("glass-card p-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Languages size={20} className="text-primary" />
          </div>
          <div>
            <h2 className="font-bold text-foreground">Reliable Voice Form</h2>
            <p className="text-sm text-muted-foreground">
              Step {state.currentStep + 1} of 7 • {state.language} • {state.recognitionMethod}
            </p>
          </div>
        </div>
        
        <button
          onClick={handleStop}
          className="w-10 h-10 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 flex items-center justify-center transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${getStepProgress()}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Current Question */}
      <div className="mb-6">
        <div className="flex items-start gap-3 p-4 rounded-xl bg-primary/5 border border-primary/20">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
            <Volume2 size={16} className="text-primary" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-foreground mb-1">Question:</p>
            <p className="text-foreground leading-relaxed">
              {getCurrentQuestion()}
            </p>
            {state.isRetrying && (
              <p className="text-sm text-amber-600 mt-2 flex items-center gap-1">
                <RefreshCw size={14} className="animate-spin" />
                Please try again...
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Input Methods */}
      <div className="mb-6">
        <div className="flex items-center justify-center gap-4 mb-4">
          {/* Voice Input */}
          <button
            onClick={state.isListening ? stopListening : startListening}
            disabled={state.isSpeaking || state.recognitionMethod === 'manual'}
            className={cn(
              "w-16 h-16 rounded-2xl flex items-center justify-center font-bold text-lg transition-all",
              state.isListening 
                ? "bg-destructive text-destructive-foreground animate-pulse" 
                : "bg-primary text-primary-foreground hover:bg-primary/90",
              (state.isSpeaking || state.recognitionMethod === 'manual') && "opacity-50 cursor-not-allowed"
            )}
          >
            {state.isListening ? <MicOff size={24} /> : <Mic size={24} />}
          </button>
          
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">
              {state.isListening ? "Listening..." : 
               state.isSpeaking ? "Speaking..." : 
               state.recognitionMethod === 'manual' ? "Use text input" :
               "Tap to speak"}
            </p>
            {state.lastTranscript && (
              <p className="text-xs text-muted-foreground mt-1 max-w-xs truncate">
                "{state.lastTranscript}"
              </p>
            )}
            
            {/* Debug Info */}
            <p className="text-xs text-muted-foreground/60 mt-1">
              Method: {state.recognitionMethod}
            </p>
          </div>
        </div>

        {/* Test Speech Recognition Button */}
        <div className="flex justify-center gap-2 mb-4">
          <button
            onClick={() => {
              // Test speech recognition with a simple phrase
              const testPhrase = state.language === 'hindi' ? 'टेस्ट' : 'test';
              processManualInput(testPhrase);
              toast({
                title: "Test Input",
                description: `Testing with: ${testPhrase}`,
              });
            }}
            className="px-3 py-1 rounded-lg bg-muted/50 text-xs text-muted-foreground hover:bg-muted/80 transition-colors"
          >
            Test Recognition
          </button>
          
          <button
            onClick={() => setShowDebugger(true)}
            className="flex items-center gap-1 px-3 py-1 rounded-lg bg-amber-100 text-amber-800 text-xs hover:bg-amber-200 transition-colors"
          >
            <Bug size={12} />
            Debug Speech
          </button>
        </div>

        {/* Manual Input */}
        <div className="space-y-3">
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => setShowManualInput(!showManualInput)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors",
                showManualInput 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-muted text-foreground hover:bg-muted/80"
              )}
            >
              <Keyboard size={16} />
              {showManualInput ? "Hide" : "Show"} Text Input
            </button>
          </div>

          <AnimatePresence>
            {showManualInput && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-3"
              >
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    placeholder="Type your answer..."
                    className="flex-1 px-4 py-3 rounded-xl bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                    onKeyPress={(e) => e.key === 'Enter' && handleManualSubmit()}
                  />
                  <button
                    onClick={handleManualSubmit}
                    disabled={!manualInput.trim()}
                    className="px-4 py-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ArrowRight size={18} />
                  </button>
                </div>
                
                {renderQuickOptions()}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Form Fields */}
      {renderFormFields()}

      {/* Status Messages */}
      {state.error && (
        <div className="mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-2">
          <AlertCircle size={16} className="text-destructive mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-destructive">Error</p>
            <p className="text-sm text-destructive">{state.error}</p>
          </div>
        </div>
      )}

      {state.recognitionMethod === 'annyang' && (
        <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-2">
          <CheckCircle size={16} className="text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-800">Fallback Mode</p>
            <p className="text-sm text-amber-700">Using alternative speech recognition</p>
          </div>
        </div>
      )}
      
      {/* Speech Debugger Modal */}
      <AnimatePresence>
        {showDebugger && (
          <SpeechDebugger onClose={() => setShowDebugger(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}