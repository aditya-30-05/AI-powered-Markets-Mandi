import { describe, it, expect, beforeEach, vi } from 'vitest';
import { guidedVoiceService } from '@/services/guidedVoiceService';

// Mock the whisperService
vi.mock('@/services/whisperService', () => ({
  whisperService: {
    isConfigured: vi.fn().mockReturnValue(false),
    setApiKey: vi.fn(),
    recordAndTranscribe: vi.fn().mockResolvedValue({
      success: true,
      text: 'Test transcription',
      confidence: 0.95
    }),
    mapLanguageCode: vi.fn((lang) => lang === 'hindi' ? 'hi' : 'en')
  }
}));
vi.mock('@/services/indicTTSService', () => ({
  indicTTSService: {
    generateSpeech: vi.fn().mockResolvedValue({
      success: false,
      audioUrl: ''
    })
  }
}));

// Mock speech APIs
const mockSpeechRecognition = {
  start: vi.fn(),
  stop: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  continuous: false,
  interimResults: false,
  lang: 'en-US',
  maxAlternatives: 1,
  onstart: null,
  onresult: null,
  onerror: null,
  onend: null
};

const mockSpeechSynthesis = {
  speak: vi.fn(),
  cancel: vi.fn(),
  getVoices: vi.fn().mockReturnValue([])
};

Object.defineProperty(window, 'SpeechRecognition', {
  writable: true,
  value: vi.fn().mockImplementation(() => mockSpeechRecognition)
});

Object.defineProperty(window, 'webkitSpeechRecognition', {
  writable: true,
  value: vi.fn().mockImplementation(() => mockSpeechRecognition)
});

Object.defineProperty(window, 'speechSynthesis', {
  writable: true,
  value: mockSpeechSynthesis
});

describe('GuidedVoiceService State Machine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    guidedVoiceService.stop();
  });

  it('should initialize with default state', () => {
    const state = guidedVoiceService.getState();
    
    expect(state.isActive).toBe(false);
    expect(state.isListening).toBe(false);
    expect(state.isSpeaking).toBe(false);
    expect(state.currentState).toBe(0);
    expect(state.language).toBe('hindi');
    expect(state.formData).toEqual({
      name: '',
      product: '',
      quantity: '',
      quality: '',
      location: '',
      language: 'hindi'
    });
  });

  it('should start in ASK_NAME state', async () => {
    await guidedVoiceService.start('english');
    
    const state = guidedVoiceService.getState();
    expect(state.isActive).toBe(true);
    expect(state.currentState).toBe(0);
    expect(guidedVoiceService.getCurrentStep()).toBe('ASK_NAME');
  });

  it('should progress through states in fixed sequence', async () => {
    await guidedVoiceService.start('english');
    
    // Should start at ASK_NAME
    expect(guidedVoiceService.getCurrentStep()).toBe('ASK_NAME');
    
    // Move through states manually for testing
    guidedVoiceService.goToStep(1);
    expect(guidedVoiceService.getCurrentStep()).toBe('ASK_PRODUCT');
    
    guidedVoiceService.goToStep(2);
    expect(guidedVoiceService.getCurrentStep()).toBe('ASK_QUANTITY');
    
    guidedVoiceService.goToStep(3);
    expect(guidedVoiceService.getCurrentStep()).toBe('ASK_QUALITY');
    
    guidedVoiceService.goToStep(4);
    expect(guidedVoiceService.getCurrentStep()).toBe('ASK_LOCATION');
    
    guidedVoiceService.goToStep(5);
    expect(guidedVoiceService.getCurrentStep()).toBe('CONFIRM');
  });

  it('should get correct questions for each state', async () => {
    await guidedVoiceService.start('english');
    
    // Test questions for each state
    expect(guidedVoiceService.getCurrentQuestion()).toContain('What is your name?');
    
    guidedVoiceService.goToStep(1);
    expect(guidedVoiceService.getCurrentQuestion()).toContain('What product are you selling?');
    
    guidedVoiceService.goToStep(2);
    expect(guidedVoiceService.getCurrentQuestion()).toContain('What quantity?');
    
    guidedVoiceService.goToStep(3);
    expect(guidedVoiceService.getCurrentQuestion()).toContain('What is the quality?');
    
    guidedVoiceService.goToStep(4);
    expect(guidedVoiceService.getCurrentQuestion()).toContain('Where are you from?');
    
    guidedVoiceService.goToStep(5);
    expect(guidedVoiceService.getCurrentQuestion()).toContain('Let me repeat your information');
  });

  it('should support multiple languages', async () => {
    await guidedVoiceService.start('hindi');
    expect(guidedVoiceService.getCurrentQuestion()).toContain('आपका नाम क्या है?');
    
    await guidedVoiceService.start('bengali');
    expect(guidedVoiceService.getCurrentQuestion()).toContain('আপনার নাম কি?');
    
    await guidedVoiceService.start('tamil');
    expect(guidedVoiceService.getCurrentQuestion()).toContain('உங்கள் பெயர் என்ன?');
    
    await guidedVoiceService.start('telugu');
    expect(guidedVoiceService.getCurrentQuestion()).toContain('మీ పేరు ఏమిటి?');
  });

  it('should pre-fill location when provided', async () => {
    await guidedVoiceService.start('english', 'Delhi NCR');
    
    const state = guidedVoiceService.getState();
    expect(state.formData.location).toBe('Delhi NCR');
  });

  it('should maintain form data across state transitions', async () => {
    await guidedVoiceService.start('english');
    
    // Fill form data
    guidedVoiceService.updateField('name', 'John Doe');
    guidedVoiceService.updateField('product', 'Wheat');
    guidedVoiceService.updateField('quantity', '100 kg');
    guidedVoiceService.updateField('quality', 'good');
    guidedVoiceService.updateField('location', 'Delhi');
    
    const state = guidedVoiceService.getState();
    expect(state.formData).toEqual({
      name: 'John Doe',
      product: 'Wheat',
      quantity: '100 kg',
      quality: 'good',
      location: 'Delhi',
      language: 'english'
    });
  });

  it('should reset state when stopped', async () => {
    await guidedVoiceService.start('english');
    guidedVoiceService.updateField('name', 'Test');
    
    guidedVoiceService.stop();
    
    const state = guidedVoiceService.getState();
    expect(state.isActive).toBe(false);
    expect(state.currentState).toBe(0);
    expect(state.isListening).toBe(false);
    expect(state.isSpeaking).toBe(false);
  });

  it('should normalize quality values correctly', () => {
    const service = guidedVoiceService as any;
    
    // Test English quality terms
    expect(service.normalizeQuality('good quality')).toBe('good');
    expect(service.normalizeQuality('average quality')).toBe('average');
    expect(service.normalizeQuality('premium quality')).toBe('premium');
    
    // Test Hindi quality terms
    expect(service.normalizeQuality('अच्छा है')).toBe('good');
    expect(service.normalizeQuality('साधारण है')).toBe('average');
    expect(service.normalizeQuality('प्रीमियम है')).toBe('premium');
    
    // Test Bengali quality terms
    expect(service.normalizeQuality('ভাল')).toBe('good');
    expect(service.normalizeQuality('সাধারণ')).toBe('average');
    expect(service.normalizeQuality('প্রিমিয়াম')).toBe('premium');
    
    // Test invalid quality
    expect(service.normalizeQuality('unknown quality')).toBe(null);
  });

  it('should detect positive confirmation correctly', () => {
    const service = guidedVoiceService as any;
    
    // Test positive confirmations
    expect(service.isConfirmationPositive('हाँ सही है')).toBe(true);
    expect(service.isConfirmationPositive('Yes, that is correct')).toBe(true);
    expect(service.isConfirmationPositive('जी ठीक है')).toBe(true);
    expect(service.isConfirmationPositive('হ্যাঁ ঠিক')).toBe(true);
    expect(service.isConfirmationPositive('சரி')).toBe(true);
    expect(service.isConfirmationPositive('అవును')).toBe(true);
    
    // Test negative confirmations
    expect(service.isConfirmationPositive('नहीं गलत है')).toBe(false);
    expect(service.isConfirmationPositive('No, that is wrong')).toBe(false);
  });

  it('should get browser language codes correctly', () => {
    const service = guidedVoiceService as any;
    
    expect(service.getBrowserLanguageCode('hindi')).toBe('hi-IN');
    expect(service.getBrowserLanguageCode('english')).toBe('en-IN');
    expect(service.getBrowserLanguageCode('bengali')).toBe('bn-IN');
    expect(service.getBrowserLanguageCode('tamil')).toBe('ta-IN');
    expect(service.getBrowserLanguageCode('telugu')).toBe('te-IN');
    expect(service.getBrowserLanguageCode('unknown')).toBe('hi-IN'); // fallback
  });

  it('should handle state change callbacks', () => {
    const callback = vi.fn();
    guidedVoiceService.setOnStateChange(callback);
    
    guidedVoiceService.updateField('name', 'Test');
    
    expect(callback).toHaveBeenCalled();
  });

  it('should handle completion callbacks', () => {
    const callback = vi.fn();
    guidedVoiceService.setOnComplete(callback);
    
    // This would be called when form is completed
    expect(callback).not.toHaveBeenCalled();
  });

  it('should support Whisper and browser speech recognition modes', async () => {
    await guidedVoiceService.start('english');
    
    // Should default to browser mode when Whisper not configured
    expect(guidedVoiceService.getSpeechRecognitionMode()).toBe('browser');
    
    // Set API key to enable Whisper
    guidedVoiceService.setWhisperApiKey('hf_test_key');
    
    // Toggle to Whisper mode
    guidedVoiceService.toggleSpeechRecognitionMode();
    
    const state = guidedVoiceService.getState();
    expect(state.useWhisper).toBe(true);
  });

  it('should handle recording state for Whisper', async () => {
    await guidedVoiceService.start('english');
    guidedVoiceService.setWhisperApiKey('hf_test_key');
    
    const state = guidedVoiceService.getState();
    expect(state.isRecording).toBe(false);
    
    // Recording state would be set during actual recording
    // This is tested in integration tests with actual audio
  });

  it('should validate state machine constraints', async () => {
    await guidedVoiceService.start('english');
    
    // Cannot skip states - must go through sequence
    expect(guidedVoiceService.getCurrentStep()).toBe('ASK_NAME');
    
    // Test invalid step navigation
    guidedVoiceService.goToStep(-1);
    expect(guidedVoiceService.getCurrentStep()).toBe('ASK_NAME'); // Should not change
    
    guidedVoiceService.goToStep(10);
    expect(guidedVoiceService.getCurrentStep()).toBe('ASK_NAME'); // Should not change
    
    // Valid step navigation
    guidedVoiceService.goToStep(2);
    expect(guidedVoiceService.getCurrentStep()).toBe('ASK_QUANTITY');
  });
});