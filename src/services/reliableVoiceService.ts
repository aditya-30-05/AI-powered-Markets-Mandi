/**
 * Reliable Voice-Assisted Form Filling Service
 * 
 * Uses multiple speech recognition and synthesis options for maximum reliability:
 * 1. Browser Web Speech API (primary)
 * 2. Annyang.js library (fallback)
 * 3. Manual text input (always available)
 */

import { indicTTSService } from './indicTTSService';

// Extend Window interface for speech APIs
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
    annyang: any;
  }
}

export interface VoiceFormData {
  name: string;
  product: string;
  quantity: string;
  quality: 'good' | 'average' | 'premium' | '';
  location: string;
  language: string;
}

export interface VoiceState {
  isActive: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  currentStep: number;
  language: string;
  formData: VoiceFormData;
  lastTranscript: string;
  error: string | null;
  isRetrying: boolean;
  recognitionMethod: 'browser' | 'annyang' | 'manual';
}

const STEPS = [
  'language',
  'name', 
  'product',
  'quantity',
  'quality',
  'location',
  'confirmation'
] as const;

type Step = typeof STEPS[number];

const QUESTIONS = {
  language: {
    hindi: 'आप किस भाषा में बात करना चाहते हैं? हिंदी या अंग्रेजी?',
    english: 'Which language would you like to speak? Hindi or English?'
  },
  name: {
    hindi: 'आपका नाम क्या है?',
    english: 'What is your name?'
  },
  product: {
    hindi: 'आप कौन सा उत्पाद बेच रहे हैं? जैसे टमाटर, प्याज, या आलू?',
    english: 'What product are you selling? Like tomato, onion, or potato?'
  },
  quantity: {
    hindi: 'कितनी मात्रा में? जैसे 50 किलो या 100 किलो?',
    english: 'What quantity? Like 50 kg or 100 kg?'
  },
  quality: {
    hindi: 'गुणवत्ता कैसी है? अच्छी, साधारण, या प्रीमियम?',
    english: 'What is the quality? Good, average, or premium?'
  },
  location: {
    hindi: 'आप कहाँ से हैं? कौन सी मंडी या शहर?',
    english: 'Where are you from? Which mandi or city?'
  },
  confirmation: {
    hindi: 'मैं आपकी जानकारी दोहराता हूँ। क्या यह सही है?',
    english: 'Let me repeat your information. Is this correct?'
  }
};

const RETRY_PHRASES = {
  hindi: 'मुझे समझ नहीं आया। कृपया फिर से बताएं।',
  english: 'I did not understand. Please tell me again.'
};

export class ReliableVoiceService {
  private recognition: SpeechRecognition | null = null;
  private synthesis: SpeechSynthesis | null = null;
  private onStateChange: ((state: VoiceState) => void) | null = null;
  private onComplete: ((data: VoiceFormData) => void) | null = null;
  private currentTimeout: NodeJS.Timeout | null = null;
  private debugMode: boolean = true; // Enable debug logging
  
  private state: VoiceState = {
    isActive: false,
    isListening: false,
    isSpeaking: false,
    currentStep: 0,
    language: 'hindi',
    formData: {
      name: '',
      product: '',
      quantity: '',
      quality: '',
      location: '',
      language: 'hindi'
    },
    lastTranscript: '',
    error: null,
    isRetrying: false,
    recognitionMethod: 'browser'
  };

  constructor() {
    this.initializeSpeechRecognition();
    this.initializeSpeechSynthesis();
    this.loadAnnyangLibrary();
    
    if (this.debugMode) {
      console.log('ReliableVoiceService initialized');
      this.logBrowserCapabilities();
    }
  }

  private logBrowserCapabilities() {
    console.log('=== Speech Recognition Capabilities ===');
    console.log('SpeechRecognition:', !!(window.SpeechRecognition || window.webkitSpeechRecognition));
    console.log('SpeechSynthesis:', !!window.speechSynthesis);
    console.log('Navigator language:', navigator.language);
    console.log('Navigator languages:', navigator.languages);
    console.log('User agent:', navigator.userAgent);
    console.log('==========================================');
  }

  private async loadAnnyangLibrary() {
    try {
      // Load Annyang.js as fallback
      if (!window.annyang) {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/annyang/2.6.1/annyang.min.js';
        script.onload = () => {
          console.log('Annyang.js loaded successfully');
        };
        document.head.appendChild(script);
      }
    } catch (error) {
      console.warn('Failed to load Annyang.js:', error);
    }
  }

  private initializeSpeechRecognition() {
    if (typeof window === 'undefined') return;
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('Browser speech recognition not supported');
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = false;
    this.recognition.interimResults = false; // Only final results to avoid confusion
    this.recognition.maxAlternatives = 1; // Simplified to avoid confusion
    
    this.recognition.onstart = () => {
      console.log('Browser speech recognition started');
      this.updateState({ isListening: true, error: null, recognitionMethod: 'browser' });
    };

    this.recognition.onresult = (event) => {
      console.log('Browser speech recognition results:', event.results);
      
      if (event.results.length > 0) {
        const result = event.results[0];
        if (result.isFinal) {
          const transcript = result[0].transcript.trim();
          console.log('Final browser transcript:', transcript);
          
          // Additional validation
          if (transcript && transcript.length > 0) {
            this.handleSpeechResult(transcript);
          } else {
            console.log('Empty or invalid transcript, retrying...');
            this.updateState({ 
              error: 'No speech detected. Please try again.',
              isListening: false 
            });
          }
        }
      }
    };

    this.recognition.onerror = (event) => {
      console.error('Browser speech recognition error:', event.error);
      this.updateState({ isListening: false });
      
      // More specific error handling
      if (event.error === 'no-speech') {
        this.updateState({ 
          error: 'No speech detected. Please speak clearly and try again.' 
        });
      } else if (event.error === 'audio-capture') {
        this.updateState({ 
          error: 'Microphone access denied. Please allow microphone access and try again.' 
        });
      } else if (event.error === 'not-allowed') {
        this.updateState({ 
          error: 'Microphone permission denied. Please enable microphone access in your browser settings.' 
        });
      } else {
        // Try Annyang as fallback for other errors
        this.tryAnnyangRecognition();
      }
    };

    this.recognition.onend = () => {
      console.log('Browser speech recognition ended');
      this.updateState({ isListening: false });
    };
  }

  private tryAnnyangRecognition() {
    if (!window.annyang) {
      console.warn('Annyang not available');
      return;
    }

    try {
      console.log('Trying Annyang recognition as fallback');
      this.updateState({ isListening: true, recognitionMethod: 'annyang' });

      // Set up Annyang commands for current step
      const commands = {
        '*transcript': (transcript: string) => {
          console.log('Annyang transcript:', transcript);
          this.handleSpeechResult(transcript);
          window.annyang.abort();
        }
      };

      window.annyang.removeCommands();
      window.annyang.addCommands(commands);
      window.annyang.setLanguage(this.getBrowserLanguageCode(this.state.language));
      
      window.annyang.start({ autoRestart: false, continuous: false });

      // Timeout after 10 seconds
      this.currentTimeout = setTimeout(() => {
        window.annyang.abort();
        this.updateState({ 
          isListening: false,
          error: 'Speech recognition timeout. Please try again or use text input.'
        });
      }, 10000);

    } catch (error) {
      console.error('Annyang error:', error);
      this.updateState({ 
        isListening: false,
        error: 'Speech recognition failed. Please use text input.'
      });
    }
  }

  private initializeSpeechSynthesis() {
    if (typeof window === 'undefined') return;
    
    if ('speechSynthesis' in window) {
      this.synthesis = window.speechSynthesis;
    }
  }

  private updateState(updates: Partial<VoiceState>) {
    this.state = { ...this.state, ...updates };
    if (this.onStateChange) {
      this.onStateChange(this.state);
    }
  }

  private async handleSpeechResult(transcript: string) {
    console.log('Processing speech result:', transcript);
    
    // Clear any timeouts
    if (this.currentTimeout) {
      clearTimeout(this.currentTimeout);
      this.currentTimeout = null;
    }

    // Clean and validate transcript
    const cleanTranscript = transcript.trim();
    if (!cleanTranscript) {
      console.log('Empty transcript, retrying...');
      await this.retryCurrentQuestion();
      return;
    }

    this.updateState({ lastTranscript: cleanTranscript, isRetrying: false, isListening: false });
    
    const currentStep = STEPS[this.state.currentStep];
    console.log('Current step:', currentStep, 'Processing:', cleanTranscript);
    
    if (currentStep === 'language') {
      const detectedLang = this.detectLanguageFromSpeech(cleanTranscript);
      console.log('Detected language:', detectedLang);
      if (detectedLang) {
        this.updateState({ 
          language: detectedLang,
          formData: { ...this.state.formData, language: detectedLang }
        });
        await this.moveToNextStep();
      } else {
        await this.retryCurrentQuestion();
      }
    } else if (currentStep === 'quality') {
      const quality = this.normalizeQuality(cleanTranscript);
      console.log('Normalized quality:', quality);
      if (quality) {
        this.updateState({
          formData: { ...this.state.formData, quality }
        });
        await this.moveToNextStep();
      } else {
        await this.retryCurrentQuestion();
      }
    } else if (currentStep === 'confirmation') {
      const isConfirmed = this.isConfirmationPositive(cleanTranscript);
      console.log('Confirmation result:', isConfirmed);
      if (isConfirmed) {
        this.completeForm();
      } else {
        // Go back to first field for editing
        this.updateState({ currentStep: 1 });
        await this.speakCurrentQuestion();
      }
    } else {
      // Handle regular fields (name, product, quantity, location)
      console.log('Processing regular field:', currentStep, 'with value:', cleanTranscript);
      if (cleanTranscript.length > 0) {
        const fieldName = currentStep as keyof VoiceFormData;
        this.updateState({
          formData: { ...this.state.formData, [fieldName]: cleanTranscript }
        });
        await this.moveToNextStep();
      } else {
        await this.retryCurrentQuestion();
      }
    }
  }

  private detectLanguageFromSpeech(transcript: string): string | null {
    const lowerTranscript = transcript.toLowerCase();
    console.log('Detecting language from:', lowerTranscript);
    
    // Simple and reliable keyword detection
    if (lowerTranscript.includes('hindi') || lowerTranscript.includes('हिंदी') || 
        lowerTranscript.includes('हिन्दी')) {
      return 'hindi';
    }
    
    if (lowerTranscript.includes('english') || lowerTranscript.includes('अंग्रेजी') || 
        lowerTranscript.includes('इंग्लिश')) {
      return 'english';
    }
    
    // If transcript contains Hindi characters, assume Hindi
    if (/[\u0900-\u097F]/.test(transcript)) {
      return 'hindi';
    }
    
    // If transcript is in English and not empty, assume English
    if (transcript.trim().length > 0 && /^[a-zA-Z\s]+$/.test(transcript)) {
      return 'english';
    }
    
    // Default to current language if we have some input
    if (transcript.trim().length > 0) {
      return this.state.language;
    }
    
    return null;
  }

  private normalizeQuality(transcript: string): 'good' | 'average' | 'premium' | null {
    const lowerTranscript = transcript.toLowerCase();
    
    // English
    if (lowerTranscript.includes('good') || lowerTranscript.includes('अच्छा') || 
        lowerTranscript.includes('अच्छी') || lowerTranscript.includes('बढ़िया')) {
      return 'good';
    }
    
    if (lowerTranscript.includes('average') || lowerTranscript.includes('साधारण') || 
        lowerTranscript.includes('सामान्य') || lowerTranscript.includes('ठीक')) {
      return 'average';
    }
    
    if (lowerTranscript.includes('premium') || lowerTranscript.includes('प्रीमियम') || 
        lowerTranscript.includes('उत्तम') || lowerTranscript.includes('बेहतरीन')) {
      return 'premium';
    }
    
    return null;
  }

  private isConfirmationPositive(transcript: string): boolean {
    const positiveWords = [
      'yes', 'हाँ', 'हां', 'जी', 'सही', 'ठीक', 'correct', 'right', 'ok', 'okay'
    ];
    
    const lowerTranscript = transcript.toLowerCase();
    return positiveWords.some(word => lowerTranscript.includes(word.toLowerCase()));
  }

  private async moveToNextStep() {
    if (this.state.currentStep < STEPS.length - 1) {
      this.updateState({ currentStep: this.state.currentStep + 1 });
      await this.speakCurrentQuestion();
    }
  }

  private async retryCurrentQuestion() {
    this.updateState({ isRetrying: true });
    
    const retryPhrase = RETRY_PHRASES[this.state.language as keyof typeof RETRY_PHRASES] || 
                       RETRY_PHRASES['english'];
    
    await this.speak(retryPhrase);
    
    // Wait a moment then ask the question again
    setTimeout(() => {
      this.speakCurrentQuestion();
    }, 1500);
  }

  private async speakCurrentQuestion() {
    const currentStep = STEPS[this.state.currentStep];
    
    if (currentStep === 'confirmation') {
      await this.speakSummary();
    } else {
      const questions = QUESTIONS[currentStep];
      const question = questions[this.state.language as keyof typeof questions] || 
                      questions['english'];
      await this.speak(question);
    }
  }

  private async speakSummary() {
    const { formData, language } = this.state;
    
    let summary = '';
    if (language === 'hindi') {
      summary = `आपकी जानकारी: नाम ${formData.name}, उत्पाद ${formData.product}, मात्रा ${formData.quantity}, गुणवत्ता ${formData.quality}, स्थान ${formData.location}। क्या यह सही है?`;
    } else {
      summary = `Your information: Name ${formData.name}, Product ${formData.product}, Quantity ${formData.quantity}, Quality ${formData.quality}, Location ${formData.location}. Is this correct?`;
    }
    
    await this.speak(summary);
  }

  private async speak(text: string): Promise<void> {
    if (!text) return;
    
    this.updateState({ isSpeaking: true });
    
    try {
      // Try Indic TTS first for better quality
      const ttsResponse = await indicTTSService.generateSpeech({
        text,
        language: this.state.language,
        speaker: 'female',
        speed: 0.8
      });
      
      if (ttsResponse.success && typeof window !== 'undefined') {
        const audio = new Audio(ttsResponse.audioUrl);
        await new Promise<void>((resolve, reject) => {
          audio.onended = () => {
            this.updateState({ isSpeaking: false });
            resolve();
          };
          audio.onerror = reject;
          audio.play().catch(reject);
        });
        return;
      }
    } catch (error) {
      console.warn('Indic TTS failed, falling back to browser TTS:', error);
    }
    
    // Fallback to browser TTS
    if (!this.synthesis) {
      this.updateState({ isSpeaking: false });
      return;
    }
    
    return new Promise((resolve) => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = this.getBrowserLanguageCode(this.state.language);
      utterance.rate = 0.7;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      
      utterance.onend = () => {
        this.updateState({ isSpeaking: false });
        resolve();
      };
      
      utterance.onerror = () => {
        this.updateState({ isSpeaking: false });
        resolve();
      };
      
      // Clear any existing speech
      this.synthesis!.cancel();
      this.synthesis!.speak(utterance);
    });
  }

  private getBrowserLanguageCode(langCode: string): string {
    const browserCodes: Record<string, string> = {
      'hindi': 'hi-IN',
      'english': 'en-US'
    };
    
    return browserCodes[langCode] || 'en-US';
  }

  private completeForm() {
    this.updateState({ isActive: false });
    
    if (this.onComplete) {
      this.onComplete(this.state.formData);
    }
  }

  // Public API
  public async start(initialLanguage: string = 'hindi', detectedLocation?: string) {
    console.log('Starting reliable voice service');
    
    // Check for speech recognition support
    const hasWebSpeech = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
    const hasAnnyang = !!window.annyang;
    
    if (!hasWebSpeech && !hasAnnyang) {
      this.updateState({ 
        error: 'Speech recognition not supported. Please use text input.',
        recognitionMethod: 'manual'
      });
    }

    // Pre-fill location if detected
    const formData = { ...this.state.formData, language: initialLanguage };
    if (detectedLocation) {
      formData.location = detectedLocation;
    }

    // Start from name step if we have language and location
    const startStep = (initialLanguage && detectedLocation) ? 1 : 0;

    this.updateState({ 
      isActive: true,
      language: initialLanguage,
      currentStep: startStep,
      formData,
      error: null,
      isRetrying: false
    });

    console.log('Starting with language:', initialLanguage, 'at step:', startStep);

    // Start with first question
    await this.speakCurrentQuestion();
  }

  public stop() {
    if (this.recognition) {
      this.recognition.stop();
    }
    if (window.annyang) {
      window.annyang.abort();
    }
    if (this.synthesis) {
      this.synthesis.cancel();
    }
    if (this.currentTimeout) {
      clearTimeout(this.currentTimeout);
      this.currentTimeout = null;
    }
    
    this.updateState({ 
      isActive: false,
      isListening: false,
      isSpeaking: false,
      currentStep: 0,
      isRetrying: false
    });
  }

  public startListening() {
    if (this.state.isListening || this.state.isSpeaking) {
      console.log('Already listening or speaking, ignoring request');
      return;
    }
    
    console.log('Starting speech recognition...');
    
    // Clear any previous errors
    this.updateState({ error: null, lastTranscript: '' });
    
    // Try browser speech recognition first
    if (this.recognition) {
      try {
        const langCode = this.getBrowserLanguageCode(this.state.language);
        console.log('Setting recognition language to:', langCode);
        this.recognition.lang = langCode;
        
        // Stop any existing recognition
        this.recognition.stop();
        
        // Small delay to ensure clean start
        setTimeout(() => {
          if (this.recognition) {
            console.log('Starting browser speech recognition...');
            this.recognition.start();
          }
        }, 100);
        
        return;
      } catch (error) {
        console.error('Browser recognition failed to start:', error);
        this.updateState({ 
          error: 'Failed to start speech recognition. Trying alternative method...' 
        });
      }
    }
    
    // Fallback to Annyang if browser recognition fails
    console.log('Browser recognition not available, trying Annyang...');
    this.tryAnnyangRecognition();
  }

  public stopListening() {
    if (this.recognition && this.state.isListening) {
      this.recognition.stop();
    }
    if (window.annyang) {
      window.annyang.abort();
    }
    if (this.currentTimeout) {
      clearTimeout(this.currentTimeout);
      this.currentTimeout = null;
    }
    this.updateState({ isListening: false });
  }

  public updateField(field: keyof VoiceFormData, value: string) {
    this.updateState({
      formData: { ...this.state.formData, [field]: value }
    });
  }

  public getState(): VoiceState {
    return { ...this.state };
  }

  public getCurrentStep(): Step {
    return STEPS[this.state.currentStep];
  }

  public getCurrentQuestion(): string {
    const currentStep = STEPS[this.state.currentStep];
    const questions = QUESTIONS[currentStep];
    return questions[this.state.language as keyof typeof questions] || questions['english'];
  }

  public setOnStateChange(callback: (state: VoiceState) => void) {
    this.onStateChange = callback;
  }

  public setOnComplete(callback: (data: VoiceFormData) => void) {
    this.onComplete = callback;
  }

  public goToStep(stepIndex: number) {
    if (stepIndex >= 0 && stepIndex < STEPS.length) {
      this.updateState({ currentStep: stepIndex });
      this.speakCurrentQuestion();
    }
  }

  public async processManualInput(input: string) {
    console.log('Processing manual input:', input);
    await this.handleSpeechResult(input);
  }
}

// Export singleton instance
export const reliableVoiceService = new ReliableVoiceService();