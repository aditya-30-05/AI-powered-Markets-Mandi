import { useState, useCallback } from 'react';
import { multilingualMandiAI, ProductInput, AIResponse } from '@/services/aiService';

export interface MandiAIState {
  loading: boolean;
  error: string | null;
  response: AIResponse | null;
}

export interface UseMandiAIReturn {
  state: MandiAIState;
  processRequest: (input: ProductInput) => Promise<void>;
  playAudio: (text: string, language: string) => Promise<void>;
  clearError: () => void;
  reset: () => void;
}

/**
 * React hook for integrating Multilingual Mandi AI services
 */
export function useMandiAI(): UseMandiAIReturn {
  const [state, setState] = useState<MandiAIState>({
    loading: false,
    error: null,
    response: null
  });

  const processRequest = useCallback(async (input: ProductInput) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await multilingualMandiAI.processVendorRequest(input);
      setState(prev => ({ ...prev, loading: false, response }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: errorMessage,
        response: null 
      }));
    }
  }, []);

  const playAudio = useCallback(async (text: string, language: string) => {
    try {
      // Use the voice service to play audio
      await multilingualMandiAI['voiceService'].playAudio(text, language);
    } catch (error) {
      console.error('Audio playback error:', error);
      throw error;
    }
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const reset = useCallback(() => {
    setState({
      loading: false,
      error: null,
      response: null
    });
  }, []);

  return {
    state,
    processRequest,
    playAudio,
    clearError,
    reset
  };
}

/**
 * Hook for managing voice playback state
 */
export function useVoicePlayback() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<string | null>(null);

  const playAudio = useCallback(async (text: string, language: string) => {
    if (isPlaying) {
      // Stop current playback
      speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }

    setIsPlaying(true);
    setCurrentAudio(text);

    try {
      await new Promise<void>((resolve, reject) => {
        if (!('speechSynthesis' in window)) {
          reject(new Error('Speech synthesis not supported'));
          return;
        }

        const utterance = new SpeechSynthesisUtterance(text);
        
        // Configure voice for Indian languages
        const voiceConfigs: Record<string, { lang: string; rate: number; pitch: number }> = {
          'hi': { lang: 'hi-IN', rate: 0.9, pitch: 1.0 },
          'en': { lang: 'en-IN', rate: 1.0, pitch: 1.0 },
          'hindi': { lang: 'hi-IN', rate: 0.9, pitch: 1.0 },
          'english': { lang: 'en-IN', rate: 1.0, pitch: 1.0 }
        };

        const config = voiceConfigs[language.toLowerCase()] || voiceConfigs['hi'];
        utterance.lang = config.lang;
        utterance.rate = config.rate;
        utterance.pitch = config.pitch;

        utterance.onend = () => {
          setIsPlaying(false);
          setCurrentAudio(null);
          resolve();
        };

        utterance.onerror = (error) => {
          setIsPlaying(false);
          setCurrentAudio(null);
          reject(error);
        };

        // Cancel any ongoing speech and start new one
        speechSynthesis.cancel();
        speechSynthesis.speak(utterance);
      });
    } catch (error) {
      setIsPlaying(false);
      setCurrentAudio(null);
      throw error;
    }
  }, [isPlaying]);

  const stopAudio = useCallback(() => {
    speechSynthesis.cancel();
    setIsPlaying(false);
    setCurrentAudio(null);
  }, []);

  return {
    isPlaying,
    currentAudio,
    playAudio,
    stopAudio
  };
}