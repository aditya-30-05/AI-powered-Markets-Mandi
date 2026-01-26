import { useState } from "react";
import { motion } from "framer-motion";
import { Mic, Settings, Zap, Globe, Shield, CheckCircle } from "lucide-react";
import { whisperService } from "@/services/whisperService";
import { toast } from "@/hooks/use-toast";

export function WhisperDemo() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [isConfigured, setIsConfigured] = useState(whisperService.isConfigured());

  const handleApiKeySubmit = () => {
    if (apiKey.trim()) {
      whisperService.setApiKey(apiKey.trim());
      setIsConfigured(true);
      setShowApiKeyInput(false);
      toast({
        title: "API Key Configured",
        description: "Whisper Large V3 is now ready for use",
      });
    }
  };

  const handleRecord = async () => {
    if (!isConfigured) {
      toast({
        title: "API Key Required",
        description: "Please configure your Hugging Face API key first",
        variant: "destructive"
      });
      return;
    }

    setIsRecording(true);
    setTranscription("Recording...");

    try {
      const result = await whisperService.recordAndTranscribe(5000, 'en');
      
      if (result.success) {
        setTranscription(result.text);
        toast({
          title: "Transcription Complete",
          description: `Confidence: ${Math.round((result.confidence || 0) * 100)}%`,
        });
      } else {
        setTranscription(`Error: ${result.error}`);
        toast({
          title: "Transcription Failed",
          description: result.error,
          variant: "destructive"
        });
      }
    } catch (error) {
      setTranscription(`Error: ${error}`);
      toast({
        title: "Recording Failed",
        description: "Please check microphone permissions",
        variant: "destructive"
      });
    } finally {
      setIsRecording(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Whisper Large V3 Integration
        </h1>
        <p className="text-muted-foreground">
          High-accuracy speech recognition powered by OpenAI's Whisper Large V3 via Hugging Face
        </p>
      </div>

      {/* Features Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200">
          <Zap className="w-8 h-8 text-blue-600 mb-2" />
          <h3 className="font-semibold text-blue-800">High Accuracy</h3>
          <p className="text-sm text-blue-600">Superior transcription quality</p>
        </div>
        
        <div className="p-4 rounded-xl bg-gradient-to-br from-green-50 to-green-100 border border-green-200">
          <Globe className="w-8 h-8 text-green-600 mb-2" />
          <h3 className="font-semibold text-green-800">Multilingual</h3>
          <p className="text-sm text-green-600">90+ languages supported</p>
        </div>
        
        <div className="p-4 rounded-xl bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200">
          <Shield className="w-8 h-8 text-purple-600 mb-2" />
          <h3 className="font-semibold text-purple-800">Robust</h3>
          <p className="text-sm text-purple-600">Handles noise and accents</p>
        </div>
        
        <div className="p-4 rounded-xl bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200">
          <Settings className="w-8 h-8 text-amber-600 mb-2" />
          <h3 className="font-semibold text-amber-800">Easy Setup</h3>
          <p className="text-sm text-amber-600">Simple API key configuration</p>
        </div>
      </div>

      {/* Configuration Section */}
      {!isConfigured && (
        <div className="mb-8 p-6 rounded-xl bg-blue-50 border border-blue-200">
          <h2 className="text-xl font-semibold text-blue-800 mb-4">Setup Required</h2>
          <p className="text-blue-600 mb-4">
            To use Whisper Large V3, you need a free Hugging Face API key.
          </p>
          
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-blue-600">
              <CheckCircle size={16} />
              <span>Go to <a href="https://huggingface.co/settings/tokens" target="_blank" rel="noopener noreferrer" className="underline">Hugging Face Settings</a></span>
            </div>
            <div className="flex items-center gap-2 text-sm text-blue-600">
              <CheckCircle size={16} />
              <span>Create a new token with "Read" permissions</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-blue-600">
              <CheckCircle size={16} />
              <span>Copy the token and paste it below</span>
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="hf_..."
              className="flex-1 px-4 py-2 rounded-lg bg-white border border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              onKeyDown={(e) => e.key === 'Enter' && handleApiKeySubmit()}
            />
            <button
              onClick={handleApiKeySubmit}
              disabled={!apiKey.trim()}
              className="px-6 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Configure
            </button>
          </div>
        </div>
      )}

      {/* Demo Section */}
      <div className="mb-8 p-6 rounded-xl bg-white border border-border shadow-sm">
        <h2 className="text-xl font-semibold text-foreground mb-4">Try It Out</h2>
        
        <div className="text-center mb-6">
          <button
            onClick={handleRecord}
            disabled={isRecording || !isConfigured}
            className={`
              w-20 h-20 rounded-full flex items-center justify-center text-white font-bold text-lg transition-all
              ${isRecording 
                ? 'bg-red-500 animate-pulse' 
                : isConfigured 
                  ? 'bg-blue-600 hover:bg-blue-700' 
                  : 'bg-gray-400 cursor-not-allowed'
              }
            `}
          >
            <Mic size={32} />
          </button>
          
          <p className="mt-3 text-sm text-muted-foreground">
            {isRecording ? "Recording for 5 seconds..." : "Click to record"}
          </p>
        </div>

        {/* Transcription Result */}
        <div className="p-4 rounded-lg bg-muted/20 border border-border min-h-[100px]">
          <h3 className="font-medium text-foreground mb-2">Transcription:</h3>
          <p className="text-foreground">
            {transcription || "Your transcription will appear here..."}
          </p>
        </div>
      </div>

      {/* Supported Languages */}
      <div className="mb-8 p-6 rounded-xl bg-gradient-to-r from-green-50 to-blue-50 border border-green-200">
        <h2 className="text-xl font-semibold text-foreground mb-4">Supported Indian Languages</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { name: "Hindi", code: "hi", native: "हिंदी" },
            { name: "Bengali", code: "bn", native: "বাংলা" },
            { name: "Tamil", code: "ta", native: "தமிழ்" },
            { name: "Telugu", code: "te", native: "తెలుగు" },
            { name: "Marathi", code: "mr", native: "मराठी" },
            { name: "Gujarati", code: "gu", native: "ગુજરાતી" },
            { name: "Kannada", code: "kn", native: "ಕನ್ನಡ" },
            { name: "Malayalam", code: "ml", native: "മലയാളം" }
          ].map((lang) => (
            <div key={lang.code} className="p-3 rounded-lg bg-white border border-green-200">
              <div className="font-medium text-green-800">{lang.name}</div>
              <div className="text-sm text-green-600">{lang.native}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Technical Details */}
      <div className="p-6 rounded-xl bg-gray-50 border border-gray-200">
        <h2 className="text-xl font-semibold text-foreground mb-4">Technical Details</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-medium text-foreground mb-2">Model Specifications</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Model: openai/whisper-large-v3</li>
              <li>• Parameters: 1.55B</li>
              <li>• Languages: 90+</li>
              <li>• Audio Format: 16kHz, Mono</li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium text-foreground mb-2">Performance</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• First request: 10-20 seconds</li>
              <li>• Subsequent: 2-5 seconds</li>
              <li>• Accuracy: 95%+ for clear speech</li>
              <li>• Confidence scores included</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}