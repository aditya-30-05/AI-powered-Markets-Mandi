import { useState, useEffect, useCallback } from 'react';
import { guidedVoiceService, VoiceState, FormData } from '@/services/guidedVoiceService';

export function useGuidedVoice() {
  const [state, setState] = useState<VoiceState>(guidedVoiceService.getState());

  useEffect(() => {
    // Subscribe to state changes
    guidedVoiceService.setOnStateChange(setState);
    
    return () => {
      // Cleanup
      guidedVoiceService.stop();
    };
  }, []);

  const start = useCallback(async (initialLanguage?: string, detectedLocation?: string) => {
    await guidedVoiceService.start(initialLanguage, detectedLocation);
  }, []);

  const stop = useCallback(() => {
    guidedVoiceService.stop();
  }, []);

  const startListening = useCallback(() => {
    guidedVoiceService.startListening();
  }, []);

  const stopListening = useCallback(() => {
    guidedVoiceService.stopListening();
  }, []);

  const updateField = useCallback((field: keyof FormData, value: string) => {
    guidedVoiceService.updateField(field, value);
  }, []);

  const setOnComplete = useCallback((callback: (data: FormData) => void) => {
    guidedVoiceService.setOnComplete(callback);
  }, []);

  const getCurrentStep = useCallback(() => {
    return guidedVoiceService.getCurrentStep();
  }, []);

  const getCurrentQuestion = useCallback(() => {
    return guidedVoiceService.getCurrentQuestion();
  }, []);

  const goToStep = useCallback((stepIndex: number) => {
    guidedVoiceService.goToStep(stepIndex);
  }, []);

  const setWhisperApiKey = useCallback((apiKey: string) => {
    guidedVoiceService.setWhisperApiKey(apiKey);
  }, []);

  const toggleSpeechRecognitionMode = useCallback(() => {
    guidedVoiceService.toggleSpeechRecognitionMode();
  }, []);

  const getSpeechRecognitionMode = useCallback(() => {
    return guidedVoiceService.getSpeechRecognitionMode();
  }, []);

  return {
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
    setWhisperApiKey,
    toggleSpeechRecognitionMode,
    getSpeechRecognitionMode
  };
}