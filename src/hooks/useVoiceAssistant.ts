import { useState, useEffect, useCallback } from 'react';
import { voiceAssistantService, VoiceAssistantState, VoiceFormData } from '@/services/voiceAssistantService';

export function useVoiceAssistant() {
  const [state, setState] = useState<VoiceAssistantState>(voiceAssistantService.getState());

  useEffect(() => {
    // Subscribe to state changes
    voiceAssistantService.setOnStateChange(setState);
    
    return () => {
      // Cleanup
      voiceAssistantService.stop();
    };
  }, []);

  const start = useCallback(async (initialLanguage?: string, location?: string) => {
    await voiceAssistantService.start(initialLanguage, location);
  }, []);

  const stop = useCallback(() => {
    voiceAssistantService.stop();
  }, []);

  const startListening = useCallback(() => {
    voiceAssistantService.startListening();
  }, []);

  const stopListening = useCallback(() => {
    voiceAssistantService.stopListening();
  }, []);

  const skipToNextStep = useCallback(() => {
    voiceAssistantService.skipToNextStep();
  }, []);

  const goToPreviousStep = useCallback(() => {
    voiceAssistantService.goToPreviousStep();
  }, []);

  const updateFormField = useCallback((field: keyof VoiceFormData, value: string) => {
    voiceAssistantService.updateFormField(field, value);
  }, []);

  const setOnComplete = useCallback((callback: (data: VoiceFormData) => void) => {
    voiceAssistantService.onComplete = callback;
  }, []);

  const getCurrentStepInfo = useCallback(() => {
    return voiceAssistantService.getCurrentStepInfo();
  }, []);

  return {
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
  };
}