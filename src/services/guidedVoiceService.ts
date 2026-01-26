/**
 * Guided Voice-Assisted Form Filling Service
 * 
 * STATE MACHINE APPROACH:
 * - Fixed sequence: ASK_NAME → ASK_PRODUCT → ASK_QUANTITY → ASK_QUALITY → ASK_LOCATION → CONFIRM
 * - One question at a time, one field at a time
 * - Predictable, reliable, demo-ready
 * - NOT a chatbot - structured form filling only
 * 
 * SPEECH RECOGNITION:
 * - Uses Whisper Large V3 for accurate transcription
 * - Fallback to browser Web Speech API if Whisper unavailable
 */

import { indicTTSService } from './indicTTSService';
import { whisperService } from './whisperService';

// Extend Window interface for speech APIs
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

export interface FormData {
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
  isRecording: boolean;
  currentState: number;
  language: string;
  formData: FormData;
  lastTranscript: string;
  error: string | null;
  isRetrying: boolean;
  useWhisper: boolean;
}

// State Machine States - Fixed sequence, no skipping
const STATES = [
  'ASK_NAME',
  'ASK_PRODUCT', 
  'ASK_QUANTITY',
  'ASK_QUALITY',
  'ASK_LOCATION',
  'CONFIRM'
] as const;

type State = typeof STATES[number];

// Map states to form fields
const STATE_TO_FIELD: Record<State, keyof FormData | null> = {
  'ASK_NAME': 'name',
  'ASK_PRODUCT': 'product',
  'ASK_QUANTITY': 'quantity',
  'ASK_QUALITY': 'quality',
  'ASK_LOCATION': 'location',
  'CONFIRM': null
};

// Questions for each state - clear, single-purpose questions
const STATE_QUESTIONS = {
  ASK_NAME: {
    hindi: 'आपका नाम क्या है?',
    english: 'What is your name?',
    bengali: 'আপনার নাম কি?',
    tamil: 'உங்கள் பெயர் என்ன?',
    telugu: 'మీ పేరు ఏమిటి?'
  },
  ASK_PRODUCT: {
    hindi: 'आप कौन सा उत्पाद बेच रहे हैं?',
    english: 'What product are you selling?',
    bengali: 'আপনি কোন পণ্য বিক্রি করছেন?',
    tamil: 'நீங்கள் என்ன பொருள் விற்கிறீர்கள்?',
    telugu: 'మీరు ఏ ఉత్పత్తిని అమ్ముతున్నారు?'
  },
  ASK_QUANTITY: {
    hindi: 'कितनी मात्रा में? जैसे 50 किलो या 100 किलो?',
    english: 'What quantity? Like 50 kg or 100 kg?',
    bengali: 'কত পরিমাণে? যেমন ৫০ কেজি বা ১০০ কেজি?',
    tamil: 'எவ்வளவு அளவில்? 50 கிலோ அல்லது 100 கிலோ போன்று?',
    telugu: 'ఎంత పరిమాణంలో? 50 కిలోలు లేదా 100 కిలోలు వంటివి?'
  },
  ASK_QUALITY: {
    hindi: 'गुणवत्ता कैसी है? अच्छी, साधारण, या प्रीमियम?',
    english: 'What is the quality? Good, average, or premium?',
    bengali: 'গুণমান কেমন? ভাল, সাধারণ, নাকি প্রিমিয়াম?',
    tamil: 'தரம் எப்படி? நல்லது, சராசரி, அல்லது பிரீமியம்?',
    telugu: 'నాణ్యత ఎలా ఉంది? మంచిది, సాధారణం, లేదా ప్రీమియం?'
  },
  ASK_LOCATION: {
    hindi: 'आप कहाँ से हैं? कौन सी मंडी या शहर?',
    english: 'Where are you from? Which mandi or city?',
    bengali: 'আপনি কোথা থেকে? কোন মণ্ডি বা শহর?',
    tamil: 'நீங்கள் எங்கிருந்து வருகிறீர்கள்? எந்த மண்டி அல்லது நகரம்?',
    telugu: 'మీరు ఎక్కడ నుండి? ఏ మండి లేదా నగరం?'
  },
  CONFIRM: {
    hindi: 'मैं आपकी जानकारी दोहराता हूँ। क्या यह सही है?',
    english: 'Let me repeat your information. Is this correct?',
    bengali: 'আমি আপনার তথ্য পুনরাবৃত্তি করছি। এটা কি সঠিক?',
    tamil: 'உங்கள் தகவலை மீண்டும் சொல்கிறேன். இது சரியா?',
    telugu: 'మీ సమాచారాన్ని మళ్లీ చెప్తున్నాను। ఇది సరైనదా?'
  }
};

