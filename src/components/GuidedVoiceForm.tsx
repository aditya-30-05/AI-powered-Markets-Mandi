import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Mic, MicOff, Volume2, X, Edit3, 
  User, Package, Scale, Award, MapPin, Languages, ArrowRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useGuidedVoice } from "@/hooks/useGuidedVoice";
import { FormData } from "@/services/guidedVoiceService";
import { useGeolocation } from "@/hooks/useGeolocation";
import { toast } from "@/hooks/use-toast";

interface GuidedVoiceFormProps {
  onComplete: (data: FormData) => void;
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

const QUALITY_OPTIONS = ['good', 'average', 'premium'] as const;

const LANGUAGE_OPTIONS = [
  { code: 'hindi', name: 'Hindi', native: 'हिंदी' },
  { code: 'english', name: 'English', native: 'English' },
  { code: 'bengali', name: 'Bengali', native: 'বাংলা' },
  { code: 'tamil', name: 'Tamil', native: 'தமிழ்' },
  { code: 'telugu', name: 'Telugu', native: 'తెలుగు' }
];

export function GuidedVoiceForm({ onComplete, onCancel, className }: GuidedVoiceFormProps) {
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
    setWhisperApiKey,
    toggleSpeechRecognitionMode,
    getSpeechRecognitionMode
  } = useGuidedVoice();

  const geoLocation = useGeolocation();
  const [selectedLanguage, setSelectedLanguage] = useState("hindi");
  const [manualInput, setManualInput] = useState("");
  const [showManualInput, setShowManualInput] = useState(false);
  const [whisperApiKey, setWhisperApiKeyState] = useState("");
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);

  useEffect(() => {
    setOnComplete(onComplete);
  }, [onComplete, setOnComplete]);

  const handleStart = async () => {
    const detectedLocation = geoLocation.locationName || undefined;
    await start(selectedLanguage, detectedLocation);
  };

  const handleStop = () => {
    stop();
    onCancel();
  };

  const handleApiKeySubmit = () => {
    if (whisperApiKey.trim()) {
      setWhisperApiKey(whisperApiKey.trim());
      setShowApiKeyInput(false);
      toast({
        title: "API Key Set",
        description: "Whisper Large V3 is now available for speech recognition",
      });
    }
  };

  const handleManualSubmit = () => {
    if (!manualInput.trim()) return;
    
    const currentStep = getCurrentStep();
    if (currentStep !== 'CONFIRM') {
      // Map state to field name
      const fieldMap: Record<string, keyof FormData> = {
        'ASK_NAME': 'name',
        'ASK_PRODUCT': 'product',
        'ASK_QUANTITY': 'quantity',
        'ASK_QUALITY': 'quality',
        'ASK_LOCATION': 'location'
      };
      
      const field = fieldMap[currentStep];
      if (field) {
        updateField(field, manualInput.trim());
      }
    }
    
    setManualInput("");
    setShowManualInput(false);
    
    toast({
      title: "Field Updated",
      description: `Field has been filled`,
    });
  };

  const handleFieldEdit = (field: keyof FormData, value: string) => {
    updateField(field, value);
  };

  const getStepProgress = () => {
    return ((state.currentState + 1) / 6) * 100; // 6 states total
  };

  const renderFormFields = () => {
    return (
      <div className="space-y-3">
        <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
          <Edit3 size={16} />
          Form Fields
        </h3>
        
        {Object.entries(FIELD_LABELS).map(([field, label]) => {
          const value = state.formData[field as keyof FormData];
          const currentStep = getCurrentStep();
          
          // Map current state to field name for highlighting
          const fieldMap: Record<string, string> = {
            'ASK_NAME': 'name',
            'ASK_PRODUCT': 'product',
            'ASK_QUANTITY': 'quantity',
            'ASK_QUALITY': 'quality',
            'ASK_LOCATION': 'location'
          };
          
          const isCurrentField = fieldMap[currentStep] === field;
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
                      // Show quality selector
                      const newValue = prompt(`Select quality (${QUALITY_OPTIONS.join(', ')}):`, value);
                      if (newValue && QUALITY_OPTIONS.includes(newValue as any)) {
                        handleFieldEdit(field as keyof FormData, newValue);
                      }
                    } else {
                      const newValue = prompt(`Edit ${label}:`, value);
                      if (newValue !== null) {
                        handleFieldEdit(field as keyof FormData, newValue);
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
            Guided Voice Form
          </h2>
          <p className="text-muted-foreground mb-6">
            Step-by-step voice interaction. One question at a time.
            <br />
            <span className="text-sm">
              Using: {getSpeechRecognitionMode() === 'whisper' ? 'Whisper Large V3 (High Accuracy)' : 'Browser Speech API (Basic)'}
            </span>
          </p>

          {/* Speech Recognition Configuration */}
          <div className="mb-6 p-4 rounded-xl bg-muted/20 border border-border">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-foreground">Speech Recognition</h3>
              <button
                onClick={toggleSpeechRecognitionMode}
                className="text-sm text-primary hover:underline"
              >
                Switch to {getSpeechRecognitionMode() === 'whisper' ? 'Browser' : 'Whisper V3'}
              </button>
            </div>
            
            {getSpeechRecognitionMode() === 'whisper' ? (
              <div className="space-y-2">
                <p className="text-sm text-green-600 font-medium">✓ Whisper Large V3 (High Accuracy)</p>
                <p className="text-xs text-muted-foreground">
                  Uses OpenAI's Whisper Large V3 model via Hugging Face for superior multilingual speech recognition
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-amber-600 font-medium">⚠ Browser Speech API (Basic)</p>
                <p className="text-xs text-muted-foreground">
                  Uses browser's built-in speech recognition. May have limited accuracy for Indian languages.
                </p>
                <button
                  onClick={() => setShowApiKeyInput(true)}
                  className="text-sm text-primary hover:underline"
                >
                  Configure Whisper API Key for better accuracy
                </button>
              </div>
            )}
          </div>

          {/* API Key Input */}
          <AnimatePresence>
            {showApiKeyInput && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-6 p-4 rounded-xl bg-blue-50 border border-blue-200"
              >
                <h4 className="font-medium text-blue-800 mb-2">Configure Whisper API Key</h4>
                <p className="text-sm text-blue-600 mb-3">
                  Get your free API key from{" "}
                  <a 
                    href="https://huggingface.co/settings/tokens" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="underline hover:no-underline"
                  >
                    Hugging Face
                  </a>
                </p>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={whisperApiKey}
                    onChange={(e) => setWhisperApiKeyState(e.target.value)}
                    placeholder="hf_..."
                    className="flex-1 px-3 py-2 rounded-lg bg-white border border-blue-300 text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    onKeyDown={(e) => e.key === 'Enter' && handleApiKeySubmit()}
                  />
                  <button
                    onClick={handleApiKeySubmit}
                    disabled={!whisperApiKey.trim()}
                    className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Set Key
                  </button>
                  <button
                    onClick={() => setShowApiKeyInput(false)}
                    className="px-4 py-2 rounded-lg bg-gray-500 text-white hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
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

          <div className="flex gap-3">
            <button
              onClick={handleStart}
              className="flex-1 flex items-center justify-center gap-3 py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-lg hover:bg-primary/90 transition-colors"
            >
              <Mic size={20} />
              Start Voice Form
            </button>
            
            {/* Debug: Skip Language Step */}
            {process.env.NODE_ENV === 'development' && (
              <button
                onClick={async () => {
                  const detectedLocation = geoLocation.locationName || "Test Location";
                  await start(selectedLanguage, detectedLocation);
                }}
                className="px-4 py-4 rounded-2xl bg-amber-500 text-white font-medium hover:bg-amber-600 transition-colors text-sm"
                title="Start with detected location"
              >
                Quick Start
              </button>
            )}
            
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
            <h2 className="font-bold text-foreground">Guided Voice Form</h2>
            <p className="text-sm text-muted-foreground">
              Step {state.currentState + 1} of 6 • {state.language} • {getSpeechRecognitionMode() === 'whisper' ? 'Whisper V3' : 'Browser STT'}
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

      {/* Debug Panel - Remove in production */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mb-4 p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-sm">
          <h4 className="font-semibold text-yellow-800 mb-2">Debug Info:</h4>
          <div className="space-y-1 text-yellow-700">
            <p><strong>Current Step:</strong> {getCurrentStep()} (Step {state.currentState + 1})</p>
            <p><strong>Language:</strong> {state.language}</p>
            <p><strong>Speech Recognition:</strong> {getSpeechRecognitionMode() === 'whisper' ? 'Whisper Large V3' : 'Browser Web Speech API'}</p>
            <p><strong>Last Transcript:</strong> "{state.lastTranscript}"</p>
            <p><strong>Is Listening:</strong> {state.isListening ? 'Yes' : 'No'}</p>
            <p><strong>Is Recording:</strong> {state.isRecording ? 'Yes' : 'No'}</p>
            <p><strong>Is Speaking:</strong> {state.isSpeaking ? 'Yes' : 'No'}</p>
            <p><strong>Is Retrying:</strong> {state.isRetrying ? 'Yes' : 'No'}</p>
            <p><strong>Form Data:</strong> {JSON.stringify(state.formData, null, 2)}</p>
          </div>
        </div>
      )}

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
              <p className="text-sm text-amber-600 mt-2">
                Please try again...
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Voice Controls */}
      <div className="mb-6">
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={state.isListening || state.isRecording ? stopListening : startListening}
            disabled={state.isSpeaking}
            className={cn(
              "w-16 h-16 rounded-2xl flex items-center justify-center font-bold text-lg transition-all",
              (state.isListening || state.isRecording)
                ? "bg-destructive text-destructive-foreground animate-pulse" 
                : "bg-primary text-primary-foreground hover:bg-primary/90",
              state.isSpeaking && "opacity-50 cursor-not-allowed"
            )}
          >
            {(state.isListening || state.isRecording) ? <MicOff size={24} /> : <Mic size={24} />}
          </button>
          
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">
              {state.isRecording ? "Recording..." : state.isListening ? "Listening..." : state.isSpeaking ? "Speaking..." : "Tap to speak"}
            </p>
            {state.lastTranscript && (
              <p className="text-xs text-muted-foreground mt-1">
                "{state.lastTranscript}"
              </p>
            )}
          </div>
        </div>

        {/* Manual Input Toggle */}
        <div className="text-center mt-4">
          <button
            onClick={() => setShowManualInput(!showManualInput)}
            className="text-sm text-primary hover:underline font-medium mr-4"
          >
            {showManualInput ? "Hide" : "Type instead"}
          </button>
          
          {/* Debug: Test Speech Recognition */}
          {process.env.NODE_ENV === 'development' && (
            <button
              onClick={() => {
                if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
                  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
                  const recognition = new SpeechRecognition();
                  recognition.continuous = false;
                  recognition.interimResults = true;
                  recognition.lang = 'en-US';
                  
                  recognition.onresult = (event) => {
                    const result = event.results[event.results.length - 1];
                    const transcript = result[0].transcript;
                    console.log('Test recognition result:', transcript);
                    toast({
                      title: "Speech Test Result",
                      description: `Heard: "${transcript}"`,
                    });
                  };
                  
                  recognition.onerror = (event) => {
                    console.error('Test recognition error:', event.error);
                    toast({
                      title: "Speech Test Error",
                      description: `Error: ${event.error}`,
                      variant: "destructive"
                    });
                  };
                  
                  recognition.start();
                } else {
                  toast({
                    title: "Speech Recognition Not Supported",
                    description: "Your browser doesn't support speech recognition",
                    variant: "destructive"
                  });
                }
              }}
              className="text-sm text-amber-600 hover:underline font-medium"
            >
              Test Speech
            </button>
          )}
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
                {getCurrentStep() === 'ASK_QUALITY' ? (
                  <select
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    className="flex-1 px-4 py-3 rounded-xl bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">Select quality...</option>
                    {QUALITY_OPTIONS.map(option => (
                      <option key={option} value={option}>
                        {option.charAt(0).toUpperCase() + option.slice(1)}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    placeholder="Type your answer..."
                    className="flex-1 px-4 py-3 rounded-xl bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                    onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
                  />
                )}
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

      {/* Form Fields */}
      {renderFormFields()}

      {/* Error Display */}
      {state.error && (
        <div className="mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
          <p className="text-sm text-destructive">{state.error}</p>
        </div>
      )}
    </div>
  );
}