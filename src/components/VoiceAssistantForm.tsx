import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Mic, MicOff, Volume2, VolumeX, ArrowRight, ArrowLeft, 
  Check, X, Edit3, SkipForward, Play, Pause, User, Package, 
  Scale, Award, MapPin, Languages
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useVoiceAssistant } from "@/hooks/useVoiceAssistant";
import { VoiceFormData } from "@/services/voiceAssistantService";
import { formatLanguageName, getAllLanguages } from "@/utils/languageUtils";
import { useGeolocation } from "@/hooks/useGeolocation";
import { toast } from "@/hooks/use-toast";

interface VoiceAssistantFormProps {
  onComplete: (data: VoiceFormData) => void;
  onCancel: () => void;
  className?: string;
}

const stepIcons = {
  greeting: Languages,
  language: Languages,
  name: User,
  product: Package,
  quantity: Scale,
  quality: Award,
  location: MapPin,
  confirmation: Check
};

const fieldLabels = {
  name: "Name",
  product: "Product",
  quantity: "Quantity", 
  quality: "Quality",
  location: "Location"
};

export function VoiceAssistantForm({ onComplete, onCancel, className }: VoiceAssistantFormProps) {
  const { 
    state, 
    start, 
    stop, 
    startListening, 
    stopListening, 
    skipToNextStep, 
    goToPreviousStep,
    updateFormField,
    setOnComplete,
    getCurrentStepInfo
  } = useVoiceAssistant();

  const { location } = useGeolocation();
  const [manualInput, setManualInput] = useState("");
  const [showManualInput, setShowManualInput] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState("hindi");

  const supportedLanguages = getAllLanguages();
  const currentStepInfo = getCurrentStepInfo();

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

  const handleManualSubmit = () => {
    if (!manualInput.trim()) return;
    
    const currentStep = state.steps[state.currentStep];
    if (currentStep.field) {
      updateFormField(currentStep.field, manualInput.trim());
      skipToNextStep();
    }
    
    setManualInput("");
    setShowManualInput(false);
  };

  const handleFieldEdit = (field: keyof VoiceFormData, value: string) => {
    updateFormField(field, value);
  };

  const getStepProgress = () => {
    const totalSteps = state.steps.length;
    const currentStep = state.currentStep + 1;
    return (currentStep / totalSteps) * 100;
  };

  const renderFormPreview = () => {
    return (
      <div className="space-y-4">
        <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
          <Edit3 size={16} />
          Form Preview
        </h3>
        
        {Object.entries(fieldLabels).map(([field, label]) => {
          const value = state.formData[field as keyof VoiceFormData];
          const isCurrentField = state.steps[state.currentStep]?.field === field;
          
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
                  {React.createElement(stepIcons[field as keyof typeof stepIcons] || Package, { size: 16 })}
                </div>
                <div>
                  <p className="font-medium text-foreground">{label}</p>
                  <p className={cn(
                    "text-sm",
                    value ? "text-foreground" : "text-muted-foreground"
                  )}>
                    {value || "Not filled"}
                  </p>
                </div>
              </div>
              
              {value && (
                <button
                  onClick={() => {
                    const newValue = prompt(`Edit ${label}:`, value);
                    if (newValue !== null) {
                      handleFieldEdit(field as keyof VoiceFormData, newValue);
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

  const renderConfirmationSummary = () => {
    return (
      <div className="space-y-4">
        <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
          <Check size={16} />
          Confirmation Summary
        </h3>
        
        <div className="p-4 rounded-lg bg-muted/30 border border-border">
          <div className="space-y-2 text-sm">
            <p><span className="font-medium">Name:</span> {state.formData.name || "Not provided"}</p>
            <p><span className="font-medium">Product:</span> {state.formData.product || "Not provided"}</p>
            <p><span className="font-medium">Quantity:</span> {state.formData.quantity || "Not provided"}</p>
            <p><span className="font-medium">Quality:</span> {state.formData.quality || "Not specified"}</p>
            <p><span className="font-medium">Location:</span> {state.formData.location || "Not provided"}</p>
          </div>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={() => {
              // Simulate positive confirmation
              const confirmationData = state.formData as VoiceFormData;
              onComplete(confirmationData);
            }}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-success text-success-foreground font-semibold hover:bg-success/90 transition-colors"
          >
            <Check size={18} />
            Confirm & Continue
          </button>
          
          <button
            onClick={goToPreviousStep}
            className="px-4 py-3 rounded-xl bg-muted text-foreground font-medium hover:bg-muted/80 transition-colors"
          >
            Edit
          </button>
        </div>
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
            Voice-Assisted Form Filling
          </h2>
          <p className="text-muted-foreground mb-6">
            Speak naturally in your language to fill the form step by step
          </p>

          {/* Language Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-foreground mb-2">
              Select Your Language
            </label>
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              {supportedLanguages.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name} ({lang.nativeName})
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleStart}
              className="flex-1 flex items-center justify-center gap-3 py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-lg hover:bg-primary/90 transition-colors"
            >
              <Mic size={20} />
              Start Voice Assistant
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
            <Mic size={20} className="text-primary" />
          </div>
          <div>
            <h2 className="font-bold text-foreground">Voice Assistant</h2>
            <p className="text-sm text-muted-foreground">
              {formatLanguageName(state.selectedLanguage)} • Step {currentStepInfo.stepNumber} of {currentStepInfo.totalSteps}
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
            {React.createElement(stepIcons[currentStepInfo.step.id as keyof typeof stepIcons] || Mic, { 
              size: 16, 
              className: "text-primary" 
            })}
          </div>
          <div className="flex-1">
            <p className="font-medium text-foreground mb-1">Assistant:</p>
            <p className="text-foreground leading-relaxed">
              {currentStepInfo.question}
            </p>
          </div>
        </div>
      </div>

      {/* Voice Controls */}
      <div className="mb-6">
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={state.isListening ? stopListening : startListening}
            disabled={state.isSpeaking}
            className={cn(
              "w-16 h-16 rounded-2xl flex items-center justify-center font-bold text-lg transition-all",
              state.isListening 
                ? "bg-destructive text-destructive-foreground animate-pulse" 
                : "bg-primary text-primary-foreground hover:bg-primary/90",
              state.isSpeaking && "opacity-50 cursor-not-allowed"
            )}
          >
            {state.isListening ? <MicOff size={24} /> : <Mic size={24} />}
          </button>
          
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">
              {state.isListening ? "Listening..." : state.isSpeaking ? "Speaking..." : "Tap to speak"}
            </p>
            {state.transcript && (
              <p className="text-xs text-muted-foreground mt-1">
                "{state.transcript}"
              </p>
            )}
          </div>
        </div>

        {/* Manual Input Toggle */}
        <div className="text-center mt-4">
          <button
            onClick={() => setShowManualInput(!showManualInput)}
            className="text-sm text-primary hover:underline font-medium"
          >
            {showManualInput ? "Hide" : "Type instead"}
          </button>
        </div>

        {/* Manual Input */}
        <AnimatePresence>
          {showManualInput && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4"
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
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation Controls */}
      <div className="flex justify-between mb-6">
        <button
          onClick={goToPreviousStep}
          disabled={state.currentStep === 0}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted text-foreground font-medium hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ArrowLeft size={16} />
          Previous
        </button>
        
        <button
          onClick={skipToNextStep}
          disabled={state.currentStep >= state.steps.length - 1}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted text-foreground font-medium hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Skip
          <SkipForward size={16} />
        </button>
      </div>

      {/* Form Preview or Confirmation */}
      {currentStepInfo.step.id === 'confirmation' ? renderConfirmationSummary() : renderFormPreview()}

      {/* Error Display */}
      {state.error && (
        <div className="mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
          <p className="text-sm text-destructive">{state.error}</p>
        </div>
      )}
    </div>
  );
}