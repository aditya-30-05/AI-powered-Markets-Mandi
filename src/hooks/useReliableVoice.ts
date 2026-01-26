import { useState, useEffect, useCallback } from 'react';
import { reliableVoiceService, VoiceState, VoiceFormData } from '@/services/reliableVoiceService';

export function useReliableVoice() {
  const [state, setState] = useState<VoiceState>(reliableVoiceService.getState());

  useEffect(() => {
    // Subscribe to state changes
    reliableVoiceService.setOnStateChange(setState);
    
    return () => {
      // Cleanup
      reliableVoiceService.stop();
    };
  }, []);

  const start = useCallback(async (initialLanguage?: string, detectedLocation?: string) => {
    await reliableVoiceService.start(initialLanguage, detectedLocation);
  }, []);

  const stop = useCallback(() => {
    reliableVoiceService.stop();
  }, []);

  const startListening = useCallback(() => {
    reliableVoiceService.startListening();
  }, []);

  const stopListening = useCallback(() => {
    reliableVoiceService.stopListening();
  }, []);

  const updateField = useCallback((field: keyof VoiceFormData, value: string) => {
    reliableVoiceService.updateField(field, value);
  }, []);

  const setOnComplete = useCallback((callback: (data: VoiceFormData) => void) => {
    reliableVoiceService.setOnComplete(callback);
  }, []);

  const getCurrentStep = useCallback(() => {
    return reliableVoiceService.getCurrentStep();
  }, []);

  const getCurrentQuestion = useCallback(() => {
    return reliableVoiceService.getCurrentQuestion();
  }, []);

  const goToStep = useCallback((stepIndex: number) => {
    reliableVoiceService.goToStep(stepIndex);
  }, []);

  const processManualInput = useCallback(async (input: string) => {
    await reliableVoiceService.processManualInput(input);
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
    processManualInput
  };
}