import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Mic, MicOff, Volume2, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

interface SpeechDebuggerProps {
  onClose: () => void;
}

export function SpeechDebugger({ onClose }: SpeechDebuggerProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);
  const [capabilities, setCapabilities] = useState<any>({});
  const [testResults, setTestResults] = useState<string[]>([]);

  useEffect(() => {
    // Check browser capabilities
    const caps = {
      hasSpeechRecognition: !!(window.SpeechRecognition || window.webkitSpeechRecognition),
      hasSpeechSynthesis: !!window.speechSynthesis,
      userAgent: navigator.userAgent,
      language: navigator.language,
      languages: navigator.languages,
      platform: navigator.platform
    };
    setCapabilities(caps);

    // Initialize speech recognition
    if (caps.hasSpeechRecognition) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognitionInstance = new SpeechRecognition();
      
      recognitionInstance.continuous = false;
      recognitionInstance.interimResults = false;
      recognitionInstance.maxAlternatives = 3;
      recognitionInstance.lang = 'en-US';

      recognitionInstance.onstart = () => {
        console.log('Speech recognition started');
        setIsListening(true);
        setError(null);
      };

      recognitionInstance.onresult = (event) => {
        console.log('Speech recognition results:', event.results);
        
        if (event.results.length > 0) {
          const results = [];
          for (let i = 0; i < event.results.length; i++) {
            const result = event.results[i];
            for (let j = 0; j < result.length; j++) {
              results.push({
                transcript: result[j].transcript,
                confidence: result[j].confidence,
                isFinal: result.isFinal
              });
            }
          }
          
          const finalResult = results.find(r => r.isFinal);
          if (finalResult) {
            setTranscript(finalResult.transcript);
            setTestResults(prev => [...prev, `"${finalResult.transcript}" (confidence: ${finalResult.confidence?.toFixed(2) || 'N/A'})`]);
          }
        }
      };

      recognitionInstance.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setError(`Error: ${event.error}`);
        setIsListening(false);
      };

      recognitionInstance.onend = () => {
        console.log('Speech recognition ended');
        setIsListening(false);
      };

      setRecognition(recognitionInstance);
    }
  }, []);

  const startListening = () => {
    if (!recognition) {
      setError('Speech recognition not supported');
      return;
    }

    try {
      setTranscript('');
      setError(null);
      recognition.start();
    } catch (err) {
      setError(`Failed to start: ${err}`);
    }
  };

  const stopListening = () => {
    if (recognition && isListening) {
      recognition.stop();
    }
  };

  const testWithLanguage = (lang: string) => {
    if (!recognition) return;
    
    recognition.lang = lang;
    toast({
      title: "Language Changed",
      description: `Set to ${lang}`,
    });
    
    setTimeout(() => {
      startListening();
    }, 500);
  };

  const clearResults = () => {
    setTestResults([]);
    setTranscript('');
    setError(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
    >
      <div className="bg-background rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-foreground">Speech Recognition Debugger</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-muted hover:bg-muted/80 flex items-center justify-center"
          >
            ×
          </button>
        </div>

        {/* Browser Capabilities */}
        <div className="mb-6">
          <h3 className="font-semibold text-foreground mb-3">Browser Capabilities</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              {capabilities.hasSpeechRecognition ? (
                <CheckCircle size={16} className="text-success" />
              ) : (
                <AlertCircle size={16} className="text-destructive" />
              )}
              <span>Speech Recognition: {capabilities.hasSpeechRecognition ? 'Supported' : 'Not Supported'}</span>
            </div>
            <div className="flex items-center gap-2">
              {capabilities.hasSpeechSynthesis ? (
                <CheckCircle size={16} className="text-success" />
              ) : (
                <AlertCircle size={16} className="text-destructive" />
              )}
              <span>Speech Synthesis: {capabilities.hasSpeechSynthesis ? 'Supported' : 'Not Supported'}</span>
            </div>
            <div className="text-muted-foreground">
              <p>Language: {capabilities.language}</p>
              <p>Platform: {capabilities.platform}</p>
              <p className="text-xs break-all">User Agent: {capabilities.userAgent}</p>
            </div>
          </div>
        </div>

        {/* Speech Recognition Test */}
        <div className="mb-6">
          <h3 className="font-semibold text-foreground mb-3">Speech Recognition Test</h3>
          
          <div className="flex items-center justify-center gap-4 mb-4">
            <button
              onClick={isListening ? stopListening : startListening}
              disabled={!capabilities.hasSpeechRecognition}
              className={cn(
                "w-16 h-16 rounded-2xl flex items-center justify-center font-bold text-lg transition-all",
                isListening 
                  ? "bg-destructive text-destructive-foreground animate-pulse" 
                  : "bg-primary text-primary-foreground hover:bg-primary/90",
                !capabilities.hasSpeechRecognition && "opacity-50 cursor-not-allowed"
              )}
            >
              {isListening ? <MicOff size={24} /> : <Mic size={24} />}
            </button>
            
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">
                {isListening ? "Listening..." : "Tap to test"}
              </p>
              {transcript && (
                <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                  Last: "{transcript}"
                </p>
              )}
            </div>
          </div>

          {/* Language Test Buttons */}
          <div className="flex flex-wrap gap-2 justify-center mb-4">
            <button
              onClick={() => testWithLanguage('en-US')}
              className="px-3 py-1 rounded-lg bg-muted text-xs hover:bg-muted/80"
            >
              English (US)
            </button>
            <button
              onClick={() => testWithLanguage('hi-IN')}
              className="px-3 py-1 rounded-lg bg-muted text-xs hover:bg-muted/80"
            >
              Hindi (IN)
            </button>
            <button
              onClick={() => testWithLanguage('en-IN')}
              className="px-3 py-1 rounded-lg bg-muted text-xs hover:bg-muted/80"
            >
              English (IN)
            </button>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 mb-4">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
        </div>

        {/* Test Results */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-foreground">Test Results</h3>
            <button
              onClick={clearResults}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-muted text-xs hover:bg-muted/80"
            >
              <RefreshCw size={12} />
              Clear
            </button>
          </div>
          
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {testResults.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No test results yet. Try speaking!</p>
            ) : (
              testResults.map((result, index) => (
                <div key={index} className="p-2 rounded-lg bg-muted/20 text-sm">
                  <span className="text-muted-foreground">#{index + 1}:</span> {result}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="text-sm text-muted-foreground">
          <h4 className="font-medium text-foreground mb-2">Instructions:</h4>
          <ul className="space-y-1 text-xs">
            <li>• Click the microphone to start listening</li>
            <li>• Speak clearly into your microphone</li>
            <li>• Try different languages using the buttons above</li>
            <li>• Check the console for detailed logs</li>
            <li>• If you only get "tomato", there might be a caching issue</li>
          </ul>
        </div>
      </div>
    </motion.div>
  );
}