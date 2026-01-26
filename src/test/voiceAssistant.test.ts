import { describe, it, expect, beforeEach } from 'vitest';
import { VoiceAssistantService } from '@/services/voiceAssistantService';

describe('Voice Assistant Service', () => {
  let voiceAssistant: VoiceAssistantService;

  beforeEach(() => {
    voiceAssistant = new VoiceAssistantService();
  });

  it('should initialize with correct default state', () => {
    const state = voiceAssistant.getState();
    
    expect(state.isActive).toBe(false);
    expect(state.isListening).toBe(false);
    expect(state.isSpeaking).toBe(false);
    expect(state.currentStep).toBe(0);
    expect(state.selectedLanguage).toBe('hindi');
    expect(state.formData).toEqual({});
    expect(state.steps).toHaveLength(8); // greeting, language, name, product, quantity, quality, location, confirmation
  });

  it('should have proper step structure', () => {
    const state = voiceAssistant.getState();
    const stepIds = state.steps.map(step => step.id);
    
    expect(stepIds).toEqual([
      'greeting',
      'language', 
      'name',
      'product',
      'quantity',
      'quality',
      'location',
      'confirmation'
    ]);
  });

  it('should have questions in multiple languages', () => {
    const state = voiceAssistant.getState();
    const nameStep = state.steps.find(step => step.id === 'name');
    
    expect(nameStep?.question).toHaveProperty('hindi');
    expect(nameStep?.question).toHaveProperty('english');
    expect(nameStep?.question).toHaveProperty('bengali');
    expect(nameStep?.question).toHaveProperty('tamil');
    expect(nameStep?.question).toHaveProperty('telugu');
  });

  it('should update form field correctly', () => {
    voiceAssistant.updateFormField('name', 'Test Vendor');
    voiceAssistant.updateFormField('product', 'Tomato');
    
    const state = voiceAssistant.getState();
    expect(state.formData.name).toBe('Test Vendor');
    expect(state.formData.product).toBe('Tomato');
  });

  it('should get current step info correctly', () => {
    const stepInfo = voiceAssistant.getCurrentStepInfo();
    
    expect(stepInfo.stepNumber).toBe(1);
    expect(stepInfo.totalSteps).toBe(8);
    expect(stepInfo.step.id).toBe('greeting');
    expect(stepInfo.question).toBeDefined();
  });

  it('should handle language detection from speech', () => {
    const service = voiceAssistant as any; // Access private methods for testing
    
    // Test Hindi detection
    expect(service.detectLanguageFromSpeech('मैं हिंदी में बात करना चाहता हूं')).toBe('hindi');
    expect(service.detectLanguageFromSpeech('I want to speak in Hindi')).toBe('hindi');
    
    // Test English detection
    expect(service.detectLanguageFromSpeech('I want to speak in English')).toBe('english');
    
    // Test Bengali detection
    expect(service.detectLanguageFromSpeech('আমি বাংলায় কথা বলতে চাই')).toBe('bengali');
  });

  it('should process field values correctly', () => {
    const service = voiceAssistant as any; // Access private methods for testing
    
    // Test quantity processing
    expect(service.processFieldValue('quantity', '50 किलो टमाटर')).toBe('50 किलो');
    expect(service.processFieldValue('quantity', '100 kg onions')).toBe('100 kg');
    
    // Test quality processing
    expect(service.processFieldValue('quality', 'बहुत अच्छा है')).toBe('Very Good');
    expect(service.processFieldValue('quality', 'good quality')).toBe('Good');
    
    // Test regular field processing
    expect(service.processFieldValue('name', '  राम शर्मा  ')).toBe('राम शर्मा');
  });

  it('should detect positive confirmation correctly', () => {
    const service = voiceAssistant as any; // Access private methods for testing
    
    expect(service.isConfirmationPositive('हाँ सही है')).toBe(true);
    expect(service.isConfirmationPositive('Yes, that is correct')).toBe(true);
    expect(service.isConfirmationPositive('জি ঠিক আছে')).toBe(true);
    expect(service.isConfirmationPositive('சரி')).toBe(true);
    
    expect(service.isConfirmationPositive('नहीं गलत है')).toBe(false);
    expect(service.isConfirmationPositive('No, that is wrong')).toBe(false);
  });

  it('should get browser language codes correctly', () => {
    const service = voiceAssistant as any; // Access private methods for testing
    
    expect(service.getBrowserLanguageCode('hindi')).toBe('hi-IN');
    expect(service.getBrowserLanguageCode('english')).toBe('en-IN');
    expect(service.getBrowserLanguageCode('bengali')).toBe('bn-IN');
    expect(service.getBrowserLanguageCode('tamil')).toBe('ta-IN');
    expect(service.getBrowserLanguageCode('unknown')).toBe('hi-IN'); // fallback
  });
});