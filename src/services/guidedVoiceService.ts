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
  awaitingCorrection: boolean;
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
    telugu: 'మీ పేరు ఏమిటి?',
    marathi: 'तुमचे नाव काय आहे?'
  },
  ASK_PRODUCT: {
    hindi: 'आप कौन सा उत्पाद बेच रहे हैं?',
    english: 'What product are you selling?',
    bengali: 'আপনি কোন পণ্য বিক্রি করছেন?',
    tamil: 'நீங்கள் என்ன பொருள் விற்கிறீர்கள்?',
    telugu: 'మీరు ఏ ఉత్పత్తిని అమ్ముతున్నారు?',
    marathi: 'आपण कोणते उत्पादन विकत आहात?'
  },
  ASK_QUANTITY: {
    hindi: 'कितनी मात्रा में? जैसे 50 किलो या 100 किलो?',
    english: 'What quantity? Like 50 kg or 100 kg?',
    bengali: 'কত পরিমাণে? যেমন ৫০ কেজি বা ১০০ কেজি?',
    tamil: 'எவ்வளவு அளவில்? 50 கிலோ அல்லது 100 கிலோ போன்று?',
    telugu: 'ఎంత పరిమాణంలో? 50 కిలోలు లేదా 100 కిలోలు వంటివి?',
    marathi: 'किती प्रमाणात? उदाहरणार्थ 50 किलो किंवा 100 किलो?'
  },
  ASK_QUALITY: {
    hindi: 'गुणवत्ता कैसी है? अच्छी, साधारण, या प्रीमियम?',
    english: 'What is the quality? Good, average, or premium?',
    bengali: 'গুণমান কেমন? ভাল, সাধারণ, নাকি প্রিমিয়াম?',
    tamil: 'தரம் எப்படி? நல்லது, சராசரி, அல்லது பிரீமியம்?',
    telugu: 'నాణ్యత ఎలా ఉంది? మంచిది, సాధారణం, లేదా ప్రీమియం?',
    marathi: 'गुणवत्ता कशी आहे? चांगली, सरासरी, की प्रीमियम?'
  },
  ASK_LOCATION: {
    hindi: 'आप कहाँ से हैं? कौन सी मंडी या शहर?',
    english: 'Where are you from? Which mandi or city?',
    bengali: 'আপনি কোথা থেকে? কোন মণ্ডি বা শহর?',
    tamil: 'நீங்கள் எங்கிருந்து வருகிறீர்கள்? எந்த மண்டி அல்லது நகரம்?',
    telugu: 'మీరు ఎక్కడ నుండి? ఏ మండి లేదా నగరం?',
    marathi: 'आपण कुठून आहात? कोणती मंडी किंवा शहर?'
  },
  CONFIRM: {
    hindi: 'मैं आपकी जानकारी दोहराता हूँ। क्या यह सही है?',
    english: 'Let me repeat your information. Is this correct?',
    bengali: 'আমি আপনার তথ্য পুনরাবৃত্তি করছি। এটা কি সঠিক?',
    tamil: 'உங்கள் தகவலை மீண்டும் சொல்கிறேன். இது சரியா?',
    telugu: 'మీ సమాచారాన్ని మళ్లీ చెప్తున్నాను। ఇది సరైనదా?',
    marathi: 'मी तुमची माहिती पुन्हा सांगतो. हे बरोबर आहे का?'
  }
};

const RETRY_PHRASES = {
  hindi: 'मुझे समझ नहीं आया। कृपया फिर से बताएं।',
  english: 'I did not understand. Please tell me again.',
  bengali: 'আমি বুঝতে পারিনি। দয়া করে আবার বলুন।',
  tamil: 'எனக்கு புரியவில்லை. தயவுசெய்து மீண்டும் சொல்லுங்கள்.',
  telugu: 'నాకు అర్థం కాలేదు। దయచేసి మళ్లీ చెప్పండి।',
  marathi: 'मला समजले नाही. कृपया पुन्हा सांगा.'
};

const CORRECTION_QUESTIONS = {
  hindi: 'कौन सा फ़ील्ड बदलना है? नाम, उत्पाद, मात्रा, गुणवत्ता, या स्थान?',
  english: 'Which field should I change? Name, product, quantity, quality, or location?',
  bengali: 'কোন ক্ষেত্রটি বদলাতে হবে? নাম, পণ্য, পরিমাণ, গুণমান, না স্থান?',
  tamil: 'எந்த புலத்தை மாற்ற வேண்டும்? பெயர், பொருள், அளவு, தரம், அல்லது இடம்?',
  telugu: 'ఏ ఫీల్డ్‌ని మార్చాలి? పేరు, ఉత్పత్తి, పరిమాణం, నాణ్యత, లేదా స్థలం?',
  marathi: 'कुठले फील्ड बदलायचे? नाव, उत्पादन, प्रमाण, गुणवत्ता, की ठिकाण?'
};

const CORRECTION_KEYWORDS: Record<Exclude<keyof FormData, 'language'>, string[]> = {
  name: ['name', 'नाम', 'নাম', 'பெயர்', 'పేరు', 'नाव'],
  product: ['product', 'उत्पाद', 'पণ্য', 'பொருள்', 'உత्पత్తి', 'उत्पादन'],
  quantity: ['quantity', 'मात्रा', 'परিমাণ', 'அளவு', 'పరిమాణ', 'प्रमाण', 'कितना', 'कितनी'],
  quality: ['quality', 'गुणवत्ता', 'গুণমান', 'தரம்', 'నాణ్యత'],
  location: ['location', 'जगह', 'स्थान', 'স্থান', 'இடம்', 'స్థలం', 'ठिकाण', 'city', 'शहर', 'मंडी', 'mandi']
};

export class GuidedVoiceService {
  private recognition: SpeechRecognition | null = null;
  private synthesis: SpeechSynthesis | null = null;
  private onStateChange: ((state: VoiceState) => void) | null = null;
  private onComplete: ((data: FormData) => void) | null = null;
  private lastSpokenState: State | null = null;
  private lastSpokenAt = 0;
  private autoListenTimeout: number | null = null;
  
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
    useWhisper: whisperService.isConfigured(),
    awaitingCorrection: false
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
      
      if (event.results.length > 0) {
        const lastResult = event.results[event.results.length - 1];
        if (lastResult.isFinal) {
          const transcript = lastResult[0].transcript.trim();
          const confidence = lastResult[0].confidence || 0.8;
          console.log('Final transcript:', transcript, 'Confidence:', confidence);
          
          if (transcript && transcript.length > 0) {
            this.handleSpeechResult(transcript);
          } else {
            console.log('Empty transcript received');
            this.updateState({ 
              error: 'No speech detected. Please try again or use text input.',
              isListening: false 
            });
          }
        }
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
    this.stopListening();
    this.updateState({ lastTranscript: transcript, isRetrying: false });
    
    const currentState = STATES[this.state.currentState];
    console.log('Current state:', currentState, 'State index:', this.state.currentState);
    
    // Validate transcript
    if (!transcript || transcript.trim().length === 0) {
      console.log('Empty transcript, retrying...');
      await this.retryCurrentQuestion();
      return;
    }

    const cleanTranscript = transcript.trim();
    
    if (currentState === 'CONFIRM' && this.state.awaitingCorrection) {
      const correctionField = this.detectCorrectionField(cleanTranscript);
      if (correctionField) {
        const targetIndex = STATES.indexOf(correctionField);
        this.updateState({ currentState: targetIndex, awaitingCorrection: false });
        await this.speakCurrentQuestion();
      } else {
        await this.retryCurrentQuestion();
      }
      return;
    }

    if (currentState === 'ASK_QUALITY') {
      const quality = this.normalizeQuality(cleanTranscript);
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
      const isConfirmed = this.isConfirmationPositive(cleanTranscript);
      console.log('Confirmation result:', isConfirmed);
      if (isConfirmed) {
        this.completeForm();
      } else {
        this.updateState({ awaitingCorrection: true });
        await this.speakCurrentQuestion();
      }
    } else {
      // Handle regular fields (name, product, quantity, location)
      console.log('Processing regular field:', currentState, 'with value:', cleanTranscript);
      const fieldName = STATE_TO_FIELD[currentState];
      if (fieldName) {
        // Process the input based on field type
        let processedValue = cleanTranscript;
        
        if (fieldName === 'quantity') {
          processedValue = this.normalizeQuantity(cleanTranscript);
        } else if (fieldName === 'product') {
          processedValue = this.normalizeProduct(cleanTranscript);
        }
        
        this.updateState({
          formData: { ...this.state.formData, [fieldName]: processedValue }
        });
        
        console.log('Updated form data:', this.state.formData);
        await this.moveToNextState();
      } else {
        console.log('No field mapping for state:', currentState);
        await this.retryCurrentQuestion();
      }
    }
  }

  private normalizeQuantity(transcript: string): string {
    const lowerTranscript = transcript.toLowerCase();
    
    // Extract numbers from text
    const numberWords: Record<string, string> = {
      'one': '1', 'two': '2', 'three': '3', 'four': '4', 'five': '5',
      'six': '6', 'seven': '7', 'eight': '8', 'nine': '9', 'ten': '10',
      'twenty': '20', 'thirty': '30', 'forty': '40', 'fifty': '50',
      'sixty': '60', 'seventy': '70', 'eighty': '80', 'ninety': '90',
      'hundred': '100', 'thousand': '1000',
      // Hindi numbers
      'एक': '1', 'दो': '2', 'तीन': '3', 'चार': '4', 'पांच': '5', 'पाँच': '5',
      'छह': '6', 'सात': '7', 'आठ': '8', 'नौ': '9', 'दस': '10',
      'बीस': '20', 'तीस': '30', 'चालीस': '40', 'पचास': '50',
      'साठ': '60', 'सत्तर': '70', 'अस्सी': '80', 'नब्बे': '90',
      'सौ': '100', 'हजार': '1000',
      // Marathi numbers
      'दोन': '2', 'पाच': '5', 'सहा': '6', 'नऊ': '9', 'दहा': '10',
      'वीस': '20', 'चाळीस': '40', 'पन्नास': '50', 'शंभर': '100'
    };
    
    let result = lowerTranscript;
    
    // Replace number words with digits
    Object.entries(numberWords).forEach(([word, digit]) => {
      result = result.replace(new RegExp(word, 'gi'), digit);
    });
    
    // Extract numbers and units
    const numberMatch = result.match(/(\d+(?:\.\d+)?)/);
    const unitMatch = result.match(/(kg|kilogram|quintal|ton|क्विंटल|किलो|टन)/i);
    
    if (numberMatch) {
      const number = numberMatch[1];
      const unit = unitMatch ? unitMatch[1].toLowerCase() : '';
      
      // Normalize units
      let normalizedUnit = '';
      if (unit.includes('kg') || unit.includes('किलो')) {
        normalizedUnit = 'kg';
      } else if (unit.includes('quintal') || unit.includes('क्विंटल')) {
        normalizedUnit = 'quintal';
      } else if (unit.includes('ton') || unit.includes('टन')) {
        normalizedUnit = 'ton';
      } else {
        normalizedUnit = 'kg'; // default
      }
      
      return `${number} ${normalizedUnit}`;
    }
    
    return transcript; // Return original if no number found
  }

  private normalizeProduct(transcript: string): string {
    const lowerTranscript = transcript.toLowerCase();
    
    // Common product mappings
    const productMappings: Record<string, string> = {
      'wheat': 'wheat',
      'गेहूं': 'wheat',
      'गहूं': 'wheat',
      'rice': 'rice',
      'चावल': 'rice',
      'धान': 'rice',
      'corn': 'corn',
      'मक्का': 'corn',
      'barley': 'barley',
      'जौ': 'barley',
      'onion': 'onion',
      'प्याज': 'onion',
      'potato': 'potato',
      'आलू': 'potato',
      'tomato': 'tomato',
      'टमाटर': 'tomato'
    };
    
    // Check for exact matches first
    for (const [key, value] of Object.entries(productMappings)) {
      if (lowerTranscript.includes(key)) {
        return value;
      }
    }
    
    return transcript; // Return original if no mapping found
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

    // Marathi
    if (lowerTranscript.includes('चांग')) return 'good';
    if (lowerTranscript.includes('सरासरी')) return 'average';
    if (lowerTranscript.includes('प्रीमियम')) return 'premium';
    
    return null;
  }

  private isConfirmationPositive(transcript: string): boolean {
    const positiveWords = [
      'yes', 'हाँ', 'हां', 'जी', 'सही', 'ठीक', 'correct', 'right',
      'হ্যাঁ', 'ঠিক', 'சரி', 'అవును', 'हो', 'बरोबर'
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
    const now = Date.now();
    if (this.lastSpokenState === currentState && now - this.lastSpokenAt < 700) {
      return;
    }
    this.lastSpokenState = currentState;
    this.lastSpokenAt = now;
    
    if (currentState === 'CONFIRM') {
      if (this.state.awaitingCorrection) {
        const question = this.getCorrectionQuestion();
        await this.speak(question);
      } else {
        // Speak the summary
        await this.speakSummary();
      }
    } else {
      const questions = STATE_QUESTIONS[currentState];
      const question = questions[this.state.language as keyof typeof questions] || 
                      questions['english'];
      await this.speak(question);
    }

    this.scheduleAutoListen();
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
    } else if (language === 'marathi') {
      summary = `नाव: ${formData.name}, उत्पादन: ${formData.product}, प्रमाण: ${formData.quantity}, गुणवत्ता: ${formData.quality}, ठिकाण: ${formData.location}. हे बरोबर आहे का?`;
    } else {
      summary = `Name: ${formData.name}, Product: ${formData.product}, Quantity: ${formData.quantity}, Quality: ${formData.quality}, Location: ${formData.location}. Is this correct?`;
    }
    
    await this.speak(summary);
  }

  private async speak(text: string): Promise<void> {
    if (!text) return;
    
    this.updateState({ isSpeaking: true });
    
    try {
      if (this.synthesis) {
        this.synthesis.cancel();
      }
      // Try Indic TTS first
      const ttsResponse = await indicTTSService.generateSpeech({
        text,
        language: this.state.language,
        speaker: 'female',
        speed: 0.9
      });
      
      if (ttsResponse.success && typeof window !== 'undefined') {
        if (ttsResponse.method !== 'browser-fallback' && ttsResponse.audioUrl) {
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

        this.updateState({ isSpeaking: false });
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
      'telugu': 'te-IN',
      'marathi': 'mr-IN'
    };
    
    return browserCodes[langCode] || 'hi-IN';
  }

  private completeForm() {
    console.log('Form completion triggered - all 7 steps completed');
    this.updateState({ isActive: false, awaitingCorrection: false });
    
    // Add a small delay to show completion state
    setTimeout(() => {
      if (this.onComplete) {
        console.log('Calling onComplete callback with form data:', this.state.formData);
        this.onComplete(this.state.formData);
      }
    }, 500);
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
      isRetrying: false,
      awaitingCorrection: false
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
    if (this.autoListenTimeout) {
      window.clearTimeout(this.autoListenTimeout);
      this.autoListenTimeout = null;
    }
    
    this.updateState({ 
      isActive: false,
      isListening: false,
      isSpeaking: false,
      isRecording: false,
      currentState: 0,
      isRetrying: false,
      awaitingCorrection: false
    });
  }

  public startListening() {
    if (this.state.isListening || this.state.isSpeaking || this.state.isRecording) return;
    
    if (!this.state.useWhisper) {
      this.updateState({
        error: 'Whisper is required for voice input. Please set the API key to enable speech recognition.'
      });
      return;
    }

    this.startWhisperRecording();
  }

  private scheduleAutoListen() {
    if (!this.state.isActive || !this.state.useWhisper) return;
    if (this.state.isListening || this.state.isSpeaking || this.state.isRecording) return;
    if (this.autoListenTimeout) {
      window.clearTimeout(this.autoListenTimeout);
    }
    this.autoListenTimeout = window.setTimeout(() => {
      if (!this.state.isActive) return;
      if (this.state.isListening || this.state.isSpeaking || this.state.isRecording) return;
      this.startListening();
    }, 600);
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
        if (this.recognition) {
          this.updateState({
            error: `Whisper failed (${result.error}). Switching to browser speech recognition...`
          });
          this.startBrowserSpeechRecognition();
        } else {
          this.updateState({ 
            error: `Speech recognition failed: ${result.error}. Please try again or use text input.`
          });
        }
      }
    } catch (error) {
      console.error('Whisper recording error:', error);
      const message = error instanceof Error ? error.message : 'Failed to record audio. Please try again or use text input.';
      if (this.recognition) {
        this.updateState({
          isRecording: false,
          error: `${message} Switching to browser speech recognition...`
        });
        this.startBrowserSpeechRecognition();
      } else {
        this.updateState({ 
          isRecording: false,
          error: message
        });
      }
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
      
      // Configure recognition settings
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.maxAlternatives = 1;
      
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
    console.log('Updating field:', field, 'with value:', value);
    this.updateState({
      formData: { ...this.state.formData, [field]: value }
    });
    
    // Auto-advance to next state after manual field update
    const currentState = STATES[this.state.currentState];
    const expectedField = STATE_TO_FIELD[currentState];
    
    if (expectedField === field && value.trim()) {
      console.log('Field matches current state, advancing...');
      setTimeout(() => {
        this.moveToNextState();
      }, 100);
    }
  }

  public getState(): VoiceState {
    return { ...this.state };
  }

  public getCurrentStep(): string {
    return STATES[this.state.currentState];
  }

  public getCurrentQuestion(): string {
    const currentState = STATES[this.state.currentState];
    if (currentState === 'CONFIRM' && this.state.awaitingCorrection) {
      return this.getCorrectionQuestion();
    }
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

  public manualAdvanceState() {
    console.log('Manually advancing state from:', this.state.currentState);
    this.moveToNextState();
  }

  public processManualInput(input: string) {
    console.log('Processing manual input:', input, 'for state:', STATES[this.state.currentState]);
    this.handleSpeechResult(input);
  }

  private getCorrectionQuestion(): string {
    const question = CORRECTION_QUESTIONS[this.state.language as keyof typeof CORRECTION_QUESTIONS];
    return question || CORRECTION_QUESTIONS.english;
  }

  private detectCorrectionField(transcript: string): State | null {
    const normalized = transcript.toLowerCase();
    const fieldOrder: Array<[Exclude<keyof FormData, 'language'>, State]> = [
      ['name', 'ASK_NAME'],
      ['product', 'ASK_PRODUCT'],
      ['quantity', 'ASK_QUANTITY'],
      ['quality', 'ASK_QUALITY'],
      ['location', 'ASK_LOCATION']
    ];

    for (const [field, state] of fieldOrder) {
      const keywords = CORRECTION_KEYWORDS[field];
      if (keywords.some(keyword => normalized.includes(keyword.toLowerCase()))) {
        return state;
      }
    }

    return null;
  }
}

// Export singleton instance
export const guidedVoiceService = new GuidedVoiceService();