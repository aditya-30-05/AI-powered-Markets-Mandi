import { describe, it, expect, beforeEach } from 'vitest';
import { ReliableVoiceService } from '@/services/reliableVoiceService';

describe('Reliable Voice Service', () => {
  let reliableVoice: ReliableVoiceService;

  beforeEach(() => {
    reliableVoice = new ReliableVoiceService();
  });

  it('should initialize with correct default state', () => {
    const state = reliableVoice.getState();
    
    expect(state.isActive).toBe(false);
    expect(state.isListening).toBe(false);
    expect(state.isSpeaking).toBe(false);
    expect(state.currentStep).toBe(0);
    expect(state.language).toBe('hindi');
    expect(state.recognitionMethod).toBe('browser');
    expect(state.formData.name).toBe('');
    expect(state.formData.product).toBe('');
    expect(state.formData.quantity).toBe('');
    expect(state.formData.quality).toBe('');
    expect(state.formData.location).toBe('');
  });

  it('should have correct step progression', () => {
    expect(reliableVoice.getCurrentStep()).toBe('language');
    
    // Simulate moving through steps
    const service = reliableVoice as any;
    service.state.currentStep = 1;
    expect(reliableVoice.getCurrentStep()).toBe('name');
    
    service.state.currentStep = 2;
    expect(reliableVoice.getCurrentStep()).toBe('product');
    
    service.state.currentStep = 3;
    expect(reliableVoice.getCurrentStep()).toBe('quantity');
    
    service.state.currentStep = 4;
    expect(reliableVoice.getCurrentStep()).toBe('quality');
    
    service.state.currentStep = 5;
    expect(reliableVoice.getCurrentStep()).toBe('location');
    
    service.state.currentStep = 6;
    expect(reliableVoice.getCurrentStep()).toBe('confirmation');
  });

  it('should update form fields correctly', () => {
    reliableVoice.updateField('name', 'Test Vendor');
    reliableVoice.updateField('product', 'Tomato');
    reliableVoice.updateField('quantity', '50 kg');
    reliableVoice.updateField('quality', 'good');
    reliableVoice.updateField('location', 'Delhi');
    
    const state = reliableVoice.getState();
    expect(state.formData.name).toBe('Test Vendor');
    expect(state.formData.product).toBe('Tomato');
    expect(state.formData.quantity).toBe('50 kg');
    expect(state.formData.quality).toBe('good');
    expect(state.formData.location).toBe('Delhi');
  });

  it('should get current question correctly', () => {
    const service = reliableVoice as any;
    
    // Test language step
    service.state.currentStep = 0;
    service.state.language = 'hindi';
    const question = reliableVoice.getCurrentQuestion();
    expect(question).toContain('आप किस भाषा में');
    
    // Test name step
    service.state.currentStep = 1;
    const nameQuestion = reliableVoice.getCurrentQuestion();
    expect(nameQuestion).toContain('आपका नाम');
  });

  it('should detect language from speech correctly', () => {
    const service = reliableVoice as any;
    
    // Test Hindi detection
    expect(service.detectLanguageFromSpeech('मैं हिंदी में बात करना चाहता हूं')).toBe('hindi');
    expect(service.detectLanguageFromSpeech('I want to speak in Hindi')).toBe('hindi');
    
    // Test English detection
    expect(service.detectLanguageFromSpeech('I want to speak in English')).toBe('english');
    
    // Test Hindi script detection
    expect(service.detectLanguageFromSpeech('टमाटर')).toBe('hindi');
    
    // Test English script detection
    expect(service.detectLanguageFromSpeech('tomato')).toBe('english');
  });

  it('should normalize quality values correctly', () => {
    const service = reliableVoice as any;
    
    // Test English quality terms
    expect(service.normalizeQuality('good quality')).toBe('good');
    expect(service.normalizeQuality('average quality')).toBe('average');
    expect(service.normalizeQuality('premium quality')).toBe('premium');
    
    // Test Hindi quality terms
    expect(service.normalizeQuality('अच्छा है')).toBe('good');
    expect(service.normalizeQuality('साधारण है')).toBe('average');
    expect(service.normalizeQuality('प्रीमियम है')).toBe('premium');
    
    // Test invalid quality
    expect(service.normalizeQuality('unknown quality')).toBe(null);
  });

  it('should detect positive confirmation correctly', () => {
    const service = reliableVoice as any;
    
    // Test positive confirmations
    expect(service.isConfirmationPositive('हाँ सही है')).toBe(true);
    expect(service.isConfirmationPositive('Yes, that is correct')).toBe(true);
    expect(service.isConfirmationPositive('जी ठीक है')).toBe(true);
    expect(service.isConfirmationPositive('ok')).toBe(true);
    expect(service.isConfirmationPositive('okay')).toBe(true);
    
    // Test negative confirmations
    expect(service.isConfirmationPositive('नहीं गलत है')).toBe(false);
    expect(service.isConfirmationPositive('No, that is wrong')).toBe(false);
  });

  it('should get browser language codes correctly', () => {
    const service = reliableVoice as any;
    
    expect(service.getBrowserLanguageCode('hindi')).toBe('hi-IN');
    expect(service.getBrowserLanguageCode('english')).toBe('en-US');
    expect(service.getBrowserLanguageCode('unknown')).toBe('en-US'); // fallback
  });

  it('should handle step navigation correctly', () => {
    reliableVoice.goToStep(3);
    expect(reliableVoice.getCurrentStep()).toBe('quantity');
    
    reliableVoice.goToStep(0);
    expect(reliableVoice.getCurrentStep()).toBe('language');
    
    reliableVoice.goToStep(6);
    expect(reliableVoice.getCurrentStep()).toBe('confirmation');
    
    // Test invalid step
    reliableVoice.goToStep(10);
    expect(reliableVoice.getCurrentStep()).toBe('confirmation'); // Should not change
  });

  it('should process manual input correctly', async () => {
    const service = reliableVoice as any;
    
    // Mock the handleSpeechResult method
    let processedInput = '';
    service.handleSpeechResult = (input: string) => {
      processedInput = input;
    };
    
    await reliableVoice.processManualInput('test input');
    expect(processedInput).toBe('test input');
  });

  it('should maintain form data integrity', () => {
    const testData = {
      name: 'राम शर्मा',
      product: 'टमाटर',
      quantity: '50 किलो',
      quality: 'good' as const,
      location: 'दिल्ली',
      language: 'hindi'
    };

    Object.entries(testData).forEach(([key, value]) => {
      reliableVoice.updateField(key as keyof typeof testData, value);
    });

    const state = reliableVoice.getState();
    expect(state.formData).toEqual(testData);
  });
});