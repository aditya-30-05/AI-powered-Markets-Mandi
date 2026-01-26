/**
 * Voice-Assisted Form Filling Service
 * 
 * Provides guided, step-by-step voice interaction for form filling
 * in multiple Indian languages using open-source speech recognition
 * and text-to-speech capabilities.
 */

import { indicTTSService } from './indicTTSService';
import { getAllLanguages, detectLanguage } from '@/utils/languageUtils';

// Extend Window interface for speech APIs
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

export interface VoiceFormData {
  name: string;
  product: string;
  quantity: string;
  quality: string;
  location: string;
  language: string;
}

export interface VoiceStep {
  id: keyof VoiceFormData | 'greeting' | 'language' | 'confirmation';
  question: Record<string, string>; // language code -> question text
  field?: keyof VoiceFormData;
  optional?: boolean;
  completed?: boolean;
}

export interface VoiceAssistantState {
  isActive: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  currentStep: number;
  selectedLanguage: string;
  formData: Partial<VoiceFormData>;
  transcript: string;
  error: string | null;
  steps: VoiceStep[];
}

export class VoiceAssistantService {
  private recognition: SpeechRecognition | null = null;
  private synthesis: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private onStateChange: ((state: VoiceAssistantState) => void) | null = null;
  
  private state: VoiceAssistantState = {
    isActive: false,
    isListening: false,
    isSpeaking: false,
    currentStep: 0,
    selectedLanguage: 'hindi',
    formData: {},
    transcript: '',
    error: null,
    steps: this.initializeSteps()
  };

  constructor() {
    this.initializeSpeechRecognition();
    this.initializeSpeechSynthesis();
  }

  private initializeSteps(): VoiceStep[] {
    return [
      {
        id: 'greeting',
        question: {
          'hindi': 'नमस्ते! मैं आपकी मंडी की जानकारी भरने में मदद करूंगा। आप किस भाषा में बात करना चाहते हैं?',
          'english': 'Hello! I will help you fill your mandi information. Which language would you like to speak in?',
          'bengali': 'নমস্কার! আমি আপনার মান্ডির তথ্য পূরণ করতে সাহায্য করব। আপনি কোন ভাষায় কথা বলতে চান?',
          'tamil': 'வணக்கம்! உங்கள் மண்டி தகவலை நிரப்ப உதவுவேன். எந்த மொழியில் பேச விரும்புகிறீர்கள்?',
          'telugu': 'నమస్కారం! మీ మండి సమాచారం నింపడంలో సహాయం చేస్తాను. మీరు ఏ భాషలో మాట్లాడాలని అనుకుంటున్నారు?',
          'marathi': 'नमस्कार! मी तुमची मंडी माहिती भरण्यात मदत करेन. तुम्ही कोणत्या भाषेत बोलू इच्छिता?',
          'gujarati': 'નમસ્તે! હું તમારી મંડીની માહિતી ભરવામાં મદદ કરીશ. તમે કઈ ભાષામાં વાત કરવા માંગો છો?',
          'kannada': 'ನಮಸ್ಕಾರ! ನಿಮ್ಮ ಮಂಡಿ ಮಾಹಿತಿಯನ್ನು ಭರ್ತಿ ಮಾಡಲು ಸಹಾಯ ಮಾಡುತ್ತೇನೆ. ನೀವು ಯಾವ ಭಾಷೆಯಲ್ಲಿ ಮಾತನಾಡಲು ಬಯಸುತ್ತೀರಿ?',
          'malayalam': 'നമസ്കാരം! നിങ്ങളുടെ മണ്ഡി വിവരങ്ങൾ പൂരിപ്പിക്കാൻ സഹായിക്കും. ഏത് ഭാഷയിൽ സംസാരിക്കാൻ ആഗ്രഹിക്കുന്നു?',
          'punjabi': 'ਸਤ ਸ੍ਰੀ ਅਕਾਲ! ਮੈਂ ਤੁਹਾਡੀ ਮੰਡੀ ਦੀ ਜਾਣਕਾਰੀ ਭਰਨ ਵਿੱਚ ਮਦਦ ਕਰਾਂਗਾ। ਤੁਸੀਂ ਕਿਸ ਭਾਸ਼ਾ ਵਿੱਚ ਗੱਲ ਕਰਨਾ ਚਾਹੁੰਦੇ ਹੋ?',
          'odia': 'ନମସ୍କାର! ମୁଁ ଆପଣଙ୍କ ମଣ୍ଡି ସୂଚନା ପୂରଣ କରିବାରେ ସାହାଯ୍ୟ କରିବି। ଆପଣ କେଉଁ ଭାଷାରେ କଥା କହିବାକୁ ଚାହାଁନ୍ତି?',
          'assamese': 'নমস্কাৰ! মই আপোনাৰ মণ্ডীৰ তথ্য পূৰণ কৰাত সহায় কৰিম। আপুনি কোন ভাষাত কথা কব বিচাৰে?'
        }
      },
      {
        id: 'language',
        question: {
          'hindi': 'कृपया अपनी भाषा बताएं - हिंदी, अंग्रेजी, बंगाली, तमिल, या कोई और?',
          'english': 'Please tell me your language - Hindi, English, Bengali, Tamil, or any other?',
          'bengali': 'দয়া করে আপনার ভাষা বলুন - হিন্দি, ইংরেজি, বাংলা, তামিল, বা অন্য কোনো?',
          'tamil': 'தயவுசெய்து உங்கள் மொழியைச் சொல்லுங்கள் - இந்தி, ஆங்கிலம், வங்காளம், தமிழ், அல்லது வேறு ஏதேனும்?',
          'telugu': 'దయచేసి మీ భాష చెప్పండి - హిందీ, ఇంగ్లీష్, బెంగాలీ, తమిళం, లేదా మరేదైనా?',
          'marathi': 'कृपया तुमची भाषा सांगा - हिंदी, इंग्रजी, बंगाली, तमिळ, किंवा इतर कोणती?',
          'gujarati': 'કૃપા કરીને તમારી ભાષા કહો - હિન્દી, અંગ્રેજી, બંગાળી, તમિલ, અથવા અન્ય કોઈ?',
          'kannada': 'ದಯವಿಟ್ಟು ನಿಮ್ಮ ಭಾಷೆಯನ್ನು ಹೇಳಿ - ಹಿಂದಿ, ಇಂಗ್ಲಿಷ್, ಬೆಂಗಾಲಿ, ತಮಿಳು, ಅಥವಾ ಬೇರೆ ಯಾವುದಾದರೂ?',
          'malayalam': 'ദയവായി നിങ്ങളുടെ ഭാഷ പറയുക - ഹിന്ദി, ഇംഗ്ലീഷ്, ബംഗാളി, തമിഴ്, അല്ലെങ്കിൽ മറ്റേതെങ്കിലും?',
          'punjabi': 'ਕਿਰਪਾ ਕਰਕੇ ਆਪਣੀ ਭਾਸ਼ਾ ਦੱਸੋ - ਹਿੰਦੀ, ਅੰਗਰੇਜ਼ੀ, ਬੰਗਾਲੀ, ਤਮਿਲ, ਜਾਂ ਕੋਈ ਹੋਰ?',
          'odia': 'ଦୟାକରି ଆପଣଙ୍କ ଭାଷା କୁହନ୍ତୁ - ହିନ୍ଦୀ, ଇଂରାଜୀ, ବଙ୍ଗାଳୀ, ତାମିଲ, କିମ୍ବା ଅନ୍ୟ କିଛି?',
          'assamese': 'দয়া কৰি আপোনাৰ ভাষা কওক - হিন্দী, ইংৰাজী, বাঙালী, তামিল, বা আন কোনো?'
        }
      },
      {
        id: 'name',
        field: 'name',
        question: {
          'hindi': 'आपका नाम क्या है?',
          'english': 'What is your name?',
          'bengali': 'আপনার নাম কি?',
          'tamil': 'உங்கள் பெயர் என்ன?',
          'telugu': 'మీ పేరు ఏమిటి?',
          'marathi': 'तुमचे नाव काय आहे?',
          'gujarati': 'તમારું નામ શું છે?',
          'kannada': 'ನಿಮ್ಮ ಹೆಸರು ಏನು?',
          'malayalam': 'നിങ്ങളുടെ പേര് എന്താണ്?',
          'punjabi': 'ਤੁਹਾਡਾ ਨਾਮ ਕੀ ਹੈ?',
          'odia': 'ଆପଣଙ୍କ ନାମ କଣ?',
          'assamese': 'আপোনাৰ নাম কি?'
        }
      },
      {
        id: 'product',
        field: 'product',
        question: {
          'hindi': 'आप कौन सा उत्पाद बेच रहे हैं?',
          'english': 'What product are you selling?',
          'bengali': 'আপনি কোন পণ্য বিক্রি করছেন?',
          'tamil': 'நீங்கள் என்ன பொருள் விற்கிறீர்கள்?',
          'telugu': 'మీరు ఏ ఉత్పత్తిని అమ్ముతున్నారు?',
          'marathi': 'तुम्ही कोणते उत्पादन विकत आहात?',
          'gujarati': 'તમે કયું ઉત્પાદન વેચો છો?',
          'kannada': 'ನೀವು ಯಾವ ಉತ್ಪನ್ನವನ್ನು ಮಾರುತ್ತಿದ್ದೀರಿ?',
          'malayalam': 'നിങ്ങൾ എന്ത് ഉൽപ്പന്നമാണ് വിൽക്കുന്നത്?',
          'punjabi': 'ਤੁਸੀਂ ਕਿਹੜਾ ਉਤਪਾਦ ਵੇਚ ਰਹੇ ਹੋ?',
          'odia': 'ଆପଣ କେଉଁ ଉତ୍ପାଦ ବିକ୍ରି କରୁଛନ୍ତି?',
          'assamese': 'আপুনি কি সামগ্ৰী বিক্ৰী কৰিছে?'
        }
      },
      {
        id: 'quantity',
        field: 'quantity',
        question: {
          'hindi': 'कितनी मात्रा में बेच रहे हैं? जैसे 50 किलो या 100 किलो?',
          'english': 'What quantity are you selling? Like 50 kg or 100 kg?',
          'bengali': 'কত পরিমাণে বিক্রি করছেন? যেমন ৫০ কেজি বা ১০০ কেজি?',
          'tamil': 'எவ்வளவு அளவில் விற்கிறீர்கள்? 50 கிலோ அல்லது 100 கிலோ போன்று?',
          'telugu': 'ఎంత పరిమాణంలో అమ్ముతున్నారు? 50 కిలోలు లేదా 100 కిలోలు వంటివి?',
          'marathi': 'किती प्रमाणात विकत आहात? जसे 50 किलो किंवा 100 किलो?',
          'gujarati': 'કેટલી માત્રામાં વેચો છો? જેમ કે 50 કિલો કે 100 કિલો?',
          'kannada': 'ಎಷ್ಟು ಪ್ರಮಾಣದಲ್ಲಿ ಮಾರುತ್ತಿದ್ದೀರಿ? 50 ಕಿಲೋ ಅಥವಾ 100 ಕಿಲೋ ಹಾಗೆ?',
          'malayalam': 'എത്ര അളവിൽ വിൽക്കുന്നു? 50 കിലോ അല്ലെങ്കിൽ 100 കിലോ പോലെ?',
          'punjabi': 'ਕਿੰਨੀ ਮਾਤਰਾ ਵਿੱਚ ਵੇਚ ਰਹੇ ਹੋ? ਜਿਵੇਂ 50 ਕਿਲੋ ਜਾਂ 100 ਕਿਲੋ?',
          'odia': 'କେତେ ପରିମାଣରେ ବିକ୍ରି କରୁଛନ୍ତି? ଯେପରି 50 କିଲୋ କିମ୍ବା 100 କିଲୋ?',
          'assamese': 'কিমান পৰিমাণত বিক্ৰী কৰিছে? যেনে 50 কিলো বা 100 কিলো?'
        }
      },
      {
        id: 'quality',
        field: 'quality',
        optional: true,
        question: {
          'hindi': 'गुणवत्ता कैसी है? जैसे अच्छी, बहुत अच्छी, या साधारण?',
          'english': 'What is the quality? Like good, very good, or average?',
          'bengali': 'গুণমান কেমন? যেমন ভাল, খুব ভাল, বা সাধারণ?',
          'tamil': 'தரம் எப்படி? நல்லது, மிக நல்லது, அல்லது சராசரி?',
          'telugu': 'నాణ్యత ఎలా ఉంది? మంచిది, చాలా మంచిది, లేదా సాధారణం?',
          'marathi': 'गुणवत्ता कशी आहे? जसे चांगली, खूप चांगली, किंवा सामान्य?',
          'gujarati': 'ગુણવત્તા કેવી છે? જેમ કે સારી, ખૂબ સારી, કે સામાન્ય?',
          'kannada': 'ಗುಣಮಟ್ಟ ಹೇಗಿದೆ? ಒಳ್ಳೆಯದು, ತುಂಬಾ ಒಳ್ಳೆಯದು, ಅಥವಾ ಸಾಮಾನ್ಯ?',
          'malayalam': 'ഗുണനിലവാരം എങ്ങനെയാണ്? നല്ലത്, വളരെ നല്ലത്, അല്ലെങ്കിൽ ശരാശരി?',
          'punjabi': 'ਗੁਣਵੱਤਾ ਕਿਵੇਂ ਹੈ? ਜਿਵੇਂ ਚੰਗੀ, ਬਹੁਤ ਚੰਗੀ, ਜਾਂ ਸਾਧਾਰਨ?',
          'odia': 'ଗୁଣବତ୍ତା କେମିତି? ଯେପରି ଭଲ, ବହୁତ ଭଲ, କିମ୍ବା ସାଧାରଣ?',
          'assamese': 'গুণগত মান কেনেকুৱা? যেনে ভাল, বহুত ভাল, বা সাধাৰণ?'
        }
      },
      {
        id: 'location',
        field: 'location',
        question: {
          'hindi': 'आप कहाँ से हैं? कौन सी मंडी या शहर?',
          'english': 'Where are you from? Which mandi or city?',
          'bengali': 'আপনি কোথা থেকে? কোন মণ্ডি বা শহর?',
          'tamil': 'நீங்கள் எங்கிருந்து வருகிறீர்கள்? எந்த மண்டி அல்லது நகரம்?',
          'telugu': 'మీరు ఎక్కడ నుండి? ఏ మండి లేదా నగరం?',
          'marathi': 'तुम्ही कुठून आहात? कोणती मंडी किंवा शहर?',
          'gujarati': 'તમે ક્યાંથી છો? કઈ મંડી કે શહેર?',
          'kannada': 'ನೀವು ಎಲ್ಲಿಂದ ಬಂದಿದ್ದೀರಿ? ಯಾವ ಮಂಡಿ ಅಥವಾ ನಗರ?',
          'malayalam': 'നിങ്ങൾ എവിടെ നിന്നാണ്? ഏത് മണ്ഡി അല്ലെങ്കിൽ നഗരം?',
          'punjabi': 'ਤੁਸੀਂ ਕਿੱਥੋਂ ਹੋ? ਕਿਹੜੀ ਮੰਡੀ ਜਾਂ ਸ਼ਹਿਰ?',
          'odia': 'ଆପଣ କେଉଁଠାରୁ? କେଉଁ ମଣ୍ଡି କିମ୍ବା ସହର?',
          'assamese': 'আপুনি কত পৰা? কোন মণ্ডী বা চহৰ?'
        }
      },
      {
        id: 'confirmation',
        question: {
          'hindi': 'मैं आपकी जानकारी दोहराता हूँ। क्या यह सही है?',
          'english': 'Let me repeat your information. Is this correct?',
          'bengali': 'আমি আপনার তথ্য পুনরাবৃত্তি করছি। এটা কি সঠিক?',
          'tamil': 'உங்கள் தகவலை மீண்டும் சொல்கிறேன். இது சரியா?',
          'telugu': 'మీ సమాచారాన్ని మళ్లీ చెప్తున్నాను. ఇది సరైనదా?',
          'marathi': 'मी तुमची माहिती पुन्हा सांगतो. हे बरोबर आहे का?',
          'gujarati': 'હું તમારી માહિતી ફરીથી કહું છું. આ સાચું છે?',
          'kannada': 'ನಿಮ್ಮ ಮಾಹಿತಿಯನ್ನು ಮತ್ತೆ ಹೇಳುತ್ತೇನೆ. ಇದು ಸರಿಯೇ?',
          'malayalam': 'നിങ്ങളുടെ വിവരങ്ങൾ വീണ്ടും പറയുന്നു. ഇത് ശരിയാണോ?',
          'punjabi': 'ਮੈਂ ਤੁਹਾਡੀ ਜਾਣਕਾਰੀ ਦੁਹਰਾਉਂਦਾ ਹਾਂ। ਕੀ ਇਹ ਸਹੀ ਹੈ?',
          'odia': 'ମୁଁ ଆପଣଙ୍କ ସୂଚନା ପୁନରାବୃତ୍ତି କରୁଛି। ଏହା ଠିକ୍ ଅଛି କି?',
          'assamese': 'মই আপোনাৰ তথ্য পুনৰাবৃত্তি কৰিছো। এইটো শুদ্ধ নেকি?'
        }
      }
    ];
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
    this.recognition.interimResults = false;
    this.recognition.maxAlternatives = 1;

    this.recognition.onstart = () => {
      this.updateState({ isListening: true, error: null });
    };

    this.recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      this.handleSpeechResult(transcript);
    };

    this.recognition.onerror = (event) => {
      this.updateState({ 
        isListening: false, 
        error: `Speech recognition error: ${event.error}` 
      });
    };

    this.recognition.onend = () => {
      this.updateState({ isListening: false });
    };
  }

  private initializeSpeechSynthesis() {
    if (typeof window === 'undefined') return;
    
    if ('speechSynthesis' in window) {
      this.synthesis = window.speechSynthesis;
    }
  }

  private updateState(updates: Partial<VoiceAssistantState>) {
    this.state = { ...this.state, ...updates };
    if (this.onStateChange) {
      this.onStateChange(this.state);
    }
  }

  private async handleSpeechResult(transcript: string) {
    this.updateState({ transcript });
    
    const currentStep = this.state.steps[this.state.currentStep];
    
    if (currentStep.id === 'language') {
      // Handle language selection
      const detectedLang = this.detectLanguageFromSpeech(transcript);
      if (detectedLang) {
        this.updateState({ selectedLanguage: detectedLang });
        await this.moveToNextStep();
      } else {
        await this.repeatCurrentQuestion();
      }
    } else if (currentStep.field) {
      // Handle form field input
      const processedValue = this.processFieldValue(currentStep.field, transcript);
      const newFormData = { ...this.state.formData, [currentStep.field]: processedValue };
      this.updateState({ formData: newFormData });
      
      // Mark step as completed and move to next
      currentStep.completed = true;
      await this.moveToNextStep();
    } else if (currentStep.id === 'confirmation') {
      // Handle confirmation
      const isConfirmed = this.isConfirmationPositive(transcript);
      if (isConfirmed) {
        this.completeVoiceAssistant();
      } else {
        // Go back to editing
        this.updateState({ currentStep: 2 }); // Start from name field
        await this.speakCurrentQuestion();
      }
    }
  }

  private detectLanguageFromSpeech(transcript: string): string | null {
    const lowerTranscript = transcript.toLowerCase();
    
    // Simple language detection based on keywords
    const languageKeywords = {
      'hindi': ['हिंदी', 'hindi', 'हिन्दी'],
      'english': ['english', 'अंग्रेजी', 'इंग्लिश'],
      'bengali': ['bengali', 'বাংলা', 'bangla', 'बंगाली'],
      'tamil': ['tamil', 'தமிழ்', 'तमिल'],
      'telugu': ['telugu', 'తెలుగు', 'तेलुगु'],
      'marathi': ['marathi', 'मराठी', 'मराठि'],
      'gujarati': ['gujarati', 'ગુજરાતી', 'गुजराती'],
      'kannada': ['kannada', 'ಕನ್ನಡ', 'कन्नड'],
      'malayalam': ['malayalam', 'മലയാളം', 'मलयालम'],
      'punjabi': ['punjabi', 'ਪੰਜਾਬੀ', 'पंजाबी'],
      'odia': ['odia', 'ଓଡ଼ିଆ', 'ओड़िया'],
      'assamese': ['assamese', 'অসমীয়া', 'असमिया']
    };

    for (const [lang, keywords] of Object.entries(languageKeywords)) {
      if (keywords.some(keyword => lowerTranscript.includes(keyword))) {
        return lang;
      }
    }

    // Fallback: try to detect language from the transcript itself
    return detectLanguage(transcript) || null;
  }

  private processFieldValue(field: keyof VoiceFormData, transcript: string): string {
    // Clean and process the transcript based on field type
    let processed = transcript.trim();
    
    if (field === 'quantity') {
      // Extract quantity with units
      const quantityMatch = processed.match(/(\d+)\s*(किलो|kg|kilo|kilogram|टन|ton|quintal|क्विंटल)/i);
      if (quantityMatch) {
        processed = `${quantityMatch[1]} ${quantityMatch[2].toLowerCase()}`;
      }
    } else if (field === 'quality') {
      // Normalize quality terms - check longer phrases first
      const qualityMap: Array<[string, string]> = [
        ['बहुत अच्छा', 'Very Good'],
        ['बहुत अच्छी', 'Very Good'],
        ['very good', 'Very Good'],
        ['अच्छा', 'Good'],
        ['अच्छी', 'Good'], 
        ['साधारण', 'Average'],
        ['good', 'Good'],
        ['excellent', 'Excellent'],
        ['average', 'Average'],
        ['fair', 'Fair']
      ];
      
      const lowerProcessed = processed.toLowerCase();
      for (const [key, value] of qualityMap) {
        if (lowerProcessed.includes(key.toLowerCase())) {
          processed = value;
          break;
        }
      }
    }
    
    return processed;
  }

  private isConfirmationPositive(transcript: string): boolean {
    const positiveWords = [
      'yes', 'हाँ', 'हां', 'जी', 'सही', 'ठीक', 'correct', 'right',
      'হ্যাঁ', 'ঠিক', 'சரி', 'అవును', 'होय', 'હા', 'ಹೌದು', 
      'അതെ', 'ਹਾਂ', 'ହଁ', 'হয়'
    ];
    
    const lowerTranscript = transcript.toLowerCase();
    return positiveWords.some(word => lowerTranscript.includes(word));
  }

  private async moveToNextStep() {
    if (this.state.currentStep < this.state.steps.length - 1) {
      this.updateState({ currentStep: this.state.currentStep + 1 });
      await this.speakCurrentQuestion();
    }
  }

  private async speakCurrentQuestion() {
    const currentStep = this.state.steps[this.state.currentStep];
    const question = currentStep.question[this.state.selectedLanguage] || 
                    currentStep.question['english'];
    
    await this.speak(question);
  }

  private async repeatCurrentQuestion() {
    const repeatPhrases = {
      'hindi': 'मुझे समझ नहीं आया। कृपया फिर से बताएं।',
      'english': 'I did not understand. Please tell me again.',
      'bengali': 'আমি বুঝতে পারিনি। দয়া করে আবার বলুন।',
      'tamil': 'எனக்கு புரியவில்லை. தயவுசெய்து மீண்டும் சொல்லுங்கள்.',
      'telugu': 'నాకు అర్థం కాలేదు. దయచేసి మళ్లీ చెప్పండి।',
      'marathi': 'मला समजले नाही. कृपया पुन्हा सांगा.',
      'gujarati': 'મને સમજાયું નહીં. કૃપા કરીને ફરીથી કહો.',
      'kannada': 'ನನಗೆ ಅರ್ಥವಾಗಲಿಲ್ಲ. ದಯವಿಟ್ಟು ಮತ್ತೆ ಹೇಳಿ.',
      'malayalam': 'എനിക്ക് മനസ്സിലായില്ല. ദയവായി വീണ്ടും പറയുക.',
      'punjabi': 'ਮੈਨੂੰ ਸਮਝ ਨਹੀਂ ਆਇਆ। ਕਿਰਪਾ ਕਰਕੇ ਫਿਰ ਦੱਸੋ।',
      'odia': 'ମୁଁ ବୁଝିପାରିଲି ନାହିଁ। ଦୟାକରି ପୁଣି କୁହନ୍ତୁ।',
      'assamese': 'মই বুজি নাপালো। দয়া কৰি আকৌ কওক।'
    };
    
    const repeatPhrase = repeatPhrases[this.state.selectedLanguage as keyof typeof repeatPhrases] || 
                        repeatPhrases['english'];
    
    await this.speak(repeatPhrase);
    setTimeout(() => this.speakCurrentQuestion(), 1000);
  }

  private async speak(text: string): Promise<void> {
    if (!this.synthesis) return;
    
    // Stop any current speech
    this.synthesis.cancel();
    
    this.updateState({ isSpeaking: true });
    
    try {
      // Try using Indic TTS for better quality
      const ttsResponse = await indicTTSService.generateSpeech({
        text,
        language: this.state.selectedLanguage,
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
    return new Promise((resolve) => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = this.getBrowserLanguageCode(this.state.selectedLanguage);
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
      
      this.currentUtterance = utterance;
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
      'marathi': 'mr-IN',
      'gujarati': 'gu-IN',
      'kannada': 'kn-IN',
      'malayalam': 'ml-IN',
      'punjabi': 'pa-IN',
      'odia': 'or-IN',
      'assamese': 'as-IN'
    };
    
    return browserCodes[langCode] || 'hi-IN';
  }

  private completeVoiceAssistant() {
    this.updateState({ 
      isActive: false,
      currentStep: 0
    });
    
    // Trigger completion callback if set
    if (this.onComplete) {
      this.onComplete(this.state.formData as VoiceFormData);
    }
  }

  // Public API
  public onComplete: ((data: VoiceFormData) => void) | null = null;

  public async start(initialLanguage: string = 'hindi', location?: string) {
    if (!this.recognition) {
      this.updateState({ error: 'Speech recognition not supported in this browser' });
      return;
    }

    // Pre-fill location if available
    if (location) {
      this.updateState({ 
        formData: { ...this.state.formData, location }
      });
    }

    this.updateState({ 
      isActive: true,
      selectedLanguage: initialLanguage,
      currentStep: 0,
      formData: this.state.formData,
      error: null
    });

    // Start with greeting
    await this.speakCurrentQuestion();
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
      currentStep: 0
    });
  }

  public startListening() {
    if (!this.recognition || this.state.isListening) return;
    
    // Set language for recognition
    this.recognition.lang = this.getBrowserLanguageCode(this.state.selectedLanguage);
    this.recognition.start();
  }

  public stopListening() {
    if (this.recognition && this.state.isListening) {
      this.recognition.stop();
    }
  }

  public skipToNextStep() {
    if (this.state.currentStep < this.state.steps.length - 1) {
      this.moveToNextStep();
    }
  }

  public goToPreviousStep() {
    if (this.state.currentStep > 0) {
      this.updateState({ currentStep: this.state.currentStep - 1 });
      this.speakCurrentQuestion();
    }
  }

  public updateFormField(field: keyof VoiceFormData, value: string) {
    const newFormData = { ...this.state.formData, [field]: value };
    this.updateState({ formData: newFormData });
  }

  public getState(): VoiceAssistantState {
    return { ...this.state };
  }

  public setOnStateChange(callback: (state: VoiceAssistantState) => void) {
    this.onStateChange = callback;
  }

  public getCurrentStepInfo() {
    const currentStep = this.state.steps[this.state.currentStep];
    return {
      step: currentStep,
      stepNumber: this.state.currentStep + 1,
      totalSteps: this.state.steps.length,
      question: currentStep.question[this.state.selectedLanguage] || currentStep.question['english']
    };
  }
}

// Export singleton instance
export const voiceAssistantService = new VoiceAssistantService();