const RETRY_PHRASES = {
  hindi: 'मुझे समझ नहीं आया। कृपया फिर से बताएं।',
  english: 'I did not understand. Please tell me again.',
  bengali: 'আমি বুঝতে পারিনি। দয়া করে আবার বলুন।',
  tamil: 'எனக்கு புரியவில்லை. தயவுசெய்து மீண்டும் சொல்லுங்கள்.',
  telugu: 'నాకు అర్థం కాలేదు। దయచేసి మళ్లీ చెప్పండి।'
};

export class GuidedVoiceService {
  private recognition: SpeechRecognition | null = null;
  private synthesis: SpeechSynthesis | null = null;
  private onStateChange: ((state: VoiceState) => void) | null = null;
  private onComplete: ((data: FormData) => void) | null = null;
  
  private state: VoiceState = {
    isActive: false,
    isListening: false,
    isSpeaking: false,
    isRecording: false,
    currentState: 0,
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
    useWhisper: whisperService.isConfigured()
  };

  constructor() {
    this.initializeSpeechRecognition();
    this.initializeSpeechSynthesis();
  }

  private initializeSpeechRecognition() {
    if (typeof window === 'undefined') return;
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('Speech recognition not supported');
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = false;
    this.recognition.interimResults = false; // Only final results for reliability
    this.recognition.maxAlternatives = 1; // Single best result
    
    this.recognition.onstart = () => {
      console.log('Speech recognition started');
      this.updateState({ isListening: true, error: null });
    };

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      console.log('Speech recognition results:', event.results);
      
      const lastResult = event.results[event.results.length - 1];
      if (lastResult.isFinal) {
        const transcript = lastResult[0].transcript.trim();
        console.log('Final transcript:', transcript);
        this.handleSpeechResult(transcript);
      }
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      this.updateState({ 
        isListening: false, 
        error: `Speech recognition error: ${event.error}. Please try again or use text input.` 
      });
    };

    this.recognition.onend = () => {
      console.log('Speech recognition ended');
      this.updateState({ isListening: false });
    };
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
    this.updateState({ lastTranscript: transcript, isRetrying: false });
    
    const currentState = STATES[this.state.currentState];
    console.log('Current state:', currentState);
    
    if (currentState === 'ASK_QUALITY') {
      const quality = this.normalizeQuality(transcript);
      console.log('Normalized quality:', quality);
      if (quality) {
        this.updateState({
          formData: { ...this.state.formData, quality }
        });
        await this.moveToNextState();
      } else {
        console.log('Quality not recognized, retrying...');
        await this.retryCurrentQuestion();
      }
    } else if (currentState === 'CONFIRM') {
      const isConfirmed = this.isConfirmationPositive(transcript);
      console.log('Confirmation result:', isConfirmed);
      if (isConfirmed) {
        this.completeForm();
      } else {
        // Go back to first state for editing
        this.updateState({ currentState: 0 });
        await this.speakCurrentQuestion();
      }
    } else {
      // Handle regular fields (name, product, quantity, location)
      console.log('Processing regular field:', currentState, 'with value:', transcript);
      if (transcript.length > 0) {
        const fieldName = STATE_TO_FIELD[currentState];
        if (fieldName) {
          this.updateState({
            formData: { ...this.state.formData, [fieldName]: transcript }
          });
          await this.moveToNextState();
        }
      } else {
        console.log('Empty transcript, retrying...');
        await this.retryCurrentQuestion();
      }
    }
  }

  private normalizeQuality(transcript: string): 'good' | 'average' | 'premium' | null {
    const lowerTranscript = transcript.toLowerCase();
    
    // English
    if (lowerTranscript.includes('good') || lowerTranscript.includes('अच्छा') || lowerTranscript.includes('अच्छी')) return 'good';
    if (lowerTranscript.includes('average') || lowerTranscript.includes('साधारण') || lowerTranscript.includes('सामान्य')) return 'average';
    if (lowerTranscript.includes('premium') || lowerTranscript.includes('प्रीमियम') || lowerTranscript.includes('उत्तम')) return 'premium';
    
    // Bengali
    if (lowerTranscript.includes('ভাল') || lowerTranscript.includes('ভালো')) return 'good';
    if (lowerTranscript.includes('সাধারণ')) return 'average';
    if (lowerTranscript.includes('প্রিমিয়াম')) return 'premium';
    
    // Tamil
    if (lowerTranscript.includes('நல்ல')) return 'good';
    if (lowerTranscript.includes('சராசரி')) return 'average';
    if (lowerTranscript.includes('பிரீமியம்')) return 'premium';
    
    // Telugu
    if (lowerTranscript.includes('మంచి')) return 'good';
    if (lowerTranscript.includes('సాధారణ')) return 'average';
    if (lowerTranscript.includes('ప్రీమియం')) return 'premium';
    
    return null;
  }

  private isConfirmationPositive(transcript: string): boolean {
    const positiveWords = [
      'yes', 'हाँ', 'हां', 'जी', 'सही', 'ठीक', 'correct', 'right',
      'হ্যাঁ', 'ঠিক', 'சரி', 'అవును'
    ];
    
    const lowerTranscript = transcript.toLowerCase();
    return positiveWords.some(word => lowerTranscript.includes(word.toLowerCase()));
  }

  private async moveToNextState() {
    if (this.state.currentState < STATES.length - 1) {
      this.updateState({ currentState: this.state.currentState + 1 });
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
    }, 1000);
  }

  private async speakCurrentQuestion() {
    const currentState = STATES[this.state.currentState];
    
    if (currentState === 'CONFIRM') {
      // Speak the summary
      await this.speakSummary();
    } else {
      const questions = STATE_QUESTIONS[currentState];
      const question = questions[this.state.language as keyof typeof questions] || 
                      questions['english'];
      await this.speak(question);
    }
  }

  private async speakSummary() {
    const { formData, language } = this.state;
    
    let summary = '';
    if (language === 'hindi') {
      summary = `नाम: ${formData.name}, उत्पाद: ${formData.product}, मात्रा: ${formData.quantity}, गुणवत्ता: ${formData.quality}, स्थान: ${formData.location}। क्या यह सही है?`;
    } else if (language === 'bengali') {
      summary = `নাম: ${formData.name}, পণ্য: ${formData.product}, পরিমাণ: ${formData.quantity}, গুণমান: ${formData.quality}, স্থান: ${formData.location}। এটা কি সঠিক?`;
    } else if (language === 'tamil') {
      summary = `பெயர்: ${formData.name}, பொருள்: ${formData.product}, அளவு: ${formData.quantity}, தரம்: ${formData.quality}, இடம்: ${formData.location}। இது சரியா?`;
    } else if (language === 'telugu') {
      summary = `పేరు: ${formData.name}, ఉత్పత్తి: ${formData.product}, పరిమాణం: ${formData.quantity}, నాణ్యత: ${formData.quality}, స్థలం: ${formData.location}। ఇది సరైనదా?`;
    } else {
      summary = `Name: ${formData.name}, Product: ${formData.product}, Quantity: ${formData.quantity}, Quality: ${formData.quality}, Location: ${formData.location}. Is this correct?`;
    }
    
    await this.speak(summary);
  }

  private async speak(text: string): Promise<void> {
    if (!text) return;
    
    this.updateState({ isSpeaking: true });
    
    try {
      // Try Indic TTS first
      const ttsResponse = await indicTTSService.generateSpeech({
        text,
        language: this.state.language,
        speaker: 'female',
        speed: 0.9
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
      utterance.rate = 0.8;
      utterance.pitch = 1.0;
      
      utterance.onend = () => {
        this.updateState({ isSpeaking: false });
        resolve();
      };
      
      utterance.onerror = () => {
        this.updateState({ isSpeaking: false });
        resolve();
      };
      
      this.synthesis!.speak(utterance);
    });
  }

  private getBrowserLanguageCode(langCode: string): string {
    const browserCodes: Record<string, string> = {
      'hindi': 'hi-IN',
      'english': 'en-IN',
      'bengali': 'bn-IN',
      'tamil': 'ta-IN',
      'telugu': 'te-IN'
    };
    
    return browserCodes[langCode] || 'hi-IN';
  }

  private completeForm() {
    this.updateState({ isActive: false });
    
    if (this.onComplete) {
      this.onComplete(this.state.formData);
    }
  }

  // Public API
  public async start(initialLanguage: string = 'hindi', detectedLocation?: string) {
    // Pre-fill location if detected
    const formData = { ...this.state.formData, language: initialLanguage };
    if (detectedLocation) {
      formData.location = detectedLocation;
    }

    this.updateState({ 
      isActive: true,
      language: initialLanguage,
      currentState: 0, // Always start from first state
      formData,
      error: null,
      isRetrying: false
    });

    console.log('Starting guided voice with language:', initialLanguage);

    // Only try to speak if we have speech recognition support
    if (this.recognition) {
      await this.speakCurrentQuestion();
    } else {
      console.warn('Speech recognition not supported, but service is active for manual input');
    }
  }

  public stop() {
    if (this.recognition) {
      this.recognition.stop();
    }
    if (this.synthesis) {
      this.synthesis.cancel();
    }
    
    this.updateState({ 
      isActive: false,
      isListening: false,
      isSpeaking: false,
      isRecording: false,
      currentState: 0,
      isRetrying: false
    });
  }

  public startListening() {
    if (this.state.isListening || this.state.isSpeaking || this.state.isRecording) return;
    
    if (this.state.useWhisper) {
      this.startWhisperRecording();
    } else {
      this.startBrowserSpeechRecognition();
    }
  }

  private async startWhisperRecording() {
    try {
      this.updateState({ isRecording: true, error: null, lastTranscript: 'Recording...' });
      
      const whisperLangCode = whisperService.mapLanguageCode(this.state.language);
      console.log('Starting Whisper recording with language:', whisperLangCode);
      
      // Record for 5 seconds (adjustable)
      const result = await whisperService.recordAndTranscribe(5000, whisperLangCode);
      
      this.updateState({ isRecording: false });
      
      if (result.success && result.text) {
        console.log('Whisper transcription result:', result.text);
        this.handleSpeechResult(result.text);
      } else {
        console.error('Whisper transcription failed:', result.error);
        this.updateState({ 
          error: `Speech recognition failed: ${result.error}. Please try again or use text input.`
        });
      }
    } catch (error) {
      console.error('Whisper recording error:', error);
      this.updateState({ 
        isRecording: false,
        error: 'Failed to record audio. Please try again or use text input.'
      });
    }
  }

  private startBrowserSpeechRecognition() {
    if (!this.recognition) {
      this.updateState({ 
        error: 'Speech recognition not supported. Please use text input.'
      });
      return;
    }
    
    try {
      // Set language for recognition with more specific locale
      const langCode = this.getBrowserLanguageCode(this.state.language);
      console.log('Setting browser recognition language to:', langCode);
      this.recognition.lang = langCode;
      
      // Clear any previous transcript
      this.updateState({ lastTranscript: '', error: null });
      
      console.log('Starting browser speech recognition...');
      this.recognition.start();
    } catch (error) {
      console.error('Failed to start browser speech recognition:', error);
      this.updateState({ 
        error: 'Failed to start speech recognition. Please try again or use text input.',
        isListening: false 
      });
    }
  }

  public stopListening() {
    if (this.state.useWhisper) {
      // Whisper recording stops automatically after duration
      this.updateState({ isRecording: false });
    } else if (this.recognition && this.state.isListening) {
      this.recognition.stop();
    }
  }

  public updateField(field: keyof FormData, value: string) {
    this.updateState({
      formData: { ...this.state.formData, [field]: value }
    });
  }

  public getState(): VoiceState {
    return { ...this.state };
  }

  public getCurrentStep(): string {
    return STATES[this.state.currentState];
  }

  public getCurrentQuestion(): string {
    const currentState = STATES[this.state.currentState];
    const questions = STATE_QUESTIONS[currentState];
    return questions[this.state.language as keyof typeof questions] || questions['english'];
  }

  public setOnStateChange(callback: (state: VoiceState) => void) {
    this.onStateChange = callback;
  }

  public setOnComplete(callback: (data: FormData) => void) {
    this.onComplete = callback;
  }

  public goToStep(stepIndex: number) {
    if (stepIndex >= 0 && stepIndex < STATES.length) {
      this.updateState({ currentState: stepIndex });
      this.speakCurrentQuestion();
    }
  }

  public setWhisperApiKey(apiKey: string) {
    whisperService.setApiKey(apiKey);
    this.updateState({ useWhisper: whisperService.isConfigured() });
  }

  public toggleSpeechRecognitionMode() {
    this.updateState({ useWhisper: !this.state.useWhisper });
  }

  public getSpeechRecognitionMode(): 'whisper' | 'browser' {
    return this.state.useWhisper ? 'whisper' : 'browser';
  }
}

// Export singleton instance
export const guidedVoiceService = new GuidedVoiceService